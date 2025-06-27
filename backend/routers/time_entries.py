from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from models import User, UserRole, TimeEntry, TimeEntryType, WorkTimeSubtype, MonthlyLock
from auth import get_current_active_user, get_db

router = APIRouter()

class TimeEntryBase(BaseModel):
    date: date
    entry_type: TimeEntryType
    subtype: Optional[WorkTimeSubtype] = None
    hours: float = 0.0
    days: float = 0.0
    description: Optional[str] = None

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntryResponse(TimeEntryBase):
    id: int
    user_id: int
    is_locked: bool
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[TimeEntryResponse])
async def get_time_entries(
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(TimeEntry)
    
    # Rechteverwaltung: Fachkräfte sehen nur ihre eigenen Einträge
    if current_user.role == UserRole.FACHKRAFT:
        query = query.filter(TimeEntry.user_id == current_user.id)
    elif user_id:
        query = query.filter(TimeEntry.user_id == user_id)
    
    if start_date:
        query = query.filter(TimeEntry.date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.date <= end_date)
    
    return query.all()

@router.post("/", response_model=TimeEntryResponse)
async def create_time_entry(
    entry: TimeEntryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Prüfen ob der Monat bereits gesperrt ist
    monthly_lock = db.query(MonthlyLock).filter(
        MonthlyLock.user_id == current_user.id,
        MonthlyLock.year == entry.date.year,
        MonthlyLock.month == entry.date.month
    ).first()
    
    if monthly_lock:
        raise HTTPException(
            status_code=400, 
            detail="Month is already locked for this user"
        )
    
    db_entry = TimeEntry(
        user_id=current_user.id,
        date=entry.date,
        entry_type=entry.entry_type,
        subtype=entry.subtype,
        hours=entry.hours,
        days=entry.days,
        description=entry.description
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.put("/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: int,
    entry: TimeEntryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Rechteverwaltung
    if current_user.role == UserRole.FACHKRAFT and db_entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Prüfen ob gesperrt
    if db_entry.is_locked and current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=400, detail="Entry is locked")
    
    db_entry.date = entry.date
    db_entry.entry_type = entry.entry_type
    db_entry.subtype = entry.subtype
    db_entry.hours = entry.hours
    db_entry.days = entry.days
    db_entry.description = entry.description
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/{entry_id}")
async def delete_time_entry(
    entry_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Rechteverwaltung
    if current_user.role == UserRole.FACHKRAFT and db_entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Prüfen ob gesperrt
    if db_entry.is_locked and current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=400, detail="Entry is locked")
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Time entry deleted"}