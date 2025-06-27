from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import json
import os
import logging
from pywebpush import webpush, WebPushException
from models import User, UserRole, Base
from auth import get_current_active_user, get_db
from database import engine

router = APIRouter()
logger = logging.getLogger(__name__)

# Push Subscription Model
class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(String(500), nullable=False)
    p256dh_key = Column(String(200), nullable=False)
    auth_key = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

# Push Notification Model
class PushNotification(Base):
    __tablename__ = "push_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null = Broadcast
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    icon = Column(String(200), nullable=True)
    badge = Column(String(200), nullable=True)
    data = Column(Text, nullable=True)  # JSON data
    sent_at = Column(DateTime, default=datetime.now)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)

# Tabellen erstellen
Base.metadata.create_all(bind=engine)

# Pydantic Models
class PushSubscriptionRequest(BaseModel):
    subscription: Dict[str, Any]

class PushNotificationRequest(BaseModel):
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    user_ids: Optional[List[int]] = None  # Wenn leer = Broadcast

class PushSubscriptionResponse(BaseModel):
    id: int
    user_id: int
    endpoint: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class PushNotificationResponse(BaseModel):
    id: int
    title: str
    body: str
    sent_at: datetime
    success_count: int
    failure_count: int
    
    class Config:
        from_attributes = True

# VAPID Configuration
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CONTACT = os.getenv("VAPID_CONTACT", "mailto:admin@kita-dienstplan.de")

@router.post("/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_to_push(
    request: PushSubscriptionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Benutzer für Push-Benachrichtigungen registrieren
    """
    try:
        subscription = request.subscription
        
        # Subscription-Daten extrahieren
        endpoint = subscription.get("endpoint")
        keys = subscription.get("keys", {})
        p256dh = keys.get("p256dh")
        auth = keys.get("auth")
        
        if not all([endpoint, p256dh, auth]):
            raise HTTPException(
                status_code=400,
                detail="Unvollständige Subscription-Daten"
            )
        
        # Prüfen ob bereits existiert
        existing = db.query(PushSubscription).filter(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == endpoint
        ).first()
        
        if existing:
            # Aktualisieren falls vorhanden
            existing.p256dh_key = p256dh
            existing.auth_key = auth
            existing.is_active = True
            existing.updated_at = datetime.now()
            db.commit()
            db.refresh(existing)
            return existing
        
        # Neue Subscription erstellen
        db_subscription = PushSubscription(
            user_id=current_user.id,
            endpoint=endpoint,
            p256dh_key=p256dh,
            auth_key=auth
        )
        
        db.add(db_subscription)
        db.commit()
        db.refresh(db_subscription)
        
        logger.info(f"Push subscription created for user {current_user.id}")
        return db_subscription
        
    except Exception as e:
        logger.error(f"Failed to create push subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Subscription fehlgeschlagen")

@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Push-Benachrichtigungen abbestellen
    """
    subscription = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.endpoint == endpoint
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription nicht gefunden")
    
    subscription.is_active = False
    db.commit()
    
    return {"message": "Push-Benachrichtigungen deaktiviert"}

@router.post("/send", response_model=PushNotificationResponse)
async def send_push_notification(
    notification: PushNotificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Push-Benachrichtigung senden
    """
    # Nur Leitung und Admin können Push-Benachrichtigungen senden
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=500,
            detail="VAPID-Keys nicht konfiguriert"
        )
    
    # Notification in DB speichern
    db_notification = PushNotification(
        user_id=notification.user_ids[0] if notification.user_ids and len(notification.user_ids) == 1 else None,
        title=notification.title,
        body=notification.body,
        icon=notification.icon,
        badge=notification.badge,
        data=json.dumps(notification.data) if notification.data else None
    )
    
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    
    # Ziel-Subscriptions ermitteln
    query = db.query(PushSubscription).filter(PushSubscription.is_active == True)
    
    if notification.user_ids:
        query = query.filter(PushSubscription.user_id.in_(notification.user_ids))
    
    subscriptions = query.all()
    
    if not subscriptions:
        raise HTTPException(status_code=404, detail="Keine aktiven Subscriptions gefunden")
    
    # Push-Benachrichtigungen senden
    success_count = 0
    failure_count = 0
    
    payload = {
        "title": notification.title,
        "body": notification.body,
        "icon": notification.icon or "/icons/icon-192x192.png",
        "badge": notification.badge or "/icons/badge-72x72.png",
        "data": notification.data or {}
    }
    
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh_key,
                        "auth": subscription.auth_key
                    }
                },
                data=json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": VAPID_CONTACT,
                }
            )
            success_count += 1
            logger.info(f"Push notification sent to user {subscription.user_id}")
            
        except WebPushException as e:
            failure_count += 1
            logger.error(f"Failed to send push notification to user {subscription.user_id}: {str(e)}")
            
            # Deaktiviere ungültige Subscriptions
            if e.response and e.response.status_code in [404, 410]:
                subscription.is_active = False
    
    # Statistiken aktualisieren
    db_notification.success_count = success_count
    db_notification.failure_count = failure_count
    db.commit()
    db.refresh(db_notification)
    
    logger.info(f"Push notification sent: {success_count} success, {failure_count} failures")
    return db_notification

@router.get("/subscriptions", response_model=List[PushSubscriptionResponse])
async def get_user_subscriptions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Push-Subscriptions des aktuellen Benutzers abrufen
    """
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.is_active == True
    ).all()
    
    return subscriptions

@router.get("/notifications", response_model=List[PushNotificationResponse])
async def get_notifications_history(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verlauf der Push-Benachrichtigungen abrufen
    """
    # Nur Leitung und Admin können den Verlauf sehen
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    notifications = db.query(PushNotification).order_by(
        PushNotification.sent_at.desc()
    ).limit(limit).all()
    
    return notifications

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    VAPID Public Key für Client-Subscription abrufen
    """
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID Public Key nicht konfiguriert")
    
    return {"publicKey": VAPID_PUBLIC_KEY}

# Convenience Functions für andere Module
async def send_monthly_lock_push_notification(
    db: Session,
    user_id: int,
    month: int,
    year: int
) -> bool:
    """
    Push-Benachrichtigung für Monatsabschluss senden
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return False
    
    try:
        month_names = [
            "Januar", "Februar", "März", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember"
        ]
        month_name = month_names[month - 1] if 1 <= month <= 12 else str(month)
        
        # Aktive Subscriptions für Benutzer finden
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active == True
        ).all()
        
        if not subscriptions:
            return False
        
        payload = {
            "title": f"Monatsabschluss {month_name} {year}",
            "body": "Ihr Monat wurde abgeschlossen und gesperrt.",
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/badge-72x72.png",
            "data": {
                "type": "monthly_lock",
                "month": month,
                "year": year,
                "url": "/time-entries"
            }
        }
        
        success = False
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {
                            "p256dh": subscription.p256dh_key,
                            "auth": subscription.auth_key
                        }
                    },
                    data=json.dumps(payload),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={
                        "sub": VAPID_CONTACT,
                    }
                )
                success = True
                logger.info(f"Monthly lock push notification sent to user {user_id}")
                
            except WebPushException as e:
                logger.error(f"Failed to send monthly lock push notification: {str(e)}")
                
                # Deaktiviere ungültige Subscriptions
                if e.response and e.response.status_code in [404, 410]:
                    subscription.is_active = False
                    db.commit()
        
        return success
        
    except Exception as e:
        logger.error(f"Failed to send monthly lock push notification: {str(e)}")
        return False

async def send_reminder_push_notification(
    db: Session,
    user_id: int,
    month: int,
    year: int,
    days_until_deadline: int
) -> bool:
    """
    Push-Benachrichtigung für Erinnerung vor Monatsabschluss senden
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return False
    
    try:
        month_names = [
            "Januar", "Februar", "März", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember"
        ]
        month_name = month_names[month - 1] if 1 <= month <= 12 else str(month)
        
        # Aktive Subscriptions für Benutzer finden
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active == True
        ).all()
        
        if not subscriptions:
            return False
        
        payload = {
            "title": "Erinnerung: Monatsabschluss steht bevor",
            "body": f"Noch {days_until_deadline} Tag(e) bis zum Abschluss von {month_name} {year}",
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/badge-72x72.png",
            "data": {
                "type": "monthly_reminder",
                "month": month,
                "year": year,
                "days_until_deadline": days_until_deadline,
                "url": "/time-entries"
            }
        }
        
        success = False
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {
                            "p256dh": subscription.p256dh_key,
                            "auth": subscription.auth_key
                        }
                    },
                    data=json.dumps(payload),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={
                        "sub": VAPID_CONTACT,
                    }
                )
                success = True
                logger.info(f"Monthly reminder push notification sent to user {user_id}")
                
            except WebPushException as e:
                logger.error(f"Failed to send monthly reminder push notification: {str(e)}")
                
                # Deaktiviere ungültige Subscriptions
                if e.response and e.response.status_code in [404, 410]:
                    subscription.is_active = False
                    db.commit()
        
        return success
        
    except Exception as e:
        logger.error(f"Failed to send monthly reminder push notification: {str(e)}")
        return False