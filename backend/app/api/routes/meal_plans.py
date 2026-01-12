from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models.meal_plan import MealPlan, MealPlanItem
from app.models.recipe import Recipe
from app.schemas.meal_plan import (
    MealPlanCreate,
    MealPlanResponse,
    MealPlanItemCreate,
    MealPlanItemUpdate,
    MealPlanItemResponse,
)
from app.schemas.recipe import RecipeResponse, Ingredient

router = APIRouter()


def get_week_start(d: date) -> date:
    """Get Monday of the week containing the given date."""
    return d - timedelta(days=d.weekday())


async def can_access_meal_plan(
    db: DbSession,
    plan_id: UUID,
    user_id: UUID,
) -> MealPlan | None:
    """Check if user can access a meal plan (owner or family member)."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == user_id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for plan - owned by user OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(MealPlan).where(
                MealPlan.id == plan_id,
                or_(
                    MealPlan.user_id == user_id,
                    MealPlan.family_id.in_(user_family_ids),
                ),
            )
        )
    else:
        result = await db.execute(
            select(MealPlan).where(
                MealPlan.id == plan_id,
                MealPlan.user_id == user_id,
            )
        )
    return result.scalar_one_or_none()


def recipe_to_response(recipe: Recipe, lang: str = "en") -> RecipeResponse:
    """Convert Recipe model to localized response."""
    ingredients = recipe.get_ingredients(lang) or []
    instructions = recipe.get_instructions(lang) or []

    return RecipeResponse(
        id=recipe.id,
        title=recipe.get_title(lang) or recipe.get_title("en") or "",
        description=recipe.get_description(lang) or recipe.get_description("en"),
        ingredients=[Ingredient(**ing) if isinstance(ing, dict) else ing for ing in ingredients],
        instructions=instructions,
        prep_time_minutes=recipe.prep_time_minutes,
        cook_time_minutes=recipe.cook_time_minutes,
        total_time_minutes=recipe.total_time_minutes,
        servings=recipe.servings,
        image_url=f"/uploads/{recipe.image_path}" if recipe.image_path else recipe.original_image_url,
        tags=recipe.tags or [],
        source_url=recipe.source_url,
        original_language=recipe.original_language,
        is_favorite=recipe.is_favorite,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
    )


def meal_plan_item_to_response(item: MealPlanItem, lang: str) -> MealPlanItemResponse:
    """Convert MealPlanItem to response."""
    return MealPlanItemResponse(
        id=item.id,
        recipe_id=item.recipe_id,
        recipe=recipe_to_response(item.recipe, lang),
        day_of_week=item.day_of_week,
        meal_type=item.meal_type,
        servings=item.servings or 1,
        notes=item.notes,
        created_at=item.created_at,
    )


def meal_plan_to_response(plan: MealPlan, lang: str) -> MealPlanResponse:
    """Convert MealPlan to response."""
    return MealPlanResponse(
        id=plan.id,
        week_start=plan.week_start,
        items=[meal_plan_item_to_response(item, lang) for item in plan.items],
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.get("/current", response_model=MealPlanResponse)
async def get_current_week(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get meal plan for the current week. Creates one if it doesn't exist."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    week_start = get_week_start(date.today())

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for meal plan - user's own OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(MealPlan)
            .where(
                MealPlan.week_start == week_start,
                or_(
                    MealPlan.user_id == current_user.id,
                    MealPlan.family_id.in_(user_family_ids),
                ),
            )
            .options(
                selectinload(MealPlan.items).selectinload(MealPlanItem.recipe)
            )
        )
    else:
        result = await db.execute(
            select(MealPlan)
            .where(
                MealPlan.user_id == current_user.id,
                MealPlan.week_start == week_start,
            )
            .options(
                selectinload(MealPlan.items).selectinload(MealPlanItem.recipe)
            )
        )
    plan = result.scalar_one_or_none()

    if not plan:
        plan = MealPlan(
            user_id=current_user.id,
            week_start=week_start,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        # Return response directly for new plan to avoid accessing unloaded items relationship
        return MealPlanResponse(
            id=plan.id,
            week_start=plan.week_start,
            items=[],
            created_at=plan.created_at,
            updated_at=plan.updated_at,
        )

    return meal_plan_to_response(plan, current_user.preferred_language)


@router.get("", response_model=MealPlanResponse)
async def get_meal_plan(
    current_user: CurrentUser,
    db: DbSession,
    week_start: date = Query(..., description="Start of the week (Monday)"),
):
    """Get meal plan for a specific week. Creates one if it doesn't exist."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Normalize to Monday
    normalized_week_start = get_week_start(week_start)

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for meal plan - user's own OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(MealPlan)
            .where(
                MealPlan.week_start == normalized_week_start,
                or_(
                    MealPlan.user_id == current_user.id,
                    MealPlan.family_id.in_(user_family_ids),
                ),
            )
            .options(
                selectinload(MealPlan.items).selectinload(MealPlanItem.recipe)
            )
        )
    else:
        result = await db.execute(
            select(MealPlan)
            .where(
                MealPlan.user_id == current_user.id,
                MealPlan.week_start == normalized_week_start,
            )
            .options(
                selectinload(MealPlan.items).selectinload(MealPlanItem.recipe)
            )
        )
    plan = result.scalar_one_or_none()

    if not plan:
        plan = MealPlan(
            user_id=current_user.id,
            week_start=normalized_week_start,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        # Return response directly for new plan to avoid accessing unloaded items relationship
        return MealPlanResponse(
            id=plan.id,
            week_start=plan.week_start,
            items=[],
            created_at=plan.created_at,
            updated_at=plan.updated_at,
        )

    return meal_plan_to_response(plan, current_user.preferred_language)


@router.post("", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_plan(
    data: MealPlanCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a meal plan for a week."""
    week_start = get_week_start(data.week_start)

    # Check if plan already exists
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.user_id == current_user.id,
            MealPlan.week_start == week_start,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Meal plan for this week already exists",
        )

    plan = MealPlan(
        user_id=current_user.id,
        week_start=week_start,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    # Return response directly for new plan to avoid accessing unloaded items relationship
    return MealPlanResponse(
        id=plan.id,
        week_start=plan.week_start,
        items=[],
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.post("/{plan_id}/items", response_model=MealPlanItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    plan_id: UUID,
    data: MealPlanItemCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add a recipe to a meal plan."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Verify plan access (owner or family member)
    plan = await can_access_meal_plan(db, plan_id, current_user.id)

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    # Get user's family IDs for recipe access check
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Verify recipe access (user's own or shared with family)
    if user_family_ids:
        result = await db.execute(
            select(Recipe).where(
                Recipe.id == data.recipe_id,
                or_(
                    Recipe.user_id == current_user.id,
                    Recipe.family_id.in_(user_family_ids),
                ),
            )
        )
    else:
        result = await db.execute(
            select(Recipe).where(
                Recipe.id == data.recipe_id,
                Recipe.user_id == current_user.id,
            )
        )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    item = MealPlanItem(
        meal_plan_id=plan_id,
        recipe_id=data.recipe_id,
        day_of_week=data.day_of_week,
        meal_type=data.meal_type,
        servings=data.servings,
        notes=data.notes,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    # Load the recipe relationship
    result = await db.execute(
        select(MealPlanItem)
        .where(MealPlanItem.id == item.id)
        .options(selectinload(MealPlanItem.recipe))
    )
    item = result.scalar_one()

    return meal_plan_item_to_response(item, current_user.preferred_language)


@router.put("/{plan_id}/items/{item_id}", response_model=MealPlanItemResponse)
async def update_item(
    plan_id: UUID,
    item_id: UUID,
    data: MealPlanItemUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a meal plan item."""
    # Verify plan access (owner or family member)
    plan = await can_access_meal_plan(db, plan_id, current_user.id)

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    # Get the item
    result = await db.execute(
        select(MealPlanItem)
        .where(
            MealPlanItem.id == item_id,
            MealPlanItem.meal_plan_id == plan_id,
        )
        .options(selectinload(MealPlanItem.recipe))
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan item not found",
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()

    # Re-query with recipe loaded to avoid lazy loading with lazy="raise"
    result = await db.execute(
        select(MealPlanItem)
        .where(MealPlanItem.id == item_id)
        .options(selectinload(MealPlanItem.recipe))
    )
    item = result.scalar_one()

    return meal_plan_item_to_response(item, current_user.preferred_language)


@router.delete("/{plan_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    plan_id: UUID,
    item_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove a recipe from a meal plan."""
    # Verify plan access (owner or family member)
    plan = await can_access_meal_plan(db, plan_id, current_user.id)

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    # Get the item
    result = await db.execute(
        select(MealPlanItem).where(
            MealPlanItem.id == item_id,
            MealPlanItem.meal_plan_id == plan_id,
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan item not found",
        )

    await db.delete(item)
    await db.commit()


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a meal plan and all its items."""
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.user_id == current_user.id,
        )
    )
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    await db.delete(plan)
    await db.commit()


@router.get("/{plan_id}/nutrition")
async def get_meal_plan_nutrition(
    plan_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get daily nutrition totals for a meal plan."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for plan - owned by user OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(MealPlan)
            .where(
                MealPlan.id == plan_id,
                or_(
                    MealPlan.user_id == current_user.id,
                    MealPlan.family_id.in_(user_family_ids),
                ),
            )
            .options(
                selectinload(MealPlan.items).selectinload(MealPlanItem.recipe)
            )
        )
    else:
        result = await db.execute(
            select(MealPlan)
            .where(
                MealPlan.id == plan_id,
                MealPlan.user_id == current_user.id,
            )
            .options(
                selectinload(MealPlan.items).selectinload(MealPlanItem.recipe)
            )
        )
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    # Calculate daily totals
    daily_nutrition = {}
    for day in range(7):
        daily_nutrition[f"day_{day}"] = {
            "calories": 0,
            "protein_g": 0.0,
            "carbs_g": 0.0,
            "fat_g": 0.0,
        }

    for item in plan.items:
        recipe = item.recipe
        day_key = f"day_{item.day_of_week}"
        servings_multiplier = (item.servings or 1)

        if recipe.calories_per_serving:
            daily_nutrition[day_key]["calories"] += recipe.calories_per_serving * servings_multiplier
        if recipe.protein_g:
            daily_nutrition[day_key]["protein_g"] += recipe.protein_g * servings_multiplier
        if recipe.carbs_g:
            daily_nutrition[day_key]["carbs_g"] += recipe.carbs_g * servings_multiplier
        if recipe.fat_g:
            daily_nutrition[day_key]["fat_g"] += recipe.fat_g * servings_multiplier

    # Round floats
    for day_key in daily_nutrition:
        daily_nutrition[day_key]["protein_g"] = round(daily_nutrition[day_key]["protein_g"], 1)
        daily_nutrition[day_key]["carbs_g"] = round(daily_nutrition[day_key]["carbs_g"], 1)
        daily_nutrition[day_key]["fat_g"] = round(daily_nutrition[day_key]["fat_g"], 1)

    return daily_nutrition
