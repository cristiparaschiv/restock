import re
from uuid import UUID
from collections import defaultdict

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models.shopping_list import ShoppingList, ShoppingListItem
from app.models.meal_plan import MealPlan, MealPlanItem
from app.schemas.shopping_list import (
    ShoppingListCreate,
    ShoppingListResponse,
    ShoppingListListResponse,
    ShoppingListItemResponse,
    ShoppingListItemCreate,
    ShoppingSuggestion,
    ShoppingSuggestionsResponse,
    SuggestionReason,
)

router = APIRouter()


# Common unit conversions
UNIT_CONVERSIONS = {
    # Volume
    'ml': {'l': 0.001, 'dl': 0.01},
    'l': {'ml': 1000, 'dl': 10},
    'dl': {'ml': 100, 'l': 0.1},
    'tsp': {'tbsp': 1/3, 'cup': 1/48},
    'tbsp': {'tsp': 3, 'cup': 1/16},
    'cup': {'tsp': 48, 'tbsp': 16},
    # Weight
    'g': {'kg': 0.001},
    'kg': {'g': 1000},
    'oz': {'lb': 1/16, 'g': 28.35},
    'lb': {'oz': 16, 'kg': 0.453592},
}

# Common ingredient categories (English + Romanian)
INGREDIENT_CATEGORIES = {
    'produce': [
        # English
        'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'potato', 'lettuce',
        'spinach', 'cucumber', 'celery', 'mushroom', 'broccoli', 'cabbage',
        'apple', 'banana', 'lemon', 'lime', 'orange', 'avocado', 'ginger',
        'herbs', 'parsley', 'cilantro', 'basil', 'mint', 'rosemary', 'thyme',
        'zucchini', 'eggplant', 'pumpkin', 'squash', 'bean', 'pea', 'corn',
        # Romanian
        'roșie', 'rosie', 'tomate', 'ceapă', 'ceapa', 'usturoi', 'ardei',
        'morcov', 'cartof', 'cartofi', 'salată', 'salata', 'verde',
        'spanac', 'castravete', 'castraveți', 'țelină', 'telina', 'ciuperci',
        'ciupercă', 'broccoli', 'varză', 'varza', 'măr', 'mar', 'mere',
        'banană', 'banana', 'lămâie', 'lamaie', 'lime', 'portocală', 'portocala',
        'avocado', 'ghimbir', 'verdeață', 'verdeata', 'pătrunjel', 'patrunjel',
        'coriandru', 'busuioc', 'mentă', 'menta', 'rozmarin', 'cimbru',
        'dovlecel', 'dovleac', 'vinete', 'fasole', 'mazăre', 'mazare', 'porumb',
    ],
    'dairy': [
        # English
        'milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'sour cream',
        'cottage cheese', 'mozzarella', 'parmesan', 'cheddar', 'feta',
        # Romanian
        'lapte', 'brânză', 'branza', 'cașcaval', 'cascaval', 'unt',
        'smântână', 'smantana', 'frișcă', 'frisca', 'iaurt', 'ou', 'ouă', 'oua',
        'telemea', 'ricotta', 'mascarpone',
    ],
    'meat': [
        # English
        'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage',
        'ham', 'ground', 'steak', 'breast', 'thigh', 'meat', 'veal',
        # Romanian
        'pui', 'carne', 'vită', 'vita', 'porc', 'miel', 'curcan',
        'bacon', 'slănină', 'slanina', 'cârnați', 'carnati', 'cârnat',
        'șuncă', 'sunca', 'jambon', 'tocată', 'tocata', 'mușchi', 'muschi',
        'piept', 'pulpă', 'pulpa', 'antricot', 'cotlet', 'vițel', 'vitel',
    ],
    'seafood': [
        # English
        'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'cod',
        'tilapia', 'mussels', 'clams', 'squid', 'octopus', 'anchovy',
        # Romanian
        'pește', 'peste', 'somon', 'ton', 'creveți', 'creveti', 'crab',
        'homar', 'cod', 'tilapia', 'midii', 'scoici', 'calmar', 'caracatiță',
        'caracatita', 'anșoa', 'ansoa', 'sardine', 'păstrăv', 'pastrav',
    ],
    'grains': [
        # English
        'rice', 'pasta', 'bread', 'flour', 'oat', 'cereal', 'noodle',
        'quinoa', 'couscous', 'tortilla', 'wheat', 'barley',
        # Romanian
        'orez', 'paste', 'pâine', 'paine', 'făină', 'faina', 'ovăz', 'ovaz',
        'cereale', 'tăiței', 'taitei', 'fidea', 'quinoa', 'cușcuș', 'cuscus',
        'tortilla', 'grâu', 'grau', 'orz', 'mălai', 'malai', 'griș', 'gris',
    ],
    'pantry': [
        # English
        'oil', 'vinegar', 'sauce', 'sugar', 'honey',
        'stock', 'broth', 'can', 'tomato paste', 'soy sauce', 'ketchup',
        'mayonnaise', 'mustard',
        # Romanian
        'ulei', 'oțet', 'otet', 'sos', 'zahăr', 'zahar', 'miere',
        'supă', 'supa', 'bulion', 'pastă', 'pasta', 'conservă', 'conserva',
        'ketchup', 'maioneză', 'maioneza', 'muștar', 'mustar',
    ],
    'spices': [
        # English
        'cumin', 'paprika', 'cinnamon', 'oregano', 'chili', 'curry',
        'turmeric', 'coriander', 'nutmeg', 'cayenne', 'salt', 'pepper',
        'bay leaf', 'clove', 'cardamom', 'saffron',
        # Romanian
        'chimion', 'boia', 'scorțișoară', 'scortisoara', 'oregano', 'chili',
        'curry', 'turmeric', 'coriandru', 'nucșoară', 'nucsoara', 'cayenne',
        'sare', 'piper', 'foi de dafin', 'dafin', 'cuișoare', 'cuisoare',
        'cardamom', 'șofran', 'sofran', 'condiment',
    ],
    'frozen': [
        # English
        'frozen', 'ice cream',
        # Romanian
        'congelat', 'înghețată', 'inghetata',
    ],
    'beverages': [
        # English
        'water', 'juice', 'wine', 'beer', 'coffee', 'tea', 'soda',
        # Romanian
        'apă', 'apa', 'suc', 'vin', 'bere', 'cafea', 'ceai', 'sifon',
    ],
}


def categorize_ingredient(name: str) -> str | None:
    """Categorize ingredient based on its name."""
    name_lower = name.lower()
    for category, keywords in INGREDIENT_CATEGORIES.items():
        for keyword in keywords:
            if keyword in name_lower:
                return category
    return None


def parse_amount(amount_str: str | None) -> float | None:
    """Parse amount string to float."""
    if not amount_str:
        return None

    # Handle fractions like "1/2", "1 1/2"
    amount_str = amount_str.strip()

    # Mixed number like "1 1/2"
    mixed_match = re.match(r'(\d+)\s+(\d+)/(\d+)', amount_str)
    if mixed_match:
        whole = float(mixed_match.group(1))
        num = float(mixed_match.group(2))
        denom = float(mixed_match.group(3))
        return whole + num / denom

    # Simple fraction like "1/2"
    frac_match = re.match(r'(\d+)/(\d+)', amount_str)
    if frac_match:
        return float(frac_match.group(1)) / float(frac_match.group(2))

    # Simple number
    try:
        return float(amount_str.replace(',', '.'))
    except ValueError:
        return None


def normalize_unit(unit: str | None) -> str | None:
    """Normalize unit names."""
    if not unit:
        return None

    unit = unit.lower().strip()

    # Common normalizations
    normalizations = {
        'tablespoon': 'tbsp',
        'tablespoons': 'tbsp',
        'teaspoon': 'tsp',
        'teaspoons': 'tsp',
        'cups': 'cup',
        'ounce': 'oz',
        'ounces': 'oz',
        'pound': 'lb',
        'pounds': 'lb',
        'gram': 'g',
        'grams': 'g',
        'kilogram': 'kg',
        'kilograms': 'kg',
        'liter': 'l',
        'liters': 'l',
        'milliliter': 'ml',
        'milliliters': 'ml',
        'deciliter': 'dl',
        'deciliters': 'dl',
        'piece': 'pc',
        'pieces': 'pc',
        'clove': 'clove',
        'cloves': 'clove',
    }

    return normalizations.get(unit, unit)


def aggregate_ingredients(
    ingredients: list[dict],
    lang: str = "en"
) -> list[dict]:
    """Aggregate ingredients by name, combining amounts where possible."""
    # Group by normalized ingredient name
    grouped: dict[str, list[dict]] = defaultdict(list)

    for ing in ingredients:
        # Normalize name for grouping
        name = ing.get('name', '').lower().strip()
        if not name:
            continue
        grouped[name].append(ing)

    result = []
    for name, items in grouped.items():
        # Try to combine amounts
        combined_amount = None
        combined_unit = None
        source_recipes = []

        # Collect source recipes
        for item in items:
            if item.get('source_recipe'):
                source_recipes.append(item['source_recipe'])

        # Check if all items have the same unit
        units = [normalize_unit(item.get('unit')) for item in items]
        unique_units = set(u for u in units if u)

        if len(unique_units) <= 1:
            # Same unit or no units - can combine
            total = 0
            has_amount = False
            for item in items:
                amount = parse_amount(item.get('amount'))
                if amount is not None:
                    total += amount
                    has_amount = True

            if has_amount:
                combined_amount = str(total) if total == int(total) else f"{total:.2f}"
            combined_unit = normalize_unit(items[0].get('unit'))
        else:
            # Different units - keep first item's format and note others
            combined_amount = items[0].get('amount')
            combined_unit = items[0].get('unit')

        # Use original case from first item
        original_name = items[0].get('name', name)

        result.append({
            'ingredient_name': original_name,
            'amount': combined_amount,
            'unit': combined_unit,
            'category': categorize_ingredient(original_name),
            'source_recipes': source_recipes if source_recipes else None,
        })

    # Sort by category, then by name
    def sort_key(item):
        cat = item.get('category') or 'zzz'
        return (cat, item['ingredient_name'].lower())

    return sorted(result, key=sort_key)


async def can_access_shopping_list(
    db: DbSession,
    list_id: UUID,
    user_id: UUID,
) -> ShoppingList | None:
    """Check if user can access a shopping list (owner or family member)."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == user_id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for list - owned by user OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(ShoppingList).where(
                ShoppingList.id == list_id,
                or_(
                    ShoppingList.user_id == user_id,
                    ShoppingList.family_id.in_(user_family_ids),
                ),
            )
        )
    else:
        result = await db.execute(
            select(ShoppingList).where(
                ShoppingList.id == list_id,
                ShoppingList.user_id == user_id,
            )
        )
    return result.scalar_one_or_none()


def shopping_list_to_response(shopping_list: ShoppingList) -> ShoppingListResponse:
    """Convert ShoppingList model to response."""
    return ShoppingListResponse(
        id=shopping_list.id,
        name=shopping_list.name,
        meal_plan_id=shopping_list.meal_plan_id,
        store_id=shopping_list.store_id,
        family_id=shopping_list.family_id,
        items=[
            ShoppingListItemResponse(
                id=item.id,
                ingredient_name=item.ingredient_name,
                amount=item.amount,
                unit=item.unit,
                is_checked=item.is_checked,
                category=item.category,
                source_recipes=item.source_recipes,
                created_at=item.created_at,
            )
            for item in shopping_list.items
        ],
        created_at=shopping_list.created_at,
        updated_at=shopping_list.updated_at,
    )


@router.get("", response_model=ShoppingListListResponse)
async def list_shopping_lists(
    current_user: CurrentUser,
    db: DbSession,
):
    """List all shopping lists for the current user and their families."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for lists - owned by user OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(ShoppingList)
            .where(
                or_(
                    ShoppingList.user_id == current_user.id,
                    ShoppingList.family_id.in_(user_family_ids),
                )
            )
            .options(selectinload(ShoppingList.items))
            .order_by(ShoppingList.created_at.desc())
        )
    else:
        result = await db.execute(
            select(ShoppingList)
            .where(ShoppingList.user_id == current_user.id)
            .options(selectinload(ShoppingList.items))
            .order_by(ShoppingList.created_at.desc())
        )
    lists = result.scalars().all()

    return ShoppingListListResponse(
        shopping_lists=[shopping_list_to_response(sl) for sl in lists]
    )


@router.get("/{list_id}", response_model=ShoppingListResponse)
async def get_shopping_list(
    list_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a shopping list by ID."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for list - owned by user OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(ShoppingList)
            .where(
                ShoppingList.id == list_id,
                or_(
                    ShoppingList.user_id == current_user.id,
                    ShoppingList.family_id.in_(user_family_ids),
                ),
            )
            .options(selectinload(ShoppingList.items))
        )
    else:
        result = await db.execute(
            select(ShoppingList)
            .where(
                ShoppingList.id == list_id,
                ShoppingList.user_id == current_user.id,
            )
            .options(selectinload(ShoppingList.items))
        )
    shopping_list = result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    return shopping_list_to_response(shopping_list)


@router.post("", response_model=ShoppingListResponse, status_code=status.HTTP_201_CREATED)
async def create_shopping_list(
    data: ShoppingListCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create an empty shopping list."""
    shopping_list = ShoppingList(
        user_id=current_user.id,
        name=data.name,
        meal_plan_id=data.meal_plan_id,
        store_id=data.store_id,
    )
    db.add(shopping_list)
    await db.commit()
    await db.refresh(shopping_list)

    # Return response directly for new list to avoid accessing unloaded items relationship
    return ShoppingListResponse(
        id=shopping_list.id,
        name=shopping_list.name,
        meal_plan_id=shopping_list.meal_plan_id,
        store_id=shopping_list.store_id,
        family_id=shopping_list.family_id,
        items=[],
        created_at=shopping_list.created_at,
        updated_at=shopping_list.updated_at,
    )


@router.post("/from-meal-plan/{plan_id}", response_model=ShoppingListResponse, status_code=status.HTTP_201_CREATED)
async def generate_from_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Generate a shopping list from a meal plan."""
    # Get meal plan with items and recipes
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
    meal_plan = result.scalar_one_or_none()

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    # Collect all ingredients from all recipes
    lang = current_user.preferred_language
    all_ingredients = []

    for item in meal_plan.items:
        recipe = item.recipe
        ingredients = recipe.get_ingredients(lang) or recipe.get_ingredients("en") or []
        recipe_title = recipe.get_title(lang) or recipe.get_title("en") or "Unknown"

        for ing in ingredients:
            if isinstance(ing, dict):
                ing_with_source = {
                    **ing,
                    'source_recipe': {
                        'recipe_id': str(recipe.id),
                        'recipe_title': recipe_title,
                    }
                }
                all_ingredients.append(ing_with_source)

    # Aggregate ingredients
    aggregated = aggregate_ingredients(all_ingredients, lang)

    # Create shopping list
    week_str = meal_plan.week_start.strftime("%b %d")
    shopping_list = ShoppingList(
        user_id=current_user.id,
        meal_plan_id=plan_id,
        name=f"Shopping List - Week of {week_str}",
    )
    db.add(shopping_list)
    await db.flush()

    # Create shopping list items
    for ing in aggregated:
        item = ShoppingListItem(
            shopping_list_id=shopping_list.id,
            ingredient_name=ing['ingredient_name'],
            amount=ing.get('amount'),
            unit=ing.get('unit'),
            category=ing.get('category'),
            source_recipes=ing.get('source_recipes'),
        )
        db.add(item)

    await db.commit()

    # Reload with items
    result = await db.execute(
        select(ShoppingList)
        .where(ShoppingList.id == shopping_list.id)
        .options(selectinload(ShoppingList.items))
    )
    shopping_list = result.scalar_one()

    return shopping_list_to_response(shopping_list)


@router.post("/{list_id}/items", response_model=ShoppingListItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    list_id: UUID,
    data: ShoppingListItemCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add an item to a shopping list."""
    # Verify list access (owner or family member)
    shopping_list = await can_access_shopping_list(db, list_id, current_user.id)

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    item = ShoppingListItem(
        shopping_list_id=list_id,
        ingredient_name=data.ingredient_name,
        amount=data.amount,
        unit=data.unit,
        category=data.category or categorize_ingredient(data.ingredient_name),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return ShoppingListItemResponse(
        id=item.id,
        ingredient_name=item.ingredient_name,
        amount=item.amount,
        unit=item.unit,
        is_checked=item.is_checked,
        category=item.category,
        source_recipes=item.source_recipes,
        created_at=item.created_at,
    )


@router.patch("/{list_id}/items/{item_id}/check")
async def toggle_item_check(
    list_id: UUID,
    item_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Toggle the checked status of a shopping list item."""
    # Verify list access (owner or family member)
    shopping_list = await can_access_shopping_list(db, list_id, current_user.id)

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    # Get and toggle item
    result = await db.execute(
        select(ShoppingListItem).where(
            ShoppingListItem.id == item_id,
            ShoppingListItem.shopping_list_id == list_id,
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    item.is_checked = not item.is_checked
    await db.commit()

    return {"is_checked": item.is_checked}


@router.delete("/{list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    list_id: UUID,
    item_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove an item from a shopping list."""
    # Verify list access (owner or family member)
    shopping_list = await can_access_shopping_list(db, list_id, current_user.id)

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    # Get item
    result = await db.execute(
        select(ShoppingListItem).where(
            ShoppingListItem.id == item_id,
            ShoppingListItem.shopping_list_id == list_id,
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    await db.delete(item)
    await db.commit()


@router.post("/{list_id}/clear-checked", status_code=status.HTTP_204_NO_CONTENT)
async def clear_checked_items(
    list_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove all checked items from a shopping list."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for list with items - owned by user OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(ShoppingList)
            .where(
                ShoppingList.id == list_id,
                or_(
                    ShoppingList.user_id == current_user.id,
                    ShoppingList.family_id.in_(user_family_ids),
                ),
            )
            .options(selectinload(ShoppingList.items))
        )
    else:
        result = await db.execute(
            select(ShoppingList)
            .where(
                ShoppingList.id == list_id,
                ShoppingList.user_id == current_user.id,
            )
            .options(selectinload(ShoppingList.items))
        )
    shopping_list = result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    # Delete checked items
    for item in shopping_list.items:
        if item.is_checked:
            await db.delete(item)

    await db.commit()


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopping_list(
    list_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a shopping list."""
    result = await db.execute(
        select(ShoppingList).where(
            ShoppingList.id == list_id,
            ShoppingList.user_id == current_user.id,
        )
    )
    shopping_list = result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    await db.delete(shopping_list)
    await db.commit()


@router.get("/suggestions/smart", response_model=ShoppingSuggestionsResponse)
async def get_shopping_suggestions(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get smart shopping suggestions based on meal plans, pantry inventory, and expiring items."""
    from datetime import date, timedelta
    from sqlalchemy import or_
    from app.models.pantry import PantryItem
    from app.models.family import FamilyMember

    suggestions: list[ShoppingSuggestion] = []
    seen_ingredients: set[str] = set()

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Get pantry items (user's or family's)
    if user_family_ids:
        pantry_result = await db.execute(
            select(PantryItem).where(
                or_(
                    PantryItem.user_id == current_user.id,
                    PantryItem.family_id.in_(user_family_ids),
                )
            )
        )
    else:
        pantry_result = await db.execute(
            select(PantryItem).where(PantryItem.user_id == current_user.id)
        )
    pantry_items = pantry_result.scalars().all()

    # Create a lookup by normalized ingredient name
    pantry_lookup: dict[str, PantryItem] = {}
    for item in pantry_items:
        pantry_lookup[item.ingredient_name_normalized] = item

    # 1. Get ingredients from current week's meal plan
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday of current week

    if user_family_ids:
        meal_plan_result = await db.execute(
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
        meal_plan_result = await db.execute(
            select(MealPlan)
            .where(
                MealPlan.week_start == week_start,
                MealPlan.user_id == current_user.id,
            )
            .options(
                selectinload(MealPlan.items).selectinload(MealPlanItem.recipe)
            )
        )
    meal_plan = meal_plan_result.scalar_one_or_none()

    if meal_plan:
        lang = current_user.preferred_language

        for plan_item in meal_plan.items:
            recipe = plan_item.recipe
            ingredients = recipe.get_ingredients(lang) or recipe.get_ingredients("en") or []
            recipe_title = recipe.get_title(lang) or recipe.get_title("en") or "Unknown"

            for ing in ingredients:
                if not isinstance(ing, dict):
                    continue

                ing_name = ing.get('name', '').strip()
                if not ing_name:
                    continue

                normalized = ing_name.lower()

                # Check if we already have this ingredient in suggestions
                if normalized in seen_ingredients:
                    continue

                # Check if ingredient is in pantry
                pantry_item = pantry_lookup.get(normalized)

                if not pantry_item:
                    # Not in pantry - add to suggestions
                    seen_ingredients.add(normalized)
                    suggestions.append(ShoppingSuggestion(
                        ingredient_name=ing_name,
                        amount=ing.get('amount'),
                        unit=ing.get('unit'),
                        category=categorize_ingredient(ing_name),
                        reason=SuggestionReason.MEAL_PLAN,
                        source_recipes=[recipe_title],
                        current_pantry_amount=None,
                        expiration_date=None,
                    ))

    # 2. Check for low stock items
    for item in pantry_items:
        if item.ingredient_name_normalized in seen_ingredients:
            continue

        if item.min_quantity:
            # Compare amounts
            current = parse_amount(item.amount)
            minimum = parse_amount(item.min_quantity)

            if current is not None and minimum is not None and current <= minimum:
                seen_ingredients.add(item.ingredient_name_normalized)
                suggestions.append(ShoppingSuggestion(
                    ingredient_name=item.ingredient_name,
                    amount=item.min_quantity,  # Suggest to buy up to min quantity
                    unit=item.unit,
                    category=item.category,
                    reason=SuggestionReason.LOW_STOCK,
                    source_recipes=None,
                    current_pantry_amount=item.amount,
                    expiration_date=None,
                ))

    # 3. Check for expiring items (within 7 days)
    expiration_threshold = today + timedelta(days=7)

    for item in pantry_items:
        if item.ingredient_name_normalized in seen_ingredients:
            continue

        if item.expiration_date and item.expiration_date <= expiration_threshold:
            seen_ingredients.add(item.ingredient_name_normalized)
            suggestions.append(ShoppingSuggestion(
                ingredient_name=item.ingredient_name,
                amount=item.amount,
                unit=item.unit,
                category=item.category,
                reason=SuggestionReason.EXPIRING_SOON,
                source_recipes=None,
                current_pantry_amount=item.amount,
                expiration_date=item.expiration_date.isoformat() if item.expiration_date else None,
            ))

    return ShoppingSuggestionsResponse(suggestions=suggestions)
