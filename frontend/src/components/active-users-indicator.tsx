'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Wifi, WifiOff } from 'lucide-react';

interface ActiveUser {
  user_id: string;
  email: string;
}

interface ActiveUsersIndicatorProps {
  users: ActiveUser[];
  isConnected: boolean;
  currentUserEmail?: string;
  translations: {
    connected: string;
    disconnected: string;
    viewing: string;
    you: string;
  };
}

export function ActiveUsersIndicator({
  users,
  isConnected,
  currentUserEmail,
  translations: t,
}: ActiveUsersIndicatorProps) {
  // Filter out current user for display
  const otherUsers = users.filter((u) => u.email !== currentUserEmail);

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <div
        title={isConnected ? t.connected : t.disconnected}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-default ${
          isConnected
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
        }`}
      >
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span className="max-sm:hidden">{isConnected ? t.connected : t.disconnected}</span>
      </div>

      {/* Active Users */}
      {otherUsers.length > 0 && (
        <div
          className="flex items-center -space-x-2 cursor-default"
          title={`${t.viewing}: ${otherUsers.map((u) => u.email).join(', ')}`}
        >
          {otherUsers.slice(0, 3).map((user) => (
            <Avatar
              key={user.user_id}
              className="h-7 w-7 border-2 border-background"
            >
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {otherUsers.length > 3 && (
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted border-2 border-background text-xs font-medium">
              +{otherUsers.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
