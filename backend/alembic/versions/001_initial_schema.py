"""Initial schema - creates all tables

This migration creates the initial database schema for Trendyol Product Dashboard.
Tables: categories, snapshots, reports, enrichment_errors

Revision ID: 001
Revises:
Create Date: 2026-01-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables"""

    # Create categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('parent_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=True),
        sa.Column('trendyol_category_id', sa.Integer(), nullable=True),
        sa.Column('trendyol_url', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
    )

    # Create snapshots table
    op.create_table(
        'snapshots',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=False, index=True),
        sa.Column('snapshot_month', sa.String(), nullable=False, index=True),
        sa.Column('total_products', sa.Integer(), default=0),
        sa.Column('avg_price', sa.Integer(), default=0),
        sa.Column('json_file_path', sa.String(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(), default=sa.func.now()),
    )

    # Create reports table
    op.create_table(
        'reports',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=False, index=True),
        sa.Column('total_products', sa.Integer(), default=0),
        sa.Column('total_subcategories', sa.Integer(), default=0),
        sa.Column('json_file_path', sa.String(), nullable=True),
        sa.Column('html_file_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
    )

    # Create enrichment_errors table
    op.create_table(
        'enrichment_errors',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('report_id', sa.Integer(), nullable=True),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('merchant_id', sa.Integer(), nullable=True),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('error_type', sa.String(), nullable=True),
        sa.Column('message', sa.String(), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('attempt', sa.Integer(), default=1),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
    )


def downgrade() -> None:
    """Drop all tables"""
    op.drop_table('enrichment_errors')
    op.drop_table('reports')
    op.drop_table('snapshots')
    op.drop_table('categories')
