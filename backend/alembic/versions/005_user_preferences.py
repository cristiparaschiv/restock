"""Add preferences column to users table

Revision ID: 005
Revises: 004
Create Date: 2026-01-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add preferences JSONB column to users table
    # This will store user settings like:
    # - category_order: array of shopping list category order
    # - unit_system: 'metric' or 'imperial'
    op.add_column(
        'users',
        sa.Column('preferences', postgresql.JSONB(), nullable=True, server_default='{}')
    )


def downgrade() -> None:
    op.drop_column('users', 'preferences')
