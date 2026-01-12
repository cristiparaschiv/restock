"""Initial migration

Revision ID: 001
Revises:
Create Date: 2025-01-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('preferred_language', sa.String(2), nullable=True, server_default='en'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Create recipes table
    op.create_table(
        'recipes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('original_language', sa.String(2), nullable=False, server_default='en'),
        sa.Column('source_url', sa.Text(), nullable=True),
        # English content
        sa.Column('title_en', sa.String(500), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('ingredients_en', postgresql.JSONB(), nullable=True),
        sa.Column('instructions_en', postgresql.JSONB(), nullable=True),
        # Romanian content
        sa.Column('title_ro', sa.String(500), nullable=True),
        sa.Column('description_ro', sa.Text(), nullable=True),
        sa.Column('ingredients_ro', postgresql.JSONB(), nullable=True),
        sa.Column('instructions_ro', postgresql.JSONB(), nullable=True),
        # Metadata
        sa.Column('prep_time_minutes', sa.Integer(), nullable=True),
        sa.Column('cook_time_minutes', sa.Integer(), nullable=True),
        sa.Column('total_time_minutes', sa.Integer(), nullable=True),
        sa.Column('servings', sa.Integer(), nullable=True),
        sa.Column('image_path', sa.String(500), nullable=True),
        sa.Column('original_image_url', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.JSONB(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recipes_user_id', 'recipes', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_recipes_user_id', table_name='recipes')
    op.drop_table('recipes')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
