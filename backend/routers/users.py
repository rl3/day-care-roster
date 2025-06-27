from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from models import User, UserRole
from auth import get_current_active_user, get_db, get_password_hash

router = APIRouter()

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: UserRole
    weekly_hours: float = 0.0
    additional_hours: float = 0.0
    work_days_per_week: int = 5
    vacation_days_per_year: int = 32

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/", response_model=List[UserResponse])
async def read_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.LEITUNG, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    users = db.query(User).all()
    return users

@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        weekly_hours=user.weekly_hours,
        additional_hours=user.additional_hours,
        work_days_per_week=user.work_days_per_week,
        vacation_days_per_year=user.vacation_days_per_year
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user