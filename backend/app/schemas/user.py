from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    preferred_language: str = Field(default="en", pattern="^(en|ro)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPreferences(BaseModel):
    category_order: list[str] | None = None
    unit_system: str | None = None  # 'metric' or 'imperial'


class UserResponse(BaseModel):
    id: UUID
    email: str
    preferred_language: str
    preferences: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: str
    type: str
    exp: datetime
