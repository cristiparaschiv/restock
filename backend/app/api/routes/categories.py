from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func

from app.api.deps import DbSession, CurrentUser
from app.models.category import Category
from app.models.recipe import Recipe, recipe_categories
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryListResponse,
)

router = APIRouter()


def category_to_response(category: Category, recipe_count: int = 0) -> CategoryResponse:
    """Convert Category model to response."""
    return CategoryResponse(
        id=category.id,
        name=category.name,
        color=category.color,
        icon=category.icon,
        recipe_count=recipe_count,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new category."""
    # Check if category with same name exists
    result = await db.execute(
        select(Category).where(
            Category.user_id == current_user.id,
            Category.name == data.name,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists",
        )

    category = Category(
        user_id=current_user.id,
        name=data.name,
        color=data.color,
        icon=data.icon,
    )

    db.add(category)
    await db.commit()
    await db.refresh(category)

    return category_to_response(category, 0)


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    current_user: CurrentUser,
    db: DbSession,
):
    """List all categories for the current user with recipe counts."""
    # Get categories with recipe counts using a subquery
    count_subquery = (
        select(
            recipe_categories.c.category_id,
            func.count(recipe_categories.c.recipe_id).label("recipe_count"),
        )
        .select_from(recipe_categories)
        .join(Recipe, Recipe.id == recipe_categories.c.recipe_id)
        .where(Recipe.user_id == current_user.id)
        .group_by(recipe_categories.c.category_id)
        .subquery()
    )

    result = await db.execute(
        select(Category, func.coalesce(count_subquery.c.recipe_count, 0).label("recipe_count"))
        .outerjoin(count_subquery, Category.id == count_subquery.c.category_id)
        .where(Category.user_id == current_user.id)
        .order_by(Category.name)
    )

    categories = []
    for row in result:
        category = row[0]
        recipe_count = row[1]
        categories.append(category_to_response(category, recipe_count))

    return CategoryListResponse(categories=categories)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single category by ID."""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Get recipe count
    count_result = await db.execute(
        select(func.count(recipe_categories.c.recipe_id))
        .where(recipe_categories.c.category_id == category_id)
    )
    recipe_count = count_result.scalar() or 0

    return category_to_response(category, recipe_count)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a category."""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Check for duplicate name
    if data.name and data.name != category.name:
        name_check = await db.execute(
            select(Category).where(
                Category.user_id == current_user.id,
                Category.name == data.name,
            )
        )
        if name_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)

    # Get recipe count
    count_result = await db.execute(
        select(func.count(recipe_categories.c.recipe_id))
        .where(recipe_categories.c.category_id == category_id)
    )
    recipe_count = count_result.scalar() or 0

    return category_to_response(category, recipe_count)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a category."""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    await db.delete(category)
    await db.commit()


@router.post("/{category_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_recipe_to_category(
    category_id: UUID,
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add a recipe to a category."""
    # Verify category exists and belongs to user
    cat_result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    if not cat_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Verify recipe exists and belongs to user
    recipe_result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    if not recipe_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # Check if already in category
    existing = await db.execute(
        select(recipe_categories).where(
            recipe_categories.c.recipe_id == recipe_id,
            recipe_categories.c.category_id == category_id,
        )
    )
    if existing.first():
        return  # Already exists, no-op

    # Add to category
    await db.execute(
        recipe_categories.insert().values(
            recipe_id=recipe_id,
            category_id=category_id,
        )
    )
    await db.commit()


@router.delete("/{category_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_recipe_from_category(
    category_id: UUID,
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove a recipe from a category."""
    # Verify category exists and belongs to user
    cat_result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    if not cat_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Remove from category
    await db.execute(
        recipe_categories.delete().where(
            recipe_categories.c.recipe_id == recipe_id,
            recipe_categories.c.category_id == category_id,
        )
    )
    await db.commit()
