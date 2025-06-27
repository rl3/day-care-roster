from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import os
from pathlib import Path

from database import SessionLocal, engine
from models import Base, User, UserRole
from auth import authenticate_user, create_access_token, get_current_user, get_password_hash
from routers import auth, users, time_entries, statistics, child_counts, monthly_locks, global_events, export_import, push_notifications
import time
import logging

logger = logging.getLogger(__name__)

def init_database():
    """Initialize database tables and create default users if needed"""
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Try to create tables
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
            
            # Create default admin user if not exists
            db = SessionLocal()
            try:
                admin_user = db.query(User).filter(User.username == "admin").first()
                if not admin_user:
                    admin_user = User(
                        username="admin",
                        email="admin@kita.de",
                        hashed_password=get_password_hash("admin123"),
                        full_name="Administrator",
                        role=UserRole.ADMIN,
                        weekly_hours=40,
                        additional_hours=0,
                        work_days_per_week=5,
                        vacation_days_per_year=30
                    )
                    db.add(admin_user)
                    db.commit()
                    logger.info("Default admin user created: admin / admin123")
                else:
                    logger.info("Admin user already exists")
                    
                # Create default leitung user if not exists
                leitung_user = db.query(User).filter(User.username == "leitung").first()
                if not leitung_user:
                    leitung_user = User(
                        username="leitung",
                        email="leitung@kita.de",
                        hashed_password=get_password_hash("leitung123"),
                        full_name="Kita-Leitung",
                        role=UserRole.LEITUNG,
                        weekly_hours=30,
                        additional_hours=14.1875,
                        work_days_per_week=5,
                        vacation_days_per_year=32
                    )
                    db.add(leitung_user)
                    db.commit()
                    logger.info("Default leitung user created: leitung / leitung123")
                else:
                    logger.info("Leitung user already exists")
                    
            finally:
                db.close()
            break
            
        except Exception as e:
            retry_count += 1
            logger.warning(f"Database connection attempt {retry_count}/{max_retries} failed: {e}")
            if retry_count >= max_retries:
                logger.error("Failed to connect to database after maximum retries")
                raise
            time.sleep(2)

app = FastAPI(title="Kita Dienstplan API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_database()

# CORS Origins aus Environment Variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(time_entries.router, prefix="/api/time-entries", tags=["time-entries"])
app.include_router(statistics.router, prefix="/api/statistics", tags=["statistics"])
app.include_router(child_counts.router, prefix="/api/child-counts", tags=["child-counts"])
app.include_router(monthly_locks.router, prefix="/api/monthly-locks", tags=["monthly-locks"])
app.include_router(global_events.router, prefix="/api/global-events", tags=["global-events"])
app.include_router(export_import.router, prefix="/api/export-import", tags=["export-import"])
app.include_router(push_notifications.router, prefix="/api/push", tags=["push-notifications"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# Static Files (Frontend) - nur wenn static Ordner existiert
static_dir = Path("static")
if static_dir.exists():
    # Mount the nested static directory for assets
    nested_static = static_dir / "static"
    if nested_static.exists():
        app.mount("/static", StaticFiles(directory=str(nested_static)), name="static")
    
    # Frontend Routes - alle anderen Routen an React weiterleiten
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """
        Serve the React frontend for all non-API routes
        """
        # API routes nicht weiterleiten
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Prüfen ob statische Datei existiert
        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # Andernfalls index.html für React Router ausliefern
        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        else:
            raise HTTPException(status_code=404, detail="Frontend not found")
else:
    # Fallback wenn kein Frontend Build vorhanden
    @app.get("/")
    async def root():
        return {"message": "Kita Dienstplan API - Frontend not built"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)