from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr


class FamilyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class FamilyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)


class FamilyMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class FamilyResponse(BaseModel):
    id: UUID
    name: str
    invite_code: str
    created_by: UUID
    member_count: int = 0
    members: list[FamilyMemberResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FamilyListResponse(BaseModel):
    families: list[FamilyResponse]


class FamilyInviteCreate(BaseModel):
    email: EmailStr


class FamilyInviteResponse(BaseModel):
    id: UUID
    family_id: UUID
    family_name: str
    email: str
    invited_by: UUID
    inviter_email: str
    status: str
    created_at: datetime
    expires_at: datetime | None

    class Config:
        from_attributes = True


class PendingInvitesResponse(BaseModel):
    invites: list[FamilyInviteResponse]


class JoinFamilyResponse(BaseModel):
    family: FamilyResponse
    message: str
