from datetime import date, datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.recipe import RecipeResponse


class MealPlanItemCreate(BaseModel):
    recipe_id: UUID
    day_of_week: int = Field(..., ge=0, le=6)
    meal_type: Literal['breakfast', 'lunch', 'dinner', 'snack']
    servings: int = Field(default=1, ge=1)
    notes: str | None = None


class MealPlanItemUpdate(BaseModel):
    day_of_week: int | None = Field(None, ge=0, le=6)
    meal_type: Literal['breakfast', 'lunch', 'dinner', 'snack'] | None = None
    servings: int | None = Field(None, ge=1)
    notes: str | None = None


class MealPlanItemResponse(BaseModel):
    id: UUID
    recipe_id: UUID
    recipe: RecipeResponse
    day_of_week: int
    meal_type: str
    servings: int
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class MealPlanCreate(BaseModel):
    week_start: date


class MealPlanResponse(BaseModel):
    id: UUID
    week_start: date
    items: list[MealPlanItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
