from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel
import logging
from models import User, UserRole, MonthlyLock, TimeEntry
from auth import get_current_active_user, get_db
from email_service import email_service
from routers.push_notifications import send_monthly_lock_push_notification, send_reminder_push_notification

router = APIRouter()
logger = logging.getLogger(__name__)

class MonthlyLockBase(BaseModel):
    user_id: int
    year: int
    month: int

class MonthlyLockCreate(MonthlyLockBase):
    pass

class MonthlyLockResponse(MonthlyLockBase):
    id: int
    locked_at: datetime
    locked_by: int
    
    class Config:
        from_attributes = True

class MonthlyLockStatus(BaseModel):
    user_id: int
    user_name: str
    year: int
    month: int
    is_locked: bool
    locked_at: Optional[datetime] = None
    locked_by: Optional[int] = None
    locked_by_name: Optional[str] = None
    entry_count: int

class BulkLockRequest(BaseModel):
    year: int
    month: int
    user_ids: Optional[List[int]] = None  # Wenn leer, alle aktiven Benutzer

@router.get("/", response_model=List[MonthlyLockResponse])
async def get_monthly_locks(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Abrufen der Monatsabschlüsse
    """
    # Nur Leitung und Admin können alle Abschlüsse sehen
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    query = db.query(MonthlyLock)
    
    if year:
        query = query.filter(MonthlyLock.year == year)
    if month:
        query = query.filter(MonthlyLock.month == month)
    if user_id:
        query = query.filter(MonthlyLock.user_id == user_id)
    
    return query.order_by(MonthlyLock.year.desc(), MonthlyLock.month.desc()).all()

@router.get("/status", response_model=List[MonthlyLockStatus])
async def get_monthly_lock_status(
    year: int,
    month: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Status aller Benutzer für einen bestimmten Monat
    """
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Alle aktiven Benutzer abrufen
    users = db.query(User).filter(User.is_active == True).all()
    
    status_list = []
    for user in users:
        # Prüfen ob Monat gesperrt ist
        lock = db.query(MonthlyLock).filter(
            and_(
                MonthlyLock.user_id == user.id,
                MonthlyLock.year == year,
                MonthlyLock.month == month
            )
        ).first()
        
        # Anzahl Zeiteinträge für den Monat zählen
        entry_count = db.query(TimeEntry).filter(
            and_(
                TimeEntry.user_id == user.id,
                func.year(TimeEntry.date) == year,
                func.month(TimeEntry.date) == month
            )
        ).count()
        
        # Locked-by User Info
        locked_by_name = None
        if lock:
            locked_by_user = db.query(User).filter(User.id == lock.locked_by).first()
            locked_by_name = locked_by_user.full_name if locked_by_user else "Unbekannt"
        
        status_list.append(MonthlyLockStatus(
            user_id=user.id,
            user_name=user.full_name,
            year=year,
            month=month,
            is_locked=lock is not None,
            locked_at=lock.locked_at if lock else None,
            locked_by=lock.locked_by if lock else None,
            locked_by_name=locked_by_name,
            entry_count=entry_count
        ))
    
    return status_list

@router.post("/", response_model=MonthlyLockResponse)
async def create_monthly_lock(
    lock_data: MonthlyLockCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Monatsabschluss für einen Benutzer erstellen
    """
    # Nur Leitung und Admin können Monate abschließen
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Prüfen ob Benutzer existiert
    user = db.query(User).filter(User.id == lock_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    # Prüfen ob bereits gesperrt
    existing_lock = db.query(MonthlyLock).filter(
        and_(
            MonthlyLock.user_id == lock_data.user_id,
            MonthlyLock.year == lock_data.year,
            MonthlyLock.month == lock_data.month
        )
    ).first()
    
    if existing_lock:
        raise HTTPException(
            status_code=400,
            detail=f"Monat {lock_data.month}/{lock_data.year} für Benutzer {user.full_name} ist bereits gesperrt"
        )
    
    # Validierung Jahr/Monat
    if lock_data.year < 2020 or lock_data.year > 2030:
        raise HTTPException(status_code=400, detail="Ungültiges Jahr")
    if lock_data.month < 1 or lock_data.month > 12:
        raise HTTPException(status_code=400, detail="Ungültiger Monat")
    
    # Monatsabschluss erstellen
    db_lock = MonthlyLock(
        user_id=lock_data.user_id,
        year=lock_data.year,
        month=lock_data.month,
        locked_by=current_user.id
    )
    
    db.add(db_lock)
    
    # Alle Zeiteinträge für diesen Monat sperren
    db.query(TimeEntry).filter(
        and_(
            TimeEntry.user_id == lock_data.user_id,
            func.year(TimeEntry.date) == lock_data.year,
            func.month(TimeEntry.date) == lock_data.month
        )
    ).update({TimeEntry.is_locked: True})
    
    db.commit()
    db.refresh(db_lock)
    
    # E-Mail- und Push-Benachrichtigungen senden
    try:
        # Anzahl Zeiteinträge für Benachrichtigung ermitteln
        entry_count = db.query(TimeEntry).filter(
            and_(
                TimeEntry.user_id == lock_data.user_id,
                func.year(TimeEntry.date) == lock_data.year,
                func.month(TimeEntry.date) == lock_data.month
            )
        ).count()
        
        # E-Mail-Benachrichtigung
        if user.email:
            email_service.send_monthly_lock_notification(
                user_email=user.email,
                user_name=user.full_name,
                year=lock_data.year,
                month=lock_data.month,
                locked_by_name=current_user.full_name,
                entry_count=entry_count
            )
        
        # Push-Benachrichtigung
        await send_monthly_lock_push_notification(
            db=db,
            user_id=lock_data.user_id,
            month=lock_data.month,
            year=lock_data.year
        )
        
    except Exception as e:
        # Benachrichtigungsfehler sollen den Abschluss nicht verhindern
        logger.warning(f"Benachrichtigung fehlgeschlagen: {str(e)}")
    
    return db_lock

@router.post("/bulk", response_model=List[MonthlyLockResponse])
async def bulk_create_monthly_locks(
    bulk_request: BulkLockRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Massenabschluss für mehrere Benutzer
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur Administratoren können Massenabschlüsse durchführen")
    
    # Benutzer bestimmen
    if bulk_request.user_ids:
        users = db.query(User).filter(User.id.in_(bulk_request.user_ids)).all()
    else:
        users = db.query(User).filter(User.is_active == True).all()
    
    created_locks = []
    errors = []
    
    for user in users:
        # Prüfen ob bereits gesperrt
        existing_lock = db.query(MonthlyLock).filter(
            and_(
                MonthlyLock.user_id == user.id,
                MonthlyLock.year == bulk_request.year,
                MonthlyLock.month == bulk_request.month
            )
        ).first()
        
        if existing_lock:
            errors.append(f"Benutzer {user.full_name} bereits gesperrt")
            continue
        
        # Monatsabschluss erstellen
        db_lock = MonthlyLock(
            user_id=user.id,
            year=bulk_request.year,
            month=bulk_request.month,
            locked_by=current_user.id
        )
        
        db.add(db_lock)
        
        # Zeiteinträge sperren
        db.query(TimeEntry).filter(
            and_(
                TimeEntry.user_id == user.id,
                func.year(TimeEntry.date) == bulk_request.year,
                func.month(TimeEntry.date) == bulk_request.month
            )
        ).update({TimeEntry.is_locked: True})
        
        created_locks.append(db_lock)
    
    db.commit()
    
    for lock in created_locks:
        db.refresh(lock)
    
    # E-Mail-Benachrichtigungen für alle erfolgreich gesperrten Benutzer senden
    for lock in created_locks:
        try:
            user = db.query(User).filter(User.id == lock.user_id).first()
            if user and user.email:
                # Anzahl Zeiteinträge ermitteln
                entry_count = db.query(TimeEntry).filter(
                    and_(
                        TimeEntry.user_id == user.id,
                        func.year(TimeEntry.date) == bulk_request.year,
                        func.month(TimeEntry.date) == bulk_request.month
                    )
                ).count()
                
                email_service.send_monthly_lock_notification(
                    user_email=user.email,
                    user_name=user.full_name,
                    year=bulk_request.year,
                    month=bulk_request.month,
                    locked_by_name=current_user.full_name,
                    entry_count=entry_count
                )
                
                # Push-Benachrichtigung
                await send_monthly_lock_push_notification(
                    db=db,
                    user_id=user.id,
                    month=bulk_request.month,
                    year=bulk_request.year
                )
        except Exception as e:
            logger.warning(f"E-Mail-Benachrichtigung für Benutzer {lock.user_id} fehlgeschlagen: {str(e)}")
    
    if errors:
        # Warnung über bereits gesperrte Benutzer
        pass  # Could be logged or returned in response
    
    return created_locks

@router.delete("/{lock_id}")
async def delete_monthly_lock(
    lock_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Monatsabschluss aufheben (Monat freigeben)
    """
    # Nur Leitung und Admin können Abschlüsse aufheben
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    lock = db.query(MonthlyLock).filter(MonthlyLock.id == lock_id).first()
    if not lock:
        raise HTTPException(status_code=404, detail="Monatsabschluss nicht gefunden")
    
    # Zeiteinträge entsperren
    db.query(TimeEntry).filter(
        and_(
            TimeEntry.user_id == lock.user_id,
            func.year(TimeEntry.date) == lock.year,
            func.month(TimeEntry.date) == lock.month
        )
    ).update({TimeEntry.is_locked: False})
    
    # Abschluss löschen
    db.delete(lock)
    db.commit()
    
    return {"message": "Monatsabschluss aufgehoben"}

@router.delete("/bulk")
async def bulk_delete_monthly_locks(
    year: int,
    month: int,
    user_ids: Optional[List[int]] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Massenfreigabe für einen Monat
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur Administratoren können Massenfreigaben durchführen")
    
    query = db.query(MonthlyLock).filter(
        and_(
            MonthlyLock.year == year,
            MonthlyLock.month == month
        )
    )
    
    if user_ids:
        query = query.filter(MonthlyLock.user_id.in_(user_ids))
    
    locks = query.all()
    
    # Alle Zeiteinträge entsperren
    for lock in locks:
        db.query(TimeEntry).filter(
            and_(
                TimeEntry.user_id == lock.user_id,
                func.year(TimeEntry.date) == year,
                func.month(TimeEntry.date) == month
            )
        ).update({TimeEntry.is_locked: False})
        
        db.delete(lock)
    
    db.commit()
    
    return {"message": f"{len(locks)} Monatsabschlüsse aufgehoben"}

@router.post("/send-reminders")
async def send_monthly_lock_reminders(
    year: int,
    month: int,
    days_until_deadline: int = 3,
    user_ids: Optional[List[int]] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Erinnerungs-E-Mails vor Monatsabschluss senden
    """
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Benutzer bestimmen, die noch nicht gesperrt sind
    query = db.query(User).filter(User.is_active == True)
    
    if user_ids:
        query = query.filter(User.id.in_(user_ids))
    
    users = query.all()
    
    sent_count = 0
    errors = []
    
    for user in users:
        # Prüfen ob bereits gesperrt
        existing_lock = db.query(MonthlyLock).filter(
            and_(
                MonthlyLock.user_id == user.id,
                MonthlyLock.year == year,
                MonthlyLock.month == month
            )
        ).first()
        
        if existing_lock:
            continue  # Bereits gesperrt, keine Erinnerung nötig
        
        # E-Mail-Erinnerung senden
        try:
            if user.email:
                success = email_service.send_monthly_lock_reminder(
                    user_email=user.email,
                    user_name=user.full_name,
                    year=year,
                    month=month,
                    days_until_deadline=days_until_deadline
                )
                if success:
                    sent_count += 1
                    
                    # Auch Push-Benachrichtigung senden
                    await send_reminder_push_notification(
                        db=db,
                        user_id=user.id,
                        month=month,
                        year=year,
                        days_until_deadline=days_until_deadline
                    )
                else:
                    errors.append(f"E-Mail an {user.full_name} konnte nicht versendet werden")
            else:
                errors.append(f"Keine E-Mail-Adresse für {user.full_name}")
        except Exception as e:
            errors.append(f"Fehler bei {user.full_name}: {str(e)}")
    
    return {
        "message": f"{sent_count} Erinnerungs-E-Mails versendet",
        "sent_count": sent_count,
        "errors": errors
    }