'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  name: string;
  color?: string | null;
  onRemove?: () => void;
  className?: string;
}

export function CategoryBadge({ name, color, onRemove, className }: CategoryBadgeProps) {
  const bgColor = color || '#6b7280';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white',
        className
      )}
      style={{ backgroundColor: bgColor }}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
