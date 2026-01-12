from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class CollectionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class CollectionResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    color: str | None
    cover_image_url: str | None = None
    recipe_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CollectionListResponse(BaseModel):
    collections: list[CollectionResponse]


class CollectionWithRecipesResponse(CollectionResponse):
    recipe_ids: list[UUID] = []
