from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class StoreCreate(BaseModel):
    name: str
    location: str | None = None
    notes: str | None = None
    category_order: list[str] | None = None
    color: str | None = None
    is_default: bool = False
    family_id: UUID | None = None


class StoreUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    notes: str | None = None
    category_order: list[str] | None = None
    color: str | None = None
    is_default: bool | None = None


class StoreResponse(BaseModel):
    id: UUID
    name: str
    location: str | None
    notes: str | None
    category_order: list[str] | None
    color: str | None
    is_default: bool
    family_id: UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StoreListResponse(BaseModel):
    stores: list[StoreResponse]
