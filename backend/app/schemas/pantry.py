from datetime import datetime, date
from uuid import UUID
from enum import Enum

from pydantic import BaseModel


class StorageLocation(str, Enum):
    FRIDGE = "fridge"
    FREEZER = "freezer"
    PANTRY = "pantry"
    COUNTER = "counter"
    OTHER = "other"


class PantryItemCreate(BaseModel):
    ingredient_name: str
    amount: str | None = None
    unit: str | None = None
    category: str | None = None
    location: StorageLocation = StorageLocation.PANTRY
    expiration_date: date | None = None
    purchase_date: date | None = None
    notes: str | None = None
    min_quantity: str | None = None
    store_id: UUID | None = None
    family_id: UUID | None = None


class PantryItemUpdate(BaseModel):
    ingredient_name: str | None = None
    amount: str | None = None
    unit: str | None = None
    category: str | None = None
    location: StorageLocation | None = None
    expiration_date: date | None = None
    purchase_date: date | None = None
    notes: str | None = None
    min_quantity: str | None = None
    store_id: UUID | None = None


class PantryItemResponse(BaseModel):
    id: UUID
    ingredient_name: str
    amount: str | None
    unit: str | None
    category: str | None
    location: StorageLocation
    expiration_date: date | None
    purchase_date: date | None
    notes: str | None
    min_quantity: str | None
    store_id: UUID | None
    family_id: UUID | None
    days_until_expiration: int | None  # Computed field
    is_expiring_soon: bool  # True if expires within 7 days
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PantryItemListResponse(BaseModel):
    items: list[PantryItemResponse]
    expiring_soon_count: int
    total_count: int


class ExpiringItemsResponse(BaseModel):
    items: list[PantryItemResponse]


class AddFromShoppingListRequest(BaseModel):
    shopping_list_item_id: UUID
    expiration_date: date | None = None
    location: StorageLocation = StorageLocation.PANTRY
    notes: str | None = None
