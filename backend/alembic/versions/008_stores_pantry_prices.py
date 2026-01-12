"""Add stores, pantry inventory, and price history

Revision ID: 008_stores_pantry_prices
Revises: 007_new_features
Create Date: 2026-01-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '008_stores_pantry_prices'
down_revision: Union[str, None] = '007_new_features'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create stores table
    op.create_table(
        'stores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('location', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('category_order', postgresql.JSONB(), nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_stores_user_id', 'stores', ['user_id'])
    op.create_index('ix_stores_family_id', 'stores', ['family_id'])

    # 2. Add store_id to shopping_lists
    op.add_column(
        'shopping_lists',
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_shopping_lists_store_id',
        'shopping_lists', 'stores',
        ['store_id'], ['id'],
        ondelete='SET NULL'
    )

    # 3. Create pantry_items table with storage_location as string (simpler)
    op.create_table(
        'pantry_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('ingredient_name', sa.String(200), nullable=False),
        sa.Column('ingredient_name_normalized', sa.String(200), nullable=False),
        sa.Column('amount', sa.String(50), nullable=True),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('location', sa.String(20), nullable=False, server_default='pantry'),
        sa.Column('expiration_date', sa.Date(), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('min_quantity', sa.String(50), nullable=True),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pantry_items_user_id', 'pantry_items', ['user_id'])
    op.create_index('ix_pantry_items_family_id', 'pantry_items', ['family_id'])
    op.create_index('ix_pantry_items_name_normalized', 'pantry_items', ['ingredient_name_normalized'])
    op.create_index('ix_pantry_items_expiration', 'pantry_items', ['expiration_date'])

    # 5. Create price_history table
    op.create_table(
        'price_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('ingredient_name_normalized', sa.String(200), nullable=False),
        sa.Column('ingredient_name', sa.String(200), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), server_default='USD', nullable=False),
        sa.Column('amount', sa.String(50), nullable=True),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('recorded_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_price_history_user_id', 'price_history', ['user_id'])
    op.create_index('ix_price_history_family_id', 'price_history', ['family_id'])
    op.create_index('ix_price_history_ingredient', 'price_history', ['ingredient_name_normalized'])
    op.create_index('ix_price_history_store', 'price_history', ['store_id'])
    op.create_index('ix_price_history_date', 'price_history', ['recorded_date'])


def downgrade() -> None:
    # Drop price_history
    op.drop_index('ix_price_history_date', table_name='price_history')
    op.drop_index('ix_price_history_store', table_name='price_history')
    op.drop_index('ix_price_history_ingredient', table_name='price_history')
    op.drop_index('ix_price_history_family_id', table_name='price_history')
    op.drop_index('ix_price_history_user_id', table_name='price_history')
    op.drop_table('price_history')

    # Drop pantry_items
    op.drop_index('ix_pantry_items_expiration', table_name='pantry_items')
    op.drop_index('ix_pantry_items_name_normalized', table_name='pantry_items')
    op.drop_index('ix_pantry_items_family_id', table_name='pantry_items')
    op.drop_index('ix_pantry_items_user_id', table_name='pantry_items')
    op.drop_table('pantry_items')

    # Drop store_id from shopping_lists
    op.drop_constraint('fk_shopping_lists_store_id', 'shopping_lists', type_='foreignkey')
    op.drop_column('shopping_lists', 'store_id')

    # Drop stores
    op.drop_index('ix_stores_family_id', table_name='stores')
    op.drop_index('ix_stores_user_id', table_name='stores')
    op.drop_table('stores')
