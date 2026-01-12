from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class Ingredient(BaseModel):
    amount: str | None = None
    unit: str | None = None
    name: str


class NutritionInfo(BaseModel):
    calories_per_serving: int | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    nutrition_source: str | None = None


class RecipeImport(BaseModel):
    url: HttpUrl


class RecipeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    ingredients: list[Ingredient] = Field(..., min_length=1)
    instructions: list[str] | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    tags: list[str] | None = None
    language: str = Field(default="en", pattern="^(en|ro)$")
    nutrition: NutritionInfo | None = None


class RecipeUpdate(BaseModel):
    title_en: str | None = None
    title_ro: str | None = None
    description_en: str | None = None
    description_ro: str | None = None
    ingredients_en: list[Ingredient] | None = None
    ingredients_ro: list[Ingredient] | None = None
    instructions_en: list[str] | None = None
    instructions_ro: list[str] | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    tags: list[str] | None = None
    notes: str | None = None
    nutrition: NutritionInfo | None = None


class RecipeResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    ingredients: list[Ingredient]
    instructions: list[str]
    prep_time_minutes: int | None
    cook_time_minutes: int | None
    total_time_minutes: int | None
    servings: int | None
    image_url: str | None
    tags: list[str] | None
    source_url: str | None
    original_language: str
    is_favorite: bool = False
    is_shared: bool = False
    share_token: str | None = None
    notes: str | None = None
    rating: int | None = None
    nutrition: NutritionInfo | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecipeFullResponse(BaseModel):
    id: UUID
    title_en: str | None
    title_ro: str | None
    description_en: str | None
    description_ro: str | None
    ingredients_en: list[Ingredient] | None
    ingredients_ro: list[Ingredient] | None
    instructions_en: list[str] | None
    instructions_ro: list[str] | None
    prep_time_minutes: int | None
    cook_time_minutes: int | None
    total_time_minutes: int | None
    servings: int | None
    image_url: str | None
    tags: list[str] | None
    source_url: str | None
    original_language: str
    rating: int | None = None
    nutrition: NutritionInfo | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecipeListResponse(BaseModel):
    recipes: list[RecipeResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class RecipePreviewResponse(BaseModel):
    """Preview data from scraping a recipe URL before saving."""
    url: str
    extraction_method: str  # 'scraper', 'custom', 'ai'
    detected_language: str
    title: str | None = None
    description: str | None = None
    ingredients: list[Ingredient] = []
    instructions: list[str] = []
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    total_time_minutes: int | None = None
    servings: int | None = None
    image_url: str | None = None
    tags: list[str] = []
    nutrition: NutritionInfo | None = None


class RecipeConfirmImport(BaseModel):
    """User-confirmed recipe data to save after preview."""
    url: str
    language: str = Field(default="en", pattern="^(en|ro)$")
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    ingredients: list[Ingredient] = Field(..., min_length=1)
    instructions: list[str] = Field(default_factory=list)
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    image_url: str | None = None
    tags: list[str] = []
    nutrition: NutritionInfo | None = None


class RecipeShareResponse(BaseModel):
    """Response when sharing a recipe."""
    share_token: str
    share_url: str
    is_shared: bool
