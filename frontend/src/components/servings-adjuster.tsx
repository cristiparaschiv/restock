'use client';

import { Button } from '@/components/ui/button';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface ServingsAdjusterProps {
  originalServings: number;
  currentServings: number;
  onChange: (servings: number) => void;
  translations: {
    servings: string;
    original: string;
  };
}

export function ServingsAdjuster({
  originalServings,
  currentServings,
  onChange,
  translations: t,
}: ServingsAdjusterProps) {
  const isScaled = currentServings !== originalServings;
  const minServings = 1;
  const maxServings = 100;

  const handleDecrease = () => {
    if (currentServings > minServings) {
      onChange(currentServings - 1);
    }
  };

  const handleIncrease = () => {
    if (currentServings < maxServings) {
      onChange(currentServings + 1);
    }
  };

  const handleReset = () => {
    onChange(originalServings);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{t.servings}:</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleDecrease}
          disabled={currentServings <= minServings}
          aria-label={`Decrease servings to ${currentServings - 1}`}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-semibold" aria-live="polite">
          {currentServings}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleIncrease}
          disabled={currentServings >= maxServings}
          aria-label={`Increase servings to ${currentServings + 1}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {isScaled && (
        <>
          <span className="text-xs text-muted-foreground">
            ({t.original}: {originalServings})
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleReset}
            aria-label={`Reset to original ${originalServings} servings`}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
