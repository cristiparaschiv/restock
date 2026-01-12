from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import PantryItem, FamilyMember, ShoppingListItem, ShoppingList
from app.schemas.pantry import (
    PantryItemCreate,
    PantryItemUpdate,
    PantryItemResponse,
    PantryItemListResponse,
    ExpiringItemsResponse,
    AddFromShoppingListRequest,
    StorageLocation,
)
# Import categorize_ingredient from shopping_lists
from app.api.routes.shopping_lists import categorize_ingredient

router = APIRouter()


def normalize_ingredient_name(name: str) -> str:
    """Normalize ingredient name for matching."""
    return name.strip().lower()


def pantry_item_to_response(item: PantryItem) -> PantryItemResponse:
    """Convert PantryItem model to response."""
    days_until_expiration = None
    is_expiring_soon = False

    if item.expiration_date:
        delta = item.expiration_date - date.today()
        days_until_expiration = delta.days
        is_expiring_soon = days_until_expiration <= 7 and days_until_expiration >= 0

    return PantryItemResponse(
        id=item.id,
        ingredient_name=item.ingredient_name,
        amount=item.amount,
        unit=item.unit,
        category=item.category,
        location=StorageLocation(item.location),
        expiration_date=item.expiration_date,
        purchase_date=item.purchase_date,
        notes=item.notes,
        min_quantity=item.min_quantity,
        store_id=item.store_id,
        family_id=item.family_id,
        days_until_expiration=days_until_expiration,
        is_expiring_soon=is_expiring_soon,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=PantryItemListResponse)
async def list_pantry_items(
    current_user: CurrentUser,
    db: DbSession,
    location: StorageLocation | None = None,
    category: str | None = None,
    search: str | None = None,
):
    """List all pantry items for the current user and their families."""
    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query items owned by user or shared with user's families
    if user_family_ids:
        query = select(PantryItem).where(
            or_(
                PantryItem.user_id == current_user.id,
                PantryItem.family_id.in_(user_family_ids),
            )
        )
    else:
        query = select(PantryItem).where(PantryItem.user_id == current_user.id)

    # Apply filters
    if location:
        query = query.where(PantryItem.location == location.value)
    if category:
        query = query.where(PantryItem.category == category)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(PantryItem.ingredient_name_normalized.ilike(search_term))

    query = query.order_by(PantryItem.expiration_date.asc().nulls_last(), PantryItem.ingredient_name)
    result = await db.execute(query)
    items = result.scalars().all()

    # Count expiring soon
    expiring_soon_count = sum(
        1 for item in items
        if item.expiration_date and 0 <= (item.expiration_date - date.today()).days <= 7
    )

    return PantryItemListResponse(
        items=[pantry_item_to_response(i) for i in items],
        expiring_soon_count=expiring_soon_count,
        total_count=len(items),
    )


@router.get("/expiring", response_model=ExpiringItemsResponse)
async def get_expiring_items(
    current_user: CurrentUser,
    db: DbSession,
    days: int = Query(7, ge=1, le=30),
):
    """Get items expiring within specified days."""
    cutoff_date = date.today() + timedelta(days=days)

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query items
    if user_family_ids:
        query = select(PantryItem).where(
            or_(
                PantryItem.user_id == current_user.id,
                PantryItem.family_id.in_(user_family_ids),
            ),
            PantryItem.expiration_date != None,
            PantryItem.expiration_date <= cutoff_date,
            PantryItem.expiration_date >= date.today(),
        )
    else:
        query = select(PantryItem).where(
            PantryItem.user_id == current_user.id,
            PantryItem.expiration_date != None,
            PantryItem.expiration_date <= cutoff_date,
            PantryItem.expiration_date >= date.today(),
        )

    query = query.order_by(PantryItem.expiration_date.asc())
    result = await db.execute(query)
    items = result.scalars().all()

    return ExpiringItemsResponse(items=[pantry_item_to_response(i) for i in items])


@router.get("/search", response_model=PantryItemListResponse)
async def search_pantry_items(
    current_user: CurrentUser,
    db: DbSession,
    q: str = Query(..., min_length=1),
):
    """Search pantry items by name."""
    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    search_term = f"%{q.lower()}%"

    # Query items
    if user_family_ids:
        query = select(PantryItem).where(
            or_(
                PantryItem.user_id == current_user.id,
                PantryItem.family_id.in_(user_family_ids),
            ),
            PantryItem.ingredient_name_normalized.ilike(search_term),
        )
    else:
        query = select(PantryItem).where(
            PantryItem.user_id == current_user.id,
            PantryItem.ingredient_name_normalized.ilike(search_term),
        )

    query = query.order_by(PantryItem.ingredient_name)
    result = await db.execute(query)
    items = result.scalars().all()

    expiring_soon_count = sum(
        1 for item in items
        if item.expiration_date and 0 <= (item.expiration_date - date.today()).days <= 7
    )

    return PantryItemListResponse(
        items=[pantry_item_to_response(i) for i in items],
        expiring_soon_count=expiring_soon_count,
        total_count=len(items),
    )


@router.get("/{item_id}", response_model=PantryItemResponse)
async def get_pantry_item(
    item_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single pantry item by ID."""
    item = await _get_item_with_access(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    return pantry_item_to_response(item)


@router.post("", response_model=PantryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_pantry_item(
    data: PantryItemCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add a new item to the pantry."""
    item = PantryItem(
        user_id=current_user.id,
        ingredient_name=data.ingredient_name,
        ingredient_name_normalized=normalize_ingredient_name(data.ingredient_name),
        amount=data.amount,
        unit=data.unit,
        category=data.category or categorize_ingredient(data.ingredient_name),
        location=data.location.value,
        expiration_date=data.expiration_date,
        purchase_date=data.purchase_date or date.today(),
        notes=data.notes,
        min_quantity=data.min_quantity,
        store_id=data.store_id,
        family_id=data.family_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return pantry_item_to_response(item)


@router.post("/from-shopping-item", response_model=PantryItemResponse, status_code=status.HTTP_201_CREATED)
async def add_from_shopping_item(
    data: AddFromShoppingListRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add a pantry item from a shopping list item."""
    # Get the shopping list item
    result = await db.execute(
        select(ShoppingListItem)
        .options(selectinload(ShoppingListItem.shopping_list))
        .where(ShoppingListItem.id == data.shopping_list_item_id)
    )
    shopping_item = result.scalar_one_or_none()

    if not shopping_item:
        raise HTTPException(status_code=404, detail="Shopping list item not found")

    # Verify access to the shopping list
    shopping_list = shopping_item.shopping_list
    has_access = shopping_list.user_id == current_user.id

    if not has_access and shopping_list.family_id:
        family_result = await db.execute(
            select(FamilyMember).where(
                FamilyMember.family_id == shopping_list.family_id,
                FamilyMember.user_id == current_user.id,
            )
        )
        has_access = family_result.scalar_one_or_none() is not None

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    # Create pantry item from shopping item
    item = PantryItem(
        user_id=current_user.id,
        ingredient_name=shopping_item.ingredient_name,
        ingredient_name_normalized=normalize_ingredient_name(shopping_item.ingredient_name),
        amount=shopping_item.amount,
        unit=shopping_item.unit,
        category=shopping_item.category or categorize_ingredient(shopping_item.ingredient_name),
        location=data.location.value,
        expiration_date=data.expiration_date,
        purchase_date=date.today(),
        notes=data.notes,
        store_id=shopping_list.store_id,
        family_id=shopping_list.family_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return pantry_item_to_response(item)


@router.put("/{item_id}", response_model=PantryItemResponse)
async def update_pantry_item(
    item_id: UUID,
    data: PantryItemUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a pantry item."""
    item = await _get_item_with_access(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Pantry item not found")

    if data.ingredient_name is not None:
        item.ingredient_name = data.ingredient_name
        item.ingredient_name_normalized = normalize_ingredient_name(data.ingredient_name)
    if data.amount is not None:
        item.amount = data.amount
    if data.unit is not None:
        item.unit = data.unit
    if data.category is not None:
        item.category = data.category
    if data.location is not None:
        item.location = data.location.value
    if data.expiration_date is not None:
        item.expiration_date = data.expiration_date
    if data.purchase_date is not None:
        item.purchase_date = data.purchase_date
    if data.notes is not None:
        item.notes = data.notes
    if data.min_quantity is not None:
        item.min_quantity = data.min_quantity
    if data.store_id is not None:
        item.store_id = data.store_id

    await db.commit()
    await db.refresh(item)

    return pantry_item_to_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pantry_item(
    item_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a pantry item."""
    item = await _get_item_with_access(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Pantry item not found")

    await db.delete(item)
    await db.commit()


async def _get_item_with_access(
    db: DbSession,
    item_id: UUID,
    user_id: UUID,
) -> PantryItem | None:
    """Get a pantry item if the user has access to it."""
    result = await db.execute(select(PantryItem).where(PantryItem.id == item_id))
    item = result.scalar_one_or_none()

    if not item:
        return None

    # Check ownership
    if item.user_id == user_id:
        return item

    # Check family membership
    if item.family_id:
        family_result = await db.execute(
            select(FamilyMember).where(
                FamilyMember.family_id == item.family_id,
                FamilyMember.user_id == user_id,
            )
        )
        if family_result.scalar_one_or_none():
            return item

    return None
