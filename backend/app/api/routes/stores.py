from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import Store, FamilyMember
from app.schemas.store import (
    StoreCreate,
    StoreUpdate,
    StoreResponse,
    StoreListResponse,
)

router = APIRouter()


def store_to_response(store: Store) -> StoreResponse:
    return StoreResponse(
        id=store.id,
        name=store.name,
        location=store.location,
        notes=store.notes,
        category_order=store.category_order,
        color=store.color,
        is_default=store.is_default,
        family_id=store.family_id,
        created_at=store.created_at,
        updated_at=store.updated_at,
    )


@router.get("", response_model=StoreListResponse)
async def list_stores(
    current_user: CurrentUser,
    db: DbSession,
):
    """List all stores for the current user and their families."""
    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query stores owned by user or shared with user's families
    if user_family_ids:
        query = select(Store).where(
            or_(
                Store.user_id == current_user.id,
                Store.family_id.in_(user_family_ids),
            )
        )
    else:
        query = select(Store).where(Store.user_id == current_user.id)

    query = query.order_by(Store.is_default.desc(), Store.name)
    result = await db.execute(query)
    stores = result.scalars().all()

    return StoreListResponse(stores=[store_to_response(s) for s in stores])


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single store by ID."""
    store = await _get_store_with_access(db, store_id, current_user.id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store_to_response(store)


@router.post("", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    data: StoreCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new store."""
    # If setting as default, unset other defaults
    if data.is_default:
        await _unset_default_stores(db, current_user.id)

    store = Store(
        user_id=current_user.id,
        name=data.name,
        location=data.location,
        notes=data.notes,
        category_order=data.category_order,
        color=data.color,
        is_default=data.is_default,
        family_id=data.family_id,
    )
    db.add(store)
    await db.commit()
    await db.refresh(store)

    return store_to_response(store)


@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: UUID,
    data: StoreUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a store."""
    store = await _get_store_with_access(db, store_id, current_user.id, owner_only=True)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # If setting as default, unset other defaults
    if data.is_default:
        await _unset_default_stores(db, current_user.id, exclude_id=store_id)

    if data.name is not None:
        store.name = data.name
    if data.location is not None:
        store.location = data.location
    if data.notes is not None:
        store.notes = data.notes
    if data.category_order is not None:
        store.category_order = data.category_order
    if data.color is not None:
        store.color = data.color
    if data.is_default is not None:
        store.is_default = data.is_default

    await db.commit()
    await db.refresh(store)

    return store_to_response(store)


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
    store_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a store."""
    store = await _get_store_with_access(db, store_id, current_user.id, owner_only=True)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    await db.delete(store)
    await db.commit()


@router.post("/{store_id}/set-default", response_model=StoreResponse)
async def set_default_store(
    store_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Set a store as the default."""
    store = await _get_store_with_access(db, store_id, current_user.id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # Unset other defaults
    await _unset_default_stores(db, current_user.id, exclude_id=store_id)

    store.is_default = True
    await db.commit()
    await db.refresh(store)

    return store_to_response(store)


async def _get_store_with_access(
    db: DbSession,
    store_id: UUID,
    user_id: UUID,
    owner_only: bool = False,
) -> Store | None:
    """Get a store if the user has access to it."""
    result = await db.execute(select(Store).where(Store.id == store_id))
    store = result.scalar_one_or_none()

    if not store:
        return None

    # Check ownership
    if store.user_id == user_id:
        return store

    if owner_only:
        return None

    # Check family membership
    if store.family_id:
        family_result = await db.execute(
            select(FamilyMember).where(
                FamilyMember.family_id == store.family_id,
                FamilyMember.user_id == user_id,
            )
        )
        if family_result.scalar_one_or_none():
            return store

    return None


async def _unset_default_stores(
    db: DbSession,
    user_id: UUID,
    exclude_id: UUID | None = None,
):
    """Unset is_default for all user's stores except the excluded one."""
    query = select(Store).where(Store.user_id == user_id, Store.is_default == True)
    if exclude_id:
        query = query.where(Store.id != exclude_id)

    result = await db.execute(query)
    stores = result.scalars().all()

    for store in stores:
        store.is_default = False
