from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Dict, List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from models import User, UserRole, TimeEntry, TimeEntryType, WorkTimeSubtype, ChildCount, GlobalEvent
from auth import get_current_active_user, get_db

router = APIRouter()

class WeeklyStatistics(BaseModel):
    user_id: int
    user_name: str
    week_start: date
    total_hours: float
    target_hours: float
    overtime: float

class MonthlyStatistics(BaseModel):
    user_id: int
    user_name: str
    year: int
    month: int
    worked_hours: float
    target_hours: float
    overtime: float
    sick_days: float
    vacation_days: float

class UserAnnualStatistics(BaseModel):
    user_id: int
    user_name: str
    year: int
    anleitung_hours: float
    fortbildung_days: float
    bildungsurlaub_days: float
    sick_days: float
    child_sick_days: float
    vacation_days: float
    vacation_days_previous_year: float
    praktikum_days: float

@router.get("/weekly", response_model=List[WeeklyStatistics])
async def get_weekly_statistics(
    week_start: date,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.FACHKRAFT:
        users = [current_user]
    else:
        users = db.query(User).filter(User.is_active == True).all()
    
    week_end = week_start + timedelta(days=6)
    statistics = []
    
    for user in users:
        # Berechne gearbeitete Stunden für die Woche
        worked_hours = db.query(func.sum(TimeEntry.hours)).filter(
            and_(
                TimeEntry.user_id == user.id,
                TimeEntry.date >= week_start,
                TimeEntry.date <= week_end,
                TimeEntry.entry_type == TimeEntryType.ARBEITSZEIT
            )
        ).scalar() or 0.0
        
        # Berechne Sollstunden (Wochenstunden + Sonderstunden)
        target_hours = user.weekly_hours + user.additional_hours
        overtime = worked_hours - target_hours
        
        statistics.append(WeeklyStatistics(
            user_id=user.id,
            user_name=user.full_name,
            week_start=week_start,
            total_hours=worked_hours,
            target_hours=target_hours,
            overtime=overtime
        ))
    
    return statistics

@router.get("/monthly", response_model=List[MonthlyStatistics])
async def get_monthly_statistics(
    year: int,
    month: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.FACHKRAFT:
        users = [current_user]
    else:
        users = db.query(User).filter(User.is_active == True).all()
    
    statistics = []
    
    for user in users:
        # Gearbeitete Stunden im Monat
        worked_hours = db.query(func.sum(TimeEntry.hours)).filter(
            and_(
                TimeEntry.user_id == user.id,
                func.year(TimeEntry.date) == year,
                func.month(TimeEntry.date) == month,
                TimeEntry.entry_type == TimeEntryType.ARBEITSZEIT
            )
        ).scalar() or 0.0
        
        # Kranktage
        sick_days = db.query(func.sum(TimeEntry.days)).filter(
            and_(
                TimeEntry.user_id == user.id,
                func.year(TimeEntry.date) == year,
                func.month(TimeEntry.date) == month,
                TimeEntry.entry_type == TimeEntryType.KRANK
            )
        ).scalar() or 0.0
        
        # Urlaubstage
        vacation_days = db.query(func.sum(TimeEntry.days)).filter(
            and_(
                TimeEntry.user_id == user.id,
                func.year(TimeEntry.date) == year,
                func.month(TimeEntry.date) == month,
                TimeEntry.entry_type == TimeEntryType.URLAUB
            )
        ).scalar() or 0.0
        
        # Berechne Sollstunden für den Monat (vereinfacht)
        import calendar
        days_in_month = calendar.monthrange(year, month)[1]
        work_days_in_month = days_in_month * user.work_days_per_week / 7
        target_hours = (user.weekly_hours + user.additional_hours) * work_days_in_month / user.work_days_per_week
        
        overtime = worked_hours - target_hours
        
        statistics.append(MonthlyStatistics(
            user_id=user.id,
            user_name=user.full_name,
            year=year,
            month=month,
            worked_hours=worked_hours,
            target_hours=target_hours,
            overtime=overtime,
            sick_days=sick_days,
            vacation_days=vacation_days
        ))
    
    return statistics

@router.get("/annual/{user_id}", response_model=UserAnnualStatistics)
async def get_user_annual_statistics(
    user_id: int,
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Rechteverwaltung
    if current_user.role == UserRole.FACHKRAFT and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Anleitungsstunden
    anleitung_hours = db.query(func.sum(TimeEntry.hours)).filter(
        and_(
            TimeEntry.user_id == user_id,
            func.year(TimeEntry.date) == year,
            TimeEntry.subtype == WorkTimeSubtype.ANLEITUNG
        )
    ).scalar() or 0.0
    
    # Fortbildungstage
    fortbildung_days = db.query(func.sum(TimeEntry.days)).filter(
        and_(
            TimeEntry.user_id == user_id,
            func.year(TimeEntry.date) == year,
            TimeEntry.subtype == WorkTimeSubtype.FORTBILDUNG
        )
    ).scalar() or 0.0
    
    # Bildungsurlaubstage
    bildungsurlaub_days = db.query(func.sum(TimeEntry.days)).filter(
        and_(
            TimeEntry.user_id == user_id,
            func.year(TimeEntry.date) == year,
            TimeEntry.entry_type == TimeEntryType.BILDUNGSURLAUB
        )
    ).scalar() or 0.0
    
    # Kranktage
    sick_days = db.query(func.sum(TimeEntry.days)).filter(
        and_(
            TimeEntry.user_id == user_id,
            func.year(TimeEntry.date) == year,
            TimeEntry.entry_type == TimeEntryType.KRANK
        )
    ).scalar() or 0.0
    
    # Kindkranktage
    child_sick_days = db.query(func.sum(TimeEntry.days)).filter(
        and_(
            TimeEntry.user_id == user_id,
            func.year(TimeEntry.date) == year,
            TimeEntry.entry_type == TimeEntryType.KINDKRANK
        )
    ).scalar() or 0.0
    
    # Urlaubstage
    vacation_days = db.query(func.sum(TimeEntry.days)).filter(
        and_(
            TimeEntry.user_id == user_id,
            func.year(TimeEntry.date) == year,
            TimeEntry.entry_type == TimeEntryType.URLAUB
        )
    ).scalar() or 0.0
    
    # Urlaubstage aus Vorjahr (bis 31.03.)
    vacation_days_previous_year = db.query(func.sum(TimeEntry.days)).filter(
        and_(
            TimeEntry.user_id == user_id,
            TimeEntry.date >= date(year, 1, 1),
            TimeEntry.date <= date(year, 3, 31),
            TimeEntry.entry_type == TimeEntryType.URLAUB,
            TimeEntry.description.like("%Vorjahr%")
        )
    ).scalar() or 0.0
    
    # Praktikumstage
    praktikum_days = db.query(func.sum(TimeEntry.days)).filter(
        and_(
            TimeEntry.user_id == user_id,
            func.year(TimeEntry.date) == year,
            TimeEntry.entry_type == TimeEntryType.PRAKTIKUM
        )
    ).scalar() or 0.0
    
    return UserAnnualStatistics(
        user_id=user_id,
        user_name=user.full_name,
        year=year,
        anleitung_hours=anleitung_hours,
        fortbildung_days=fortbildung_days,
        bildungsurlaub_days=bildungsurlaub_days,
        sick_days=sick_days,
        child_sick_days=child_sick_days,
        vacation_days=vacation_days,
        vacation_days_previous_year=vacation_days_previous_year,
        praktikum_days=praktikum_days
    )