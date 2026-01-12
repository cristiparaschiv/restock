"""Add rating, collections, families features

Revision ID: 007_new_features
Revises: 2c02d155f365
Create Date: 2026-01-08 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007_new_features'
down_revision: Union[str, None] = '2c02d155f365'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add rating column to recipes
    op.add_column('recipes', sa.Column('rating', sa.Integer(), nullable=True))
    op.create_check_constraint(
        'ck_recipes_rating_range',
        'recipes',
        'rating >= 1 AND rating <= 5'
    )

    # 2. Create families table
    op.create_table(
        'families',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invite_code', sa.String(20), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_families_invite_code', 'families', ['invite_code'])

    # 3. Create family_members table
    op.create_table(
        'family_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('families.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, default='member'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint('uq_family_members_family_user', 'family_members', ['family_id', 'user_id'])
    op.create_index('ix_family_members_family_id', 'family_members', ['family_id'])
    op.create_index('ix_family_members_user_id', 'family_members', ['user_id'])

    # 4. Create family_invites table
    op.create_table(
        'family_invites',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('families.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_family_invites_email', 'family_invites', ['email'])
    op.create_index('ix_family_invites_family_id', 'family_invites', ['family_id'])

    # 5. Create collections table
    op.create_table(
        'collections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('families.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('cover_image_path', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_collections_user_id', 'collections', ['user_id'])
    op.create_index('ix_collections_family_id', 'collections', ['family_id'])

    # 6. Create recipe_collections association table
    op.create_table(
        'recipe_collections',
        sa.Column('recipe_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recipes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('collection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('collections.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 7. Add family_id to recipes
    op.add_column('recipes', sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_recipes_family_id', 'recipes', 'families', ['family_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_recipes_family_id', 'recipes', ['family_id'])

    # 8. Add family_id to meal_plans
    op.add_column('meal_plans', sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_meal_plans_family_id', 'meal_plans', 'families', ['family_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_meal_plans_family_id', 'meal_plans', ['family_id'])

    # 9. Add family_id to shopping_lists
    op.add_column('shopping_lists', sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_shopping_lists_family_id', 'shopping_lists', 'families', ['family_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_shopping_lists_family_id', 'shopping_lists', ['family_id'])


def downgrade() -> None:
    # Remove family_id from shopping_lists
    op.drop_index('ix_shopping_lists_family_id', 'shopping_lists')
    op.drop_constraint('fk_shopping_lists_family_id', 'shopping_lists', type_='foreignkey')
    op.drop_column('shopping_lists', 'family_id')

    # Remove family_id from meal_plans
    op.drop_index('ix_meal_plans_family_id', 'meal_plans')
    op.drop_constraint('fk_meal_plans_family_id', 'meal_plans', type_='foreignkey')
    op.drop_column('meal_plans', 'family_id')

    # Remove family_id from recipes
    op.drop_index('ix_recipes_family_id', 'recipes')
    op.drop_constraint('fk_recipes_family_id', 'recipes', type_='foreignkey')
    op.drop_column('recipes', 'family_id')

    # Drop recipe_collections
    op.drop_table('recipe_collections')

    # Drop collections
    op.drop_index('ix_collections_family_id', 'collections')
    op.drop_index('ix_collections_user_id', 'collections')
    op.drop_table('collections')

    # Drop family_invites
    op.drop_index('ix_family_invites_family_id', 'family_invites')
    op.drop_index('ix_family_invites_email', 'family_invites')
    op.drop_table('family_invites')

    # Drop family_members
    op.drop_index('ix_family_members_user_id', 'family_members')
    op.drop_index('ix_family_members_family_id', 'family_members')
    op.drop_constraint('uq_family_members_family_user', 'family_members', type_='unique')
    op.drop_table('family_members')

    # Drop families
    op.drop_index('ix_families_invite_code', 'families')
    op.drop_table('families')

    # Remove rating from recipes
    op.drop_constraint('ck_recipes_rating_range', 'recipes', type_='check')
    op.drop_column('recipes', 'rating')
