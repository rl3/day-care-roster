from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from models import User, UserRole, GlobalEvent
from auth import get_current_active_user, get_db

router = APIRouter()

class GlobalEventBase(BaseModel):
    date: date
    event_type: str
    description: Optional[str] = None

class GlobalEventCreate(GlobalEventBase):
    pass

class GlobalEventResponse(GlobalEventBase):
    id: int
    
    class Config:
        from_attributes = True

# Erlaubte Event-Typen
ALLOWED_EVENT_TYPES = [
    "early_closure_staff",      # Früher Betriebsschluss wegen Personalmangel
    "early_closure_event",      # Früher Betriebsschluss wegen Nachmittagsevent
    "closure",                  # Schließtag
    "team_development",         # Teamentwicklungstag
    "staff_meeting",           # Personalversammlung
    "maintenance",             # Wartung/Renovierung
    "holiday",                 # Feiertag
    "other"                    # Sonstiges
]

EVENT_TYPE_LABELS = {
    "early_closure_staff": "Früher Betriebsschluss (Personalmangel)",
    "early_closure_event": "Früher Betriebsschluss (Event)",
    "closure": "Schließtag",
    "team_development": "Teamentwicklung",
    "staff_meeting": "Personalversammlung",
    "maintenance": "Wartung/Renovierung",
    "holiday": "Feiertag",
    "other": "Sonstiges"
}

@router.get("/", response_model=List[GlobalEventResponse])
async def get_global_events(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    event_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Abrufen der globalen Events
    """
    query = db.query(GlobalEvent)
    
    if start_date:
        query = query.filter(GlobalEvent.date >= start_date)
    if end_date:
        query = query.filter(GlobalEvent.date <= end_date)
    if event_type:
        query = query.filter(GlobalEvent.event_type == event_type)
    
    return query.order_by(GlobalEvent.date.desc()).all()

@router.post("/", response_model=GlobalEventResponse)
async def create_global_event(
    event: GlobalEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Erstellen eines neuen globalen Events
    """
    # Nur Leitung und Admin können Events erstellen
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Event-Typ validieren
    if event.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültiger Event-Typ. Erlaubt: {', '.join(ALLOWED_EVENT_TYPES)}"
        )
    
    # Prüfen ob bereits ein Event für dieses Datum existiert
    existing = db.query(GlobalEvent).filter(
        GlobalEvent.date == event.date,
        GlobalEvent.event_type == event.event_type
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Event vom Typ '{event.event_type}' für {event.date} existiert bereits"
        )
    
    db_event = GlobalEvent(
        date=event.date,
        event_type=event.event_type,
        description=event.description
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.put("/{event_id}", response_model=GlobalEventResponse)
async def update_global_event(
    event_id: int,
    event: GlobalEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Aktualisieren eines globalen Events
    """
    # Nur Leitung und Admin können Events bearbeiten
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    db_event = db.query(GlobalEvent).filter(GlobalEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    # Event-Typ validieren
    if event.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültiger Event-Typ. Erlaubt: {', '.join(ALLOWED_EVENT_TYPES)}"
        )
    
    db_event.date = event.date
    db_event.event_type = event.event_type
    db_event.description = event.description
    
    db.commit()
    db.refresh(db_event)
    return db_event

@router.delete("/{event_id}")
async def delete_global_event(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Löschen eines globalen Events
    """
    # Nur Leitung und Admin können Events löschen
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    db_event = db.query(GlobalEvent).filter(GlobalEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    db.delete(db_event)
    db.commit()
    return {"message": "Event gelöscht"}

@router.get("/types")
async def get_event_types():
    """
    Verfügbare Event-Typen abrufen
    """
    return {
        "event_types": [
            {"value": key, "label": label}
            for key, label in EVENT_TYPE_LABELS.items()
        ]
    }

@router.get("/calendar")
async def get_calendar_events(
    year: int,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Events für Kalenderansicht abrufen
    """
    from datetime import datetime
    from calendar import monthrange
    
    if month:
        # Spezifischer Monat
        start_date = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
    else:
        # Ganzes Jahr
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
    
    events = db.query(GlobalEvent).filter(
        GlobalEvent.date >= start_date,
        GlobalEvent.date <= end_date
    ).order_by(GlobalEvent.date).all()
    
    # Für Kalender formatierte Antwort
    calendar_events = []
    for event in events:
        calendar_events.append({
            "id": event.id,
            "date": event.date.isoformat(),
            "title": EVENT_TYPE_LABELS.get(event.event_type, event.event_type),
            "type": event.event_type,
            "description": event.description,
            "color": get_event_color(event.event_type)
        })
    
    return {"events": calendar_events}

def get_event_color(event_type: str) -> str:
    """
    Farbe für Event-Typ bestimmen
    """
    colors = {
        "early_closure_staff": "#f59e0b",      # Amber - Warnung
        "early_closure_event": "#8b5cf6",     # Violett - Info
        "closure": "#ef4444",                 # Rot - Wichtig
        "team_development": "#10b981",        # Grün - Positiv
        "staff_meeting": "#3b82f6",          # Blau - Neutral
        "maintenance": "#6b7280",            # Grau - Wartung
        "holiday": "#f97316",                # Orange - Feiertag
        "other": "#64748b"                   # Schiefergrau - Sonstiges
    }
    return colors.get(event_type, "#64748b")

@router.get("/statistics")
async def get_event_statistics(
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Statistiken zu globalen Events für ein Jahr
    """
    # Nur Leitung und Admin können Statistiken sehen
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    from datetime import datetime
    from sqlalchemy import func, extract
    
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    # Ereignisse nach Typ zählen
    event_counts = db.query(
        GlobalEvent.event_type,
        func.count(GlobalEvent.id).label('count')
    ).filter(
        GlobalEvent.date >= start_date,
        GlobalEvent.date <= end_date
    ).group_by(GlobalEvent.event_type).all()
    
    # Ereignisse nach Monat zählen
    monthly_counts = db.query(
        extract('month', GlobalEvent.date).label('month'),
        func.count(GlobalEvent.id).label('count')
    ).filter(
        GlobalEvent.date >= start_date,
        GlobalEvent.date <= end_date
    ).group_by(extract('month', GlobalEvent.date)).all()
    
    # Formatierte Antwort
    statistics = {
        "year": year,
        "total_events": sum([count.count for count in event_counts]),
        "by_type": [
            {
                "type": count.event_type,
                "label": EVENT_TYPE_LABELS.get(count.event_type, count.event_type),
                "count": count.count
            }
            for count in event_counts
        ],
        "by_month": [
            {
                "month": int(count.month),
                "count": count.count
            }
            for count in monthly_counts
        ]
    }
    
    return statistics