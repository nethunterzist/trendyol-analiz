"""
Alembic environment configuration for Trendyol Product Dashboard

This module configures Alembic to use SQLAlchemy models from database.py
for auto-generating migrations.
"""
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add parent directory to path for database module import
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the SQLAlchemy models - this is required for autogenerate
from database import Base, Category, Snapshot, Report, EnrichmentError

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add model's MetaData object for 'autogenerate' support
target_metadata = Base.metadata

# Get database URL from environment (same logic as database.py)
# Docker: postgresql://postgres:trendyol123@postgres:5432/trendyol_db
# Local: postgresql://postgres:trendyol123@localhost:5433/trendyol_db
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:trendyol123@localhost:5433/trendyol_db")

# Override the sqlalchemy.url from alembic.ini
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well. By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
