"""
Database setup and models - PostgreSQL
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from logging_config import get_logger

log = get_logger("db")

# PostgreSQL database - configurable via environment variable
# Default: Local PostgreSQL for development
# Docker: postgresql://postgres:trendyol123@postgres:5432/trendyol_db
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:trendyol123@localhost:5433/trendyol_db")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Category(Base):
    """Category model - hierarchical structure"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    trendyol_category_id = Column(Integer, nullable=True)
    trendyol_url = Column(String, nullable=True)
    path_model = Column(String, nullable=True)  # URL slug for search API (e.g. "elbise-x-c56")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    children = relationship("Category", backref="parent", remote_side=[id])
    snapshots = relationship("Snapshot", back_populates="category")


class Snapshot(Base):
    """Snapshot model - monthly data captures"""
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False, index=True)
    snapshot_month = Column(String, nullable=False, index=True)  # "2024-11", "2024-12"
    total_products = Column(Integer, default=0)
    avg_price = Column(Integer, default=0)
    json_file_path = Column(String, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    category = relationship("Category", back_populates="snapshots")


class Report(Base):
    """Report model - saved dashboard reports"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # "Kasım Ayı Kozmetik Raporu"
    category_id = Column(Integer, nullable=True, index=True)  # Trendyol API category ID (no FK)
    total_products = Column(Integer, default=0)
    total_subcategories = Column(Integer, default=0)
    json_file_path = Column(String, nullable=True)
    html_file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EnrichmentError(Base):
    """Persistent log for external enrichment errors"""
    __tablename__ = "enrichment_errors"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=True)
    product_id = Column(Integer, nullable=True)
    merchant_id = Column(Integer, nullable=True)
    endpoint = Column(String, nullable=False)  # reviews | social | questions | similar | followers
    error_type = Column(String, nullable=True)  # timeout | dns | reset | http | other
    message = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    attempt = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """Initialize database - create tables"""
    Base.metadata.create_all(bind=engine)
    log.info("Database initialized successfully")


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
