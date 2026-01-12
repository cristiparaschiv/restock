from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class SourceRecipe(BaseModel):
    recipe_id: str
    recipe_title: str


class ShoppingListItemCreate(BaseModel):
    ingredient_name: str
    amount: str | None = None
    unit: str | None = None
    category: str | None = None


class ShoppingListItemResponse(BaseModel):
    id: UUID
    ingredient_name: str
    amount: str | None
    unit: str | None
    is_checked: bool
    category: str | None
    source_recipes: list[SourceRecipe] | None
    created_at: datetime

    class Config:
        from_attributes = True


class ShoppingListCreate(BaseModel):
    name: str | None = None
    meal_plan_id: UUID | None = None
    store_id: UUID | None = None


class ShoppingListResponse(BaseModel):
    id: UUID
    name: str | None
    meal_plan_id: UUID | None
    store_id: UUID | None
    family_id: UUID | None
    items: list[ShoppingListItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShoppingListListResponse(BaseModel):
    shopping_lists: list[ShoppingListResponse]


class SuggestionReason(str, Enum):
    MEAL_PLAN = "meal_plan"
    LOW_STOCK = "low_stock"
    EXPIRING_SOON = "expiring_soon"


class ShoppingSuggestion(BaseModel):
    ingredient_name: str
    amount: str | None
    unit: str | None
    category: str | None
    reason: SuggestionReason
    source_recipes: list[str] | None
    current_pantry_amount: str | None
    expiration_date: str | None


class ShoppingSuggestionsResponse(BaseModel):
    suggestions: list[ShoppingSuggestion]
