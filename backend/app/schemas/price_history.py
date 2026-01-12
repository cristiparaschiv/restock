from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel


class PriceHistoryCreate(BaseModel):
    ingredient_name: str
    price: Decimal
    currency: str = "USD"
    amount: str | None = None
    unit: str | None = None
    store_id: UUID | None = None
    recorded_date: date | None = None
    notes: str | None = None
    family_id: UUID | None = None


class PriceHistoryResponse(BaseModel):
    id: UUID
    ingredient_name: str
    price: Decimal
    currency: str
    amount: str | None
    unit: str | None
    store_id: UUID | None
    store_name: str | None  # Joined from store
    recorded_date: date
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class PriceHistoryListResponse(BaseModel):
    history: list[PriceHistoryResponse]


class PriceTrendResponse(BaseModel):
    ingredient_name: str
    current_price: Decimal | None
    average_price: Decimal
    min_price: Decimal
    max_price: Decimal
    price_change_percent: float | None  # vs last recorded
    history: list[PriceHistoryResponse]


class IngredientPricesResponse(BaseModel):
    ingredients: list[PriceTrendResponse]
