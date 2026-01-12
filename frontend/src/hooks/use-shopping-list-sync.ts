'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ShoppingListItem } from '@/types';

interface ActiveUser {
  user_id: string;
  email: string;
}

interface WebSocketMessage {
  type: string;
  item_id?: string;
  is_checked?: boolean;
  item?: ShoppingListItem;
  removed_ids?: string[];
  user_id?: string;
  user_email?: string;
  active_users?: ActiveUser[];
}

interface UseShoppingListSyncProps {
  listId: string;
  onItemToggled: (itemId: string, isChecked: boolean) => void;
  onItemAdded: (item: ShoppingListItem) => void;
  onItemRemoved: (itemId: string) => void;
  onCheckedCleared: (removedIds: string[]) => void;
  onActiveUsersChanged: (users: ActiveUser[]) => void;
}

export function useShoppingListSync({
  listId,
  onItemToggled,
  onItemAdded,
  onItemRemoved,
  onCheckedCleared,
  onActiveUsersChanged,
}: UseShoppingListSyncProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !listId) return;

    // Close existing connection
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }

    // Build WebSocket URL - use the API URL but with ws:// protocol
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace(/^http/, 'ws') + `/ws/shopping-lists/${listId}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);

      // Start ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'item_toggled':
            if (data.item_id && data.is_checked !== undefined) {
              onItemToggled(data.item_id, data.is_checked);
            }
            break;

          case 'item_added':
            if (data.item) {
              onItemAdded(data.item);
            }
            break;

          case 'item_removed':
            if (data.item_id) {
              onItemRemoved(data.item_id);
            }
            break;

          case 'checked_cleared':
            if (data.removed_ids) {
              onCheckedCleared(data.removed_ids);
            }
            break;

          case 'user_joined':
          case 'user_left':
            if (data.active_users) {
              setActiveUsers(data.active_users);
              onActiveUsersChanged(data.active_users);
            }
            break;

          case 'pong':
            // Ping response, connection is alive
            break;
        }
      } catch (error) {
        // Silently ignore parse errors
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Reconnect after 3 seconds if not intentionally closed
      if (event.code !== 1000 && event.code < 4000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = () => {
      // WebSocket errors are already handled by onclose
      // No need to log here as it creates noise
    };
  }, [listId, onItemToggled, onItemAdded, onItemRemoved, onCheckedCleared, onActiveUsersChanged]);

  useEffect(() => {
    connect();

    return () => {
      // Clean up on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
    };
  }, [connect]);

  const toggleItem = useCallback((itemId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'item_toggle', item_id: itemId }));
      return true;
    }
    return false;
  }, []);

  const addItem = useCallback((ingredientName: string, amount?: string, unit?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'item_add',
          ingredient_name: ingredientName,
          amount,
          unit,
        })
      );
      return true;
    }
    return false;
  }, []);

  const removeItem = useCallback((itemId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'item_remove', item_id: itemId }));
      return true;
    }
    return false;
  }, []);

  const clearChecked = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear_checked' }));
      return true;
    }
    return false;
  }, []);

  return {
    isConnected,
    activeUsers,
    toggleItem,
    addItem,
    removeItem,
    clearChecked,
  };
}
