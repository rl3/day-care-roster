from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from models import User, UserRole, ChildCount
from auth import get_current_active_user, get_db

router = APIRouter()

class ChildCountBase(BaseModel):
    date: date
    time_slot: str
    under_3_count: int
    over_3_count: int

class ChildCountCreate(ChildCountBase):
    pass

class ChildCountResponse(ChildCountBase):
    id: int
    
    class Config:
        from_attributes = True

class ChildCountStats(BaseModel):
    date: date
    time_slot: str
    under_3_count: int
    over_3_count: int
    total_children: int
    required_staff_under_3: int
    required_staff_over_3: int
    total_required_staff: int

@router.get("/", response_model=List[ChildCountResponse])
async def get_child_counts(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Abrufen der Kinderanzahl-Daten für einen Zeitraum
    """
    query = db.query(ChildCount)
    
    if start_date:
        query = query.filter(ChildCount.date >= start_date)
    if end_date:
        query = query.filter(ChildCount.date <= end_date)
    
    # Nach Datum und Zeitslot sortieren
    query = query.order_by(ChildCount.date.desc(), ChildCount.time_slot)
    
    return query.all()

@router.post("/", response_model=ChildCountResponse)
async def create_child_count(
    child_count: ChildCountCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Erstellen eines neuen Kinderanzahl-Eintrags
    """
    # Prüfen ob bereits ein Eintrag für dieses Datum/Zeitslot existiert
    existing = db.query(ChildCount).filter(
        and_(
            ChildCount.date == child_count.date,
            ChildCount.time_slot == child_count.time_slot
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Eintrag für {child_count.date} um {child_count.time_slot} existiert bereits"
        )
    
    # Validierung der Eingaben
    if child_count.under_3_count < 0 or child_count.over_3_count < 0:
        raise HTTPException(
            status_code=400,
            detail="Kinderanzahl kann nicht negativ sein"
        )
    
    if child_count.under_3_count > 30 or child_count.over_3_count > 50:
        raise HTTPException(
            status_code=400,
            detail="Kinderanzahl scheint unrealistisch hoch"
        )
    
    # Zeitslot validieren
    valid_slots = []
    for hour in range(8, 17):  # 8:00 bis 16:30
        valid_slots.append(f"{hour:02d}:00")
        if hour < 16:
            valid_slots.append(f"{hour:02d}:30")
    
    if child_count.time_slot not in valid_slots:
        raise HTTPException(
            status_code=400,
            detail="Ungültiger Zeitslot. Erlaubt: 08:00 bis 16:00 in 30-Min-Schritten"
        )
    
    db_child_count = ChildCount(
        date=child_count.date,
        time_slot=child_count.time_slot,
        under_3_count=child_count.under_3_count,
        over_3_count=child_count.over_3_count
    )
    
    db.add(db_child_count)
    db.commit()
    db.refresh(db_child_count)
    return db_child_count

@router.put("/{child_count_id}", response_model=ChildCountResponse)
async def update_child_count(
    child_count_id: int,
    child_count: ChildCountCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Aktualisieren eines Kinderanzahl-Eintrags
    """
    db_child_count = db.query(ChildCount).filter(ChildCount.id == child_count_id).first()
    if not db_child_count:
        raise HTTPException(status_code=404, detail="Kinderanzahl-Eintrag nicht gefunden")
    
    # Validierung der Eingaben
    if child_count.under_3_count < 0 or child_count.over_3_count < 0:
        raise HTTPException(
            status_code=400,
            detail="Kinderanzahl kann nicht negativ sein"
        )
    
    db_child_count.date = child_count.date
    db_child_count.time_slot = child_count.time_slot
    db_child_count.under_3_count = child_count.under_3_count
    db_child_count.over_3_count = child_count.over_3_count
    
    db.commit()
    db.refresh(db_child_count)
    return db_child_count

@router.delete("/{child_count_id}")
async def delete_child_count(
    child_count_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Löschen eines Kinderanzahl-Eintrags
    """
    db_child_count = db.query(ChildCount).filter(ChildCount.id == child_count_id).first()
    if not db_child_count:
        raise HTTPException(status_code=404, detail="Kinderanzahl-Eintrag nicht gefunden")
    
    db.delete(db_child_count)
    db.commit()
    return {"message": "Kinderanzahl-Eintrag gelöscht"}

@router.get("/stats", response_model=List[ChildCountStats])
async def get_child_count_statistics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Statistiken zu Kinderanzahl und Personalbedarfsberechnung
    """
    query = db.query(ChildCount)
    
    if start_date:
        query = query.filter(ChildCount.date >= start_date)
    if end_date:
        query = query.filter(ChildCount.date <= end_date)
    
    child_counts = query.order_by(ChildCount.date.desc(), ChildCount.time_slot).all()
    
    stats = []
    for count in child_counts:
        # Fachkraft-Kind-Schlüssel berechnen
        # Unter 3 Jahre: 1 Pädagoge auf 4,25 Kinder
        # Über 3 Jahre: 1 Pädagoge auf 10 Kinder
        required_staff_under_3 = max(1, round(count.under_3_count / 4.25)) if count.under_3_count > 0 else 0
        required_staff_over_3 = max(1, round(count.over_3_count / 10)) if count.over_3_count > 0 else 0
        
        stats.append(ChildCountStats(
            date=count.date,
            time_slot=count.time_slot,
            under_3_count=count.under_3_count,
            over_3_count=count.over_3_count,
            total_children=count.under_3_count + count.over_3_count,
            required_staff_under_3=required_staff_under_3,
            required_staff_over_3=required_staff_over_3,
            total_required_staff=required_staff_under_3 + required_staff_over_3
        ))
    
    return stats

@router.get("/time-slots")
async def get_available_time_slots():
    """
    Verfügbare Zeitslots abrufen
    """
    slots = []
    for hour in range(8, 17):  # 8:00 bis 16:30
        slots.append(f"{hour:02d}:00")
        if hour < 16:
            slots.append(f"{hour:02d}:30")
    
    return {"time_slots": slots}