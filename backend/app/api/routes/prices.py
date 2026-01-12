from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import PriceHistory, FamilyMember, Store
from app.schemas.price_history import (
    PriceHistoryCreate,
    PriceHistoryResponse,
    PriceHistoryListResponse,
    PriceTrendResponse,
    IngredientPricesResponse,
)

router = APIRouter()


def normalize_ingredient_name(name: str) -> str:
    """Normalize ingredient name for consistent tracking."""
    return name.strip().lower()


def price_history_to_response(item: PriceHistory, store_name: str | None = None) -> PriceHistoryResponse:
    """Convert PriceHistory model to response."""
    return PriceHistoryResponse(
        id=item.id,
        ingredient_name=item.ingredient_name,
        price=item.price,
        currency=item.currency,
        amount=item.amount,
        unit=item.unit,
        store_id=item.store_id,
        store_name=store_name,
        recorded_date=item.recorded_date,
        notes=item.notes,
        created_at=item.created_at,
    )


@router.get("", response_model=PriceHistoryListResponse)
async def list_price_history(
    current_user: CurrentUser,
    db: DbSession,
    ingredient_name: str | None = None,
    store_id: UUID | None = None,
    limit: int = Query(100, le=500),
):
    """List price history entries."""
    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query prices
    if user_family_ids:
        query = select(PriceHistory).where(
            or_(
                PriceHistory.user_id == current_user.id,
                PriceHistory.family_id.in_(user_family_ids),
            )
        )
    else:
        query = select(PriceHistory).where(PriceHistory.user_id == current_user.id)

    # Apply filters
    if ingredient_name:
        normalized = normalize_ingredient_name(ingredient_name)
        query = query.where(PriceHistory.ingredient_name_normalized == normalized)
    if store_id:
        query = query.where(PriceHistory.store_id == store_id)

    query = query.order_by(PriceHistory.recorded_date.desc()).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    # Get store names
    store_ids = {item.store_id for item in items if item.store_id}
    store_names = {}
    if store_ids:
        store_result = await db.execute(
            select(Store).where(Store.id.in_(store_ids))
        )
        stores = store_result.scalars().all()
        store_names = {s.id: s.name for s in stores}

    return PriceHistoryListResponse(
        history=[
            price_history_to_response(item, store_names.get(item.store_id))
            for item in items
        ]
    )


@router.get("/ingredient/{ingredient_name}", response_model=PriceHistoryListResponse)
async def get_ingredient_price_history(
    ingredient_name: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get price history for a specific ingredient."""
    normalized = normalize_ingredient_name(ingredient_name)

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query prices
    if user_family_ids:
        query = select(PriceHistory).where(
            or_(
                PriceHistory.user_id == current_user.id,
                PriceHistory.family_id.in_(user_family_ids),
            ),
            PriceHistory.ingredient_name_normalized == normalized,
        )
    else:
        query = select(PriceHistory).where(
            PriceHistory.user_id == current_user.id,
            PriceHistory.ingredient_name_normalized == normalized,
        )

    query = query.order_by(PriceHistory.recorded_date.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    # Get store names
    store_ids = {item.store_id for item in items if item.store_id}
    store_names = {}
    if store_ids:
        store_result = await db.execute(
            select(Store).where(Store.id.in_(store_ids))
        )
        stores = store_result.scalars().all()
        store_names = {s.id: s.name for s in stores}

    return PriceHistoryListResponse(
        history=[
            price_history_to_response(item, store_names.get(item.store_id))
            for item in items
        ]
    )


@router.get("/trends", response_model=IngredientPricesResponse)
async def get_price_trends(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get price trends for all tracked ingredients."""
    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Get all unique ingredients
    if user_family_ids:
        query = select(PriceHistory.ingredient_name_normalized, PriceHistory.ingredient_name).where(
            or_(
                PriceHistory.user_id == current_user.id,
                PriceHistory.family_id.in_(user_family_ids),
            )
        ).distinct()
    else:
        query = select(PriceHistory.ingredient_name_normalized, PriceHistory.ingredient_name).where(
            PriceHistory.user_id == current_user.id
        ).distinct()

    result = await db.execute(query)
    ingredients = result.all()

    # Get trends for each ingredient
    trends = []
    for normalized, display_name in ingredients:
        trend = await _calculate_trend(db, current_user.id, user_family_ids, normalized, display_name)
        if trend:
            trends.append(trend)

    # Sort by ingredient name
    trends.sort(key=lambda t: t.ingredient_name.lower())

    return IngredientPricesResponse(ingredients=trends)


async def _calculate_trend(
    db: DbSession,
    user_id: UUID,
    user_family_ids: list[UUID],
    normalized_name: str,
    display_name: str,
) -> PriceTrendResponse | None:
    """Calculate price trend for an ingredient."""
    if user_family_ids:
        query = select(PriceHistory).where(
            or_(
                PriceHistory.user_id == user_id,
                PriceHistory.family_id.in_(user_family_ids),
            ),
            PriceHistory.ingredient_name_normalized == normalized_name,
        ).order_by(PriceHistory.recorded_date.desc())
    else:
        query = select(PriceHistory).where(
            PriceHistory.user_id == user_id,
            PriceHistory.ingredient_name_normalized == normalized_name,
        ).order_by(PriceHistory.recorded_date.desc())

    result = await db.execute(query)
    items = result.scalars().all()

    if not items:
        return None

    prices = [item.price for item in items]
    current_price = prices[0] if prices else None
    average_price = sum(prices) / len(prices)
    min_price = min(prices)
    max_price = max(prices)

    # Calculate price change percent (current vs previous)
    price_change_percent = None
    if len(prices) >= 2:
        prev_price = prices[1]
        if prev_price > 0:
            price_change_percent = float((current_price - prev_price) / prev_price * 100)

    # Get store names for history
    store_ids = {item.store_id for item in items if item.store_id}
    store_names = {}
    if store_ids:
        store_result = await db.execute(
            select(Store).where(Store.id.in_(store_ids))
        )
        stores = store_result.scalars().all()
        store_names = {s.id: s.name for s in stores}

    return PriceTrendResponse(
        ingredient_name=display_name,
        current_price=current_price,
        average_price=Decimal(str(round(average_price, 2))),
        min_price=min_price,
        max_price=max_price,
        price_change_percent=round(price_change_percent, 1) if price_change_percent else None,
        history=[
            price_history_to_response(item, store_names.get(item.store_id))
            for item in items[:10]  # Limit history to last 10
        ],
    )


@router.post("", response_model=PriceHistoryResponse, status_code=status.HTTP_201_CREATED)
async def record_price(
    data: PriceHistoryCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Record a price for an ingredient."""
    # Get store name if provided
    store_name = None
    if data.store_id:
        store_result = await db.execute(
            select(Store).where(Store.id == data.store_id)
        )
        store = store_result.scalar_one_or_none()
        if store:
            store_name = store.name

    item = PriceHistory(
        user_id=current_user.id,
        ingredient_name=data.ingredient_name,
        ingredient_name_normalized=normalize_ingredient_name(data.ingredient_name),
        price=data.price,
        currency=data.currency,
        amount=data.amount,
        unit=data.unit,
        store_id=data.store_id,
        recorded_date=data.recorded_date or date.today(),
        notes=data.notes,
        family_id=data.family_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return price_history_to_response(item, store_name)


@router.delete("/{price_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_price_entry(
    price_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a price history entry."""
    result = await db.execute(
        select(PriceHistory).where(PriceHistory.id == price_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Price entry not found")

    # Check ownership
    if item.user_id != current_user.id:
        # Check family membership
        if item.family_id:
            family_result = await db.execute(
                select(FamilyMember).where(
                    FamilyMember.family_id == item.family_id,
                    FamilyMember.user_id == current_user.id,
                )
            )
            if not family_result.scalar_one_or_none():
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(item)
    await db.commit()
