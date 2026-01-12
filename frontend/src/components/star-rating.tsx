'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number | null;
  onRate?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showEmpty?: boolean;
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function StarRating({
  rating,
  onRate,
  size = 'md',
  readonly = false,
  showEmpty = true,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating ?? rating ?? 0;
  const isInteractive = !readonly && onRate;

  // Don't render anything if no rating and showEmpty is false
  if (!showEmpty && rating === null) {
    return null;
  }

  const handleClick = (star: number) => {
    if (!isInteractive) return;
    // If clicking the same rating, clear it
    if (rating === star) {
      onRate?.(0); // 0 will be treated as null/clear
    } else {
      onRate?.(star);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-0.5',
        isInteractive && 'cursor-pointer'
      )}
      onMouseLeave={() => isInteractive && setHoverRating(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => handleClick(star)}
          onMouseEnter={() => isInteractive && setHoverRating(star)}
          className={cn(
            'transition-colors focus:outline-none',
            isInteractive && 'hover:scale-110 transition-transform',
            readonly && 'cursor-default'
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-muted-foreground/40'
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Compact display version for lists
export function StarRatingDisplay({
  rating,
  size = 'sm',
}: {
  rating: number | null;
  size?: 'sm' | 'md';
}) {
  if (rating === null) return null;

  return (
    <div className="flex items-center gap-1">
      <Star className={cn(sizeClasses[size], 'fill-yellow-400 text-yellow-400')} />
      <span className={cn('font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {rating}
      </span>
    </div>
  );
}
