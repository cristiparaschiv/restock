'use client';

import { UnitSystem } from '@/lib/unit-utils';

interface UnitSystemToggleProps {
  value: UnitSystem;
  onChange: (system: UnitSystem) => void;
  translations: {
    metric: string;
    imperial: string;
  };
}

export function UnitSystemToggle({ value, onChange, translations: t }: UnitSystemToggleProps) {
  return (
    <div
      className="inline-flex rounded-md border bg-muted p-0.5"
      role="radiogroup"
      aria-label="Unit system"
    >
      <button
        role="radio"
        aria-checked={value === 'metric'}
        onClick={() => onChange('metric')}
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
          value === 'metric'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t.metric}
      </button>
      <button
        role="radio"
        aria-checked={value === 'imperial'}
        onClick={() => onChange('imperial')}
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
          value === 'imperial'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t.imperial}
      </button>
    </div>
  );
}
