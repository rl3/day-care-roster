from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# If no DATABASE_URL specified, fallback to SQLite
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./kita_dienstplan.db"
    logger.warning("No DATABASE_URL found in environment, falling back to SQLite")
else:
    logger.info(f"Using database: {DATABASE_URL.split('@')[0]}@***")

# Create engine with appropriate settings
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}  # Needed for SQLite
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=3600    # Recycle connections every hour
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()