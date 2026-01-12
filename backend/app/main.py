from contextlib import asynccontextmanager
import json
from uuid import UUID

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.routes import api_router
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.shopping_list import ShoppingList, ShoppingListItem
from app.models.family import FamilyMember
from app.websocket import manager
from app.api.routes.shopping_lists import categorize_ingredient


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS - Allow configured origins plus common dev origins and browser extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["http://127.0.0.1:3000", "http://0.0.0.0:3000"],
    allow_origin_regex=r"^(chrome-extension|moz-extension|http://localhost|http://127\.0\.0\.1).*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API routes
app.include_router(api_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


async def get_user_from_token(token: str) -> User | None:
    """Validate JWT token and return user."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            return None
    except JWTError:
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        return result.scalar_one_or_none()


async def can_access_list(user_id: UUID, list_id: UUID) -> bool:
    """Check if user can access a shopping list (owner or family member)."""
    async with AsyncSessionLocal() as db:
        # Get the shopping list
        result = await db.execute(
            select(ShoppingList).where(ShoppingList.id == list_id)
        )
        shopping_list = result.scalar_one_or_none()

        if not shopping_list:
            return False

        # Owner can access
        if shopping_list.user_id == user_id:
            return True

        # Family member can access if list is shared with family
        if shopping_list.family_id:
            result = await db.execute(
                select(FamilyMember).where(
                    FamilyMember.family_id == shopping_list.family_id,
                    FamilyMember.user_id == user_id,
                )
            )
            if result.scalar_one_or_none():
                return True

        return False


@app.websocket("/ws/shopping-lists/{list_id}")
async def websocket_shopping_list(
    websocket: WebSocket,
    list_id: str,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time shopping list sync."""
    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Verify access to list
    try:
        list_uuid = UUID(list_id)
    except ValueError:
        await websocket.close(code=4002, reason="Invalid list ID")
        return

    if not await can_access_list(user.id, list_uuid):
        await websocket.close(code=4003, reason="Access denied")
        return

    # Connect
    await manager.connect(websocket, list_id, str(user.id), user.email)

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            async with AsyncSessionLocal() as db:
                if message_type == "item_toggle":
                    # Toggle item check status
                    item_id = data.get("item_id")
                    if item_id:
                        result = await db.execute(
                            select(ShoppingListItem).where(
                                ShoppingListItem.id == UUID(item_id),
                                ShoppingListItem.shopping_list_id == list_uuid,
                            )
                        )
                        item = result.scalar_one_or_none()
                        if item:
                            item.is_checked = not item.is_checked
                            await db.commit()

                            # Broadcast to all connected users
                            await manager.broadcast(
                                list_id,
                                {
                                    "type": "item_toggled",
                                    "item_id": item_id,
                                    "is_checked": item.is_checked,
                                    "user_id": str(user.id),
                                    "user_email": user.email,
                                },
                            )

                elif message_type == "item_add":
                    # Add new item
                    ingredient_name = data.get("ingredient_name")
                    if ingredient_name:
                        item = ShoppingListItem(
                            shopping_list_id=list_uuid,
                            ingredient_name=ingredient_name,
                            amount=data.get("amount"),
                            unit=data.get("unit"),
                            category=data.get("category") or categorize_ingredient(ingredient_name),
                        )
                        db.add(item)
                        await db.commit()
                        await db.refresh(item)

                        # Broadcast to all connected users
                        await manager.broadcast(
                            list_id,
                            {
                                "type": "item_added",
                                "item": {
                                    "id": str(item.id),
                                    "ingredient_name": item.ingredient_name,
                                    "amount": item.amount,
                                    "unit": item.unit,
                                    "is_checked": item.is_checked,
                                    "category": item.category,
                                    "source_recipes": None,
                                },
                                "user_id": str(user.id),
                                "user_email": user.email,
                            },
                        )

                elif message_type == "item_remove":
                    # Remove item
                    item_id = data.get("item_id")
                    if item_id:
                        result = await db.execute(
                            select(ShoppingListItem).where(
                                ShoppingListItem.id == UUID(item_id),
                                ShoppingListItem.shopping_list_id == list_uuid,
                            )
                        )
                        item = result.scalar_one_or_none()
                        if item:
                            await db.delete(item)
                            await db.commit()

                            # Broadcast to all connected users
                            await manager.broadcast(
                                list_id,
                                {
                                    "type": "item_removed",
                                    "item_id": item_id,
                                    "user_id": str(user.id),
                                    "user_email": user.email,
                                },
                            )

                elif message_type == "clear_checked":
                    # Clear all checked items
                    result = await db.execute(
                        select(ShoppingListItem).where(
                            ShoppingListItem.shopping_list_id == list_uuid,
                            ShoppingListItem.is_checked == True,
                        )
                    )
                    items = result.scalars().all()
                    removed_ids = [str(item.id) for item in items]

                    for item in items:
                        await db.delete(item)
                    await db.commit()

                    # Broadcast to all connected users
                    await manager.broadcast(
                        list_id,
                        {
                            "type": "checked_cleared",
                            "removed_ids": removed_ids,
                            "user_id": str(user.id),
                            "user_email": user.email,
                        },
                    )

                elif message_type == "ping":
                    # Keep-alive ping
                    await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, list_id, str(user.id))
        await manager.broadcast_user_left(list_id, str(user.id), user.email)
