"""WebSocket connection manager for real-time shopping list sync."""

import json
from typing import Dict, List, Tuple, Any
from fastapi import WebSocket
from uuid import UUID


class ConnectionManager:
    """Manages WebSocket connections for shopping list real-time sync."""

    def __init__(self):
        # Map of list_id -> list of (user_id, user_email, websocket)
        self.active_connections: Dict[str, List[Tuple[str, str, WebSocket]]] = {}

    async def connect(self, websocket: WebSocket, list_id: str, user_id: str, user_email: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()

        if list_id not in self.active_connections:
            self.active_connections[list_id] = []

        self.active_connections[list_id].append((user_id, user_email, websocket))

        # Notify others that a user joined
        await self.broadcast(
            list_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "user_email": user_email,
                "active_users": self.get_active_users(list_id),
            },
            exclude_user=user_id,
        )

    def disconnect(self, websocket: WebSocket, list_id: str, user_id: str):
        """Remove a WebSocket connection."""
        if list_id in self.active_connections:
            self.active_connections[list_id] = [
                (uid, email, ws)
                for uid, email, ws in self.active_connections[list_id]
                if ws != websocket
            ]

            # Clean up empty lists
            if not self.active_connections[list_id]:
                del self.active_connections[list_id]

    async def broadcast_user_left(self, list_id: str, user_id: str, user_email: str):
        """Broadcast that a user left."""
        await self.broadcast(
            list_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "user_email": user_email,
                "active_users": self.get_active_users(list_id),
            },
            exclude_user=user_id,
        )

    async def broadcast(
        self,
        list_id: str,
        message: Dict[str, Any],
        exclude_user: str | None = None,
    ):
        """Broadcast a message to all connections for a list."""
        if list_id not in self.active_connections:
            return

        disconnected = []
        for user_id, user_email, websocket in self.active_connections[list_id]:
            if exclude_user and user_id == exclude_user:
                continue

            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)

        # Clean up disconnected websockets
        if disconnected:
            self.active_connections[list_id] = [
                (uid, email, ws)
                for uid, email, ws in self.active_connections[list_id]
                if ws not in disconnected
            ]

    def get_active_users(self, list_id: str) -> List[Dict[str, str]]:
        """Get list of active users for a shopping list."""
        if list_id not in self.active_connections:
            return []

        # Deduplicate by user_id
        users = {}
        for user_id, user_email, _ in self.active_connections[list_id]:
            users[user_id] = {"user_id": user_id, "email": user_email}

        return list(users.values())

    def is_user_connected(self, list_id: str, user_id: str) -> bool:
        """Check if a user is connected to a list."""
        if list_id not in self.active_connections:
            return False

        return any(
            uid == user_id for uid, _, _ in self.active_connections[list_id]
        )


# Global connection manager instance
manager = ConnectionManager()
