"""Add shopping lists tables

Revision ID: 004
Revises: 003
Create Date: 2026-01-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create shopping_lists table
    op.create_table(
        'shopping_lists',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('meal_plan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['meal_plan_id'], ['meal_plans.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_shopping_lists_user_id', 'shopping_lists', ['user_id'])

    # Create shopping_list_items table
    op.create_table(
        'shopping_list_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shopping_list_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ingredient_name', sa.String(200), nullable=False),
        sa.Column('amount', sa.String(50), nullable=True),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('is_checked', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('source_recipes', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['shopping_list_id'], ['shopping_lists.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_shopping_list_items_list_id', 'shopping_list_items', ['shopping_list_id'])


def downgrade() -> None:
    op.drop_index('ix_shopping_list_items_list_id', table_name='shopping_list_items')
    op.drop_table('shopping_list_items')
    op.drop_index('ix_shopping_lists_user_id', table_name='shopping_lists')
    op.drop_table('shopping_lists')
