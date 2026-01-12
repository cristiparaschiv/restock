"""Add nutrition columns to recipes table

Revision ID: 006
Revises: 005
Create Date: 2026-01-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nutrition columns to recipes table
    # Values are per serving
    op.add_column(
        'recipes',
        sa.Column('calories_per_serving', sa.Integer(), nullable=True)
    )
    op.add_column(
        'recipes',
        sa.Column('protein_g', sa.Float(), nullable=True)
    )
    op.add_column(
        'recipes',
        sa.Column('carbs_g', sa.Float(), nullable=True)
    )
    op.add_column(
        'recipes',
        sa.Column('fat_g', sa.Float(), nullable=True)
    )
    op.add_column(
        'recipes',
        sa.Column('nutrition_source', sa.String(50), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('recipes', 'nutrition_source')
    op.drop_column('recipes', 'fat_g')
    op.drop_column('recipes', 'carbs_g')
    op.drop_column('recipes', 'protein_g')
    op.drop_column('recipes', 'calories_per_serving')
