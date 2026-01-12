import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, Boolean, Table, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

# Association table for recipe-category many-to-many
recipe_categories = Table(
    "recipe_categories",
    Base.metadata,
    Column("recipe_id", UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("families.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Source information
    original_language: Mapped[str] = mapped_column(String(2), nullable=False, default="en")
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # English content
    title_en: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingredients_en: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    instructions_en: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Romanian content
    title_ro: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description_ro: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingredients_ro: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    instructions_ro: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Metadata
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cook_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    original_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Sharing
    share_token: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    is_shared: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Rating (1-5 stars)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # User notes (personal cooking notes, modifications, etc.)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Nutrition (per serving)
    calories_per_serving: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    nutrition_source: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships - use lazy="raise" to prevent accidental lazy loading in async context
    user: Mapped["User"] = relationship("User", back_populates="recipes", lazy="raise")
    categories: Mapped[list["Category"]] = relationship(
        "Category",
        secondary=recipe_categories,
        back_populates="recipes",
        lazy="raise",
    )
    collections: Mapped[list["Collection"]] = relationship(
        "Collection",
        secondary="recipe_collections",
        back_populates="recipes",
        lazy="raise",
    )

    def __repr__(self) -> str:
        return f"<Recipe {self.title_en or self.title_ro}>"

    def get_title(self, lang: str = "en") -> str | None:
        return self.title_en if lang == "en" else self.title_ro

    def get_description(self, lang: str = "en") -> str | None:
        return self.description_en if lang == "en" else self.description_ro

    def get_ingredients(self, lang: str = "en") -> dict | None:
        return self.ingredients_en if lang == "en" else self.ingredients_ro

    def get_instructions(self, lang: str = "en") -> dict | None:
        return self.instructions_en if lang == "en" else self.instructions_ro
