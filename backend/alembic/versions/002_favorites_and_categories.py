"""Add favorites and categories

Revision ID: 002
Revises: 001
Create Date: 2026-01-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_favorite to recipes
    op.add_column('recipes', sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index('ix_recipes_favorite', 'recipes', ['user_id', 'is_favorite'], postgresql_where=sa.text('is_favorite = true'))

    # Create categories table
    op.create_table(
        'categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_categories_user_name'),
    )
    op.create_index('ix_categories_user_id', 'categories', ['user_id'])

    # Create recipe_categories junction table
    op.create_table(
        'recipe_categories',
        sa.Column('recipe_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('recipe_id', 'category_id'),
    )
    op.create_index('ix_recipe_categories_category_id', 'recipe_categories', ['category_id'])


def downgrade() -> None:
    op.drop_index('ix_recipe_categories_category_id', table_name='recipe_categories')
    op.drop_table('recipe_categories')
    op.drop_index('ix_categories_user_id', table_name='categories')
    op.drop_table('categories')
    op.drop_index('ix_recipes_favorite', table_name='recipes')
    op.drop_column('recipes', 'is_favorite')
