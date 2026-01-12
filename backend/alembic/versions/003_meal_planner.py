"""Add meal planner tables

Revision ID: 003
Revises: 002
Create Date: 2026-01-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create meal_plans table
    op.create_table(
        'meal_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'week_start', name='uq_meal_plans_user_week'),
    )
    op.create_index('ix_meal_plans_user_week', 'meal_plans', ['user_id', 'week_start'])

    # Create meal_plan_items table
    op.create_table(
        'meal_plan_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('meal_plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipe_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('day_of_week', sa.SmallInteger(), nullable=False),
        sa.Column('meal_type', sa.String(20), nullable=False),
        sa.Column('servings', sa.Integer(), server_default='1', nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['meal_plan_id'], ['meal_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('day_of_week >= 0 AND day_of_week <= 6', name='ck_meal_plan_items_day'),
        sa.CheckConstraint("meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')", name='ck_meal_plan_items_meal_type'),
    )
    op.create_index('ix_meal_plan_items_plan_id', 'meal_plan_items', ['meal_plan_id'])


def downgrade() -> None:
    op.drop_index('ix_meal_plan_items_plan_id', table_name='meal_plan_items')
    op.drop_table('meal_plan_items')
    op.drop_index('ix_meal_plans_user_week', table_name='meal_plans')
    op.drop_table('meal_plans')
