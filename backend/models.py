from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
from datetime import datetime, date

class UserRole(str, enum.Enum):
    FACHKRAFT = "fachkraft"
    LEITUNG = "leitung"
    ADMIN = "admin"

class TimeEntryType(str, enum.Enum):
    ARBEITSZEIT = "arbeitszeit"
    KRANK = "krank"
    KINDKRANK = "kindkrank"
    URLAUB = "urlaub"
    BILDUNGSURLAUB = "bildungsurlaub"
    HOSPITATION = "hospitation"
    PRAKTIKUM = "praktikum"

class WorkTimeSubtype(str, enum.Enum):
    STUNDEN_AM_KIND = "stunden_am_kind"
    VORBEREITUNGSSTUNDEN = "vorbereitungsstunden"
    ELTERNGESPRAECH = "elterngespraech"
    KONFERENZ = "konferenz"
    KLEINTEAM = "kleinteam"
    ANLEITUNG = "anleitung"
    LEITUNG = "leitung"
    GESCHAEFTSFUEHRUNG = "geschaeftsfuehrung"
    SPRACHFOERDERUNG = "sprachfoerderung"
    FORTBILDUNG = "fortbildung"
    TEAMENTWICKLUNG = "teamentwicklung"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # Arbeitszeit-Konfiguration
    weekly_hours = Column(Float, default=0.0)
    additional_hours = Column(Float, default=0.0)  # Sonderstunden
    work_days_per_week = Column(Integer, default=5)
    vacation_days_per_year = Column(Integer, default=32)
    
    time_entries = relationship("TimeEntry", back_populates="user")

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    entry_type = Column(Enum(TimeEntryType), nullable=False)
    subtype = Column(Enum(WorkTimeSubtype), nullable=True)
    
    # Für Stundenerfassung
    hours = Column(Float, default=0.0)
    
    # Für Tageserfassung (Urlaub, Krankheit etc.)
    days = Column(Float, default=0.0)  # 0.5 für halbe Tage, 1.0 für ganze Tage
    
    # Automatische Vorbereitungszeit-Berechnung
    prep_time_hours = Column(Float, default=0.0)  # Automatisch berechnete Vorbereitungszeit
    
    description = Column(Text, nullable=True)
    is_locked = Column(Boolean, default=False)  # Gesperrt nach Monatsabschluss
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="time_entries")
    
    @property
    def total_hours(self):
        """Gesamtstunden inklusive automatischer Vorbereitungszeit"""
        return self.hours + self.prep_time_hours
    
    def calculate_prep_time(self):
        """Berechnet automatische Vorbereitungszeit (Faktor 0,5 für Stunden am Kind)"""
        if (self.entry_type == TimeEntryType.ARBEITSZEIT and 
            self.subtype == WorkTimeSubtype.STUNDEN_AM_KIND and 
            self.hours > 0):
            self.prep_time_hours = round(self.hours * 0.5, 2)
        else:
            self.prep_time_hours = 0.0

class ChildCount(Base):
    __tablename__ = "child_counts"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    time_slot = Column(String(10), nullable=False)  # "08:00", "08:30", etc.
    under_3_count = Column(Integer, default=0)
    over_3_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())

class GlobalEvent(Base):
    __tablename__ = "global_events"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    event_type = Column(String(50), nullable=False)  # "early_closure_staff", "early_closure_event", "closure"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

class MonthlyLock(Base):
    __tablename__ = "monthly_locks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    locked_at = Column(DateTime, default=func.now())
    locked_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    user = relationship("User", foreign_keys=[user_id])
    locked_by_user = relationship("User", foreign_keys=[locked_by])