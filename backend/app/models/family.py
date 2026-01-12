import uuid
import secrets
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


def generate_invite_code() -> str:
    """Generate a random invite code."""
    return secrets.token_urlsafe(8)


class Family(Base):
    __tablename__ = "families"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    invite_code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
        default=generate_invite_code,
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
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by], lazy="raise")
    members: Mapped[list["FamilyMember"]] = relationship(
        "FamilyMember",
        back_populates="family",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    invites: Mapped[list["FamilyInvite"]] = relationship(
        "FamilyInvite",
        back_populates="family",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    def __repr__(self) -> str:
        return f"<Family {self.name}>"


class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("families.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")  # owner, admin, member
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Unique constraint: user can only be in a family once
    __table_args__ = (
        UniqueConstraint('family_id', 'user_id', name='uq_family_member'),
    )

    # Relationships - use lazy="raise" to prevent accidental lazy loading in async context
    family: Mapped["Family"] = relationship("Family", back_populates="members", lazy="raise")
    user: Mapped["User"] = relationship("User", back_populates="family_memberships", lazy="raise")

    def __repr__(self) -> str:
        return f"<FamilyMember {self.user_id} in {self.family_id}>"


class FamilyInvite(Base):
    __tablename__ = "family_invites"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("families.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending, accepted, declined
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships - use lazy="raise" to prevent accidental lazy loading in async context
    family: Mapped["Family"] = relationship("Family", back_populates="invites", lazy="raise")
    inviter: Mapped["User"] = relationship("User", foreign_keys=[invited_by], lazy="raise")

    def __repr__(self) -> str:
        return f"<FamilyInvite {self.email} to {self.family_id}>"
