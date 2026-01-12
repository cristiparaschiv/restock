'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  recipeId: string;
  isFavorite: boolean;
  onToggle?: (isFavorite: boolean) => void;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}

export function FavoriteButton({
  recipeId,
  isFavorite: initialFavorite,
  onToggle,
  size = 'icon',
  variant = 'ghost',
  className,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await api.toggleFavorite(recipeId);
      setIsFavorite(result.is_favorite);
      onToggle?.(result.is_favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'transition-colors',
        isFavorite && 'text-red-500 hover:text-red-600',
        className
      )}
    >
      <Heart
        className={cn(
          'h-5 w-5 transition-all',
          isFavorite && 'fill-current',
          isLoading && 'animate-pulse'
        )}
      />
    </Button>
  );
}
