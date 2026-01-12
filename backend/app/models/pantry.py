import uuid
from datetime import datetime, date
import enum

from sqlalchemy import String, Text, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class StorageLocation(str, enum.Enum):
    """Storage location enum - validated in Python, stored as string in DB."""
    FRIDGE = "fridge"
    FREEZER = "freezer"
    PANTRY = "pantry"
    COUNTER = "counter"
    OTHER = "other"


class PantryItem(Base):
    __tablename__ = "pantry_items"

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
    ingredient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Normalized name for matching (lowercase, stripped)
    ingredient_name_normalized: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True
    )
    amount: Mapped[str | None] = mapped_column(String(50), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pantry",
    )
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # For "low stock" alerts - minimum quantity before suggesting repurchase
    min_quantity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Track which store item was purchased from
    store_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
    )

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
    user: Mapped["User"] = relationship("User", lazy="raise")
    store: Mapped["Store"] = relationship("Store", lazy="raise")

    def __repr__(self) -> str:
        return f"<PantryItem {self.ingredient_name}>"
