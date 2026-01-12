from uuid import UUID

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from sqlalchemy import select, func

from app.api.deps import DbSession, CurrentUser
from app.models.collection import Collection, recipe_collections
from app.models.recipe import Recipe
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionListResponse,
    CollectionWithRecipesResponse,
)
from app.services.image_service import ImageService

router = APIRouter()
image_service = ImageService()


def collection_to_response(
    collection: Collection,
    recipe_count: int = 0,
    recipe_ids: list[UUID] | None = None,
) -> CollectionResponse | CollectionWithRecipesResponse:
    """Convert Collection model to response."""
    base_response = {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "color": collection.color,
        "cover_image_url": image_service.get_url(collection.cover_image_path) if collection.cover_image_path else None,
        "recipe_count": recipe_count,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at,
    }

    if recipe_ids is not None:
        return CollectionWithRecipesResponse(**base_response, recipe_ids=recipe_ids)

    return CollectionResponse(**base_response)


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    data: CollectionCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new collection."""
    # Check if collection with same name exists
    result = await db.execute(
        select(Collection).where(
            Collection.user_id == current_user.id,
            Collection.name == data.name,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collection with this name already exists",
        )

    collection = Collection(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        color=data.color,
    )

    db.add(collection)
    await db.commit()
    await db.refresh(collection)

    return collection_to_response(collection, 0)


@router.get("", response_model=CollectionListResponse)
async def list_collections(
    current_user: CurrentUser,
    db: DbSession,
):
    """List all collections for the current user with recipe counts."""
    # Get collections with recipe counts using a subquery
    count_subquery = (
        select(
            recipe_collections.c.collection_id,
            func.count(recipe_collections.c.recipe_id).label("recipe_count"),
        )
        .select_from(recipe_collections)
        .join(Recipe, Recipe.id == recipe_collections.c.recipe_id)
        .where(Recipe.user_id == current_user.id)
        .group_by(recipe_collections.c.collection_id)
        .subquery()
    )

    result = await db.execute(
        select(Collection, func.coalesce(count_subquery.c.recipe_count, 0).label("recipe_count"))
        .outerjoin(count_subquery, Collection.id == count_subquery.c.collection_id)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.name)
    )

    collections = []
    for row in result:
        collection = row[0]
        recipe_count = row[1]
        collections.append(collection_to_response(collection, recipe_count))

    return CollectionListResponse(collections=collections)


@router.get("/{collection_id}", response_model=CollectionWithRecipesResponse)
async def get_collection(
    collection_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single collection by ID with recipe IDs."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    # Get recipe IDs in this collection
    recipes_result = await db.execute(
        select(recipe_collections.c.recipe_id)
        .where(recipe_collections.c.collection_id == collection_id)
    )
    recipe_ids = [row[0] for row in recipes_result]

    return collection_to_response(collection, len(recipe_ids), recipe_ids)


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: UUID,
    data: CollectionUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    # Check for duplicate name
    if data.name and data.name != collection.name:
        name_check = await db.execute(
            select(Collection).where(
                Collection.user_id == current_user.id,
                Collection.name == data.name,
            )
        )
        if name_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Collection with this name already exists",
            )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(collection, field, value)

    await db.commit()
    await db.refresh(collection)

    # Get recipe count
    count_result = await db.execute(
        select(func.count(recipe_collections.c.recipe_id))
        .where(recipe_collections.c.collection_id == collection_id)
    )
    recipe_count = count_result.scalar() or 0

    return collection_to_response(collection, recipe_count)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    # Delete cover image if exists
    if collection.cover_image_path:
        image_service.delete_image(collection.cover_image_path)

    await db.delete(collection)
    await db.commit()


@router.post("/{collection_id}/cover", response_model=CollectionResponse)
async def upload_cover_image(
    collection_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
):
    """Upload a cover image for a collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be JPEG, PNG, or WebP image",
        )

    # Delete old cover image if exists
    if collection.cover_image_path:
        image_service.delete_image(collection.cover_image_path)

    # Save new image
    image_path = await image_service.save_uploaded_file(file, "collections")
    collection.cover_image_path = image_path

    await db.commit()
    await db.refresh(collection)

    # Get recipe count
    count_result = await db.execute(
        select(func.count(recipe_collections.c.recipe_id))
        .where(recipe_collections.c.collection_id == collection_id)
    )
    recipe_count = count_result.scalar() or 0

    return collection_to_response(collection, recipe_count)


@router.delete("/{collection_id}/cover", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cover_image(
    collection_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete the cover image for a collection."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if collection.cover_image_path:
        image_service.delete_image(collection.cover_image_path)
        collection.cover_image_path = None
        await db.commit()


@router.post("/{collection_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_recipe_to_collection(
    collection_id: UUID,
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add a recipe to a collection."""
    # Verify collection exists and belongs to user
    coll_result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    if not coll_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
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

    # Check if already in collection
    existing = await db.execute(
        select(recipe_collections).where(
            recipe_collections.c.recipe_id == recipe_id,
            recipe_collections.c.collection_id == collection_id,
        )
    )
    if existing.first():
        return  # Already exists, no-op

    # Add to collection
    await db.execute(
        recipe_collections.insert().values(
            recipe_id=recipe_id,
            collection_id=collection_id,
        )
    )
    await db.commit()


@router.delete("/{collection_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_recipe_from_collection(
    collection_id: UUID,
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove a recipe from a collection."""
    # Verify collection exists and belongs to user
    coll_result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )
    if not coll_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    # Remove from collection
    await db.execute(
        recipe_collections.delete().where(
            recipe_collections.c.recipe_id == recipe_id,
            recipe_collections.c.collection_id == collection_id,
        )
    )
    await db.commit()
