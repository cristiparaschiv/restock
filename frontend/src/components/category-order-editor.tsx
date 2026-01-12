'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, RotateCcw, GripVertical } from 'lucide-react';

const DEFAULT_CATEGORY_ORDER = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'grains',
  'pantry',
  'spices',
  'frozen',
  'beverages',
  'other',
];

const categoryTranslations = {
  en: {
    produce: 'Produce',
    dairy: 'Dairy',
    meat: 'Meat',
    seafood: 'Seafood',
    grains: 'Grains',
    pantry: 'Pantry',
    spices: 'Spices',
    frozen: 'Frozen',
    beverages: 'Beverages',
    other: 'Other',
  },
  ro: {
    produce: 'Legume și Fructe',
    dairy: 'Lactate',
    meat: 'Carne',
    seafood: 'Fructe de mare',
    grains: 'Cereale',
    pantry: 'Cămară',
    spices: 'Condimente',
    frozen: 'Congelate',
    beverages: 'Băuturi',
    other: 'Altele',
  },
};

const categoryColors: Record<string, string> = {
  produce: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  dairy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  meat: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  seafood: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  grains: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  pantry: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  spices: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  frozen: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  beverages: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface CategoryOrderEditorProps {
  categories: string[];
  onChange: (newOrder: string[]) => void;
  lang: 'en' | 'ro';
}

export function CategoryOrderEditor({ categories, onChange, lang }: CategoryOrderEditorProps) {
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const t = categoryTranslations[lang];

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...localCategories];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setLocalCategories(newOrder);
    onChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === localCategories.length - 1) return;
    const newOrder = [...localCategories];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setLocalCategories(newOrder);
    onChange(newOrder);
  };

  const resetToDefault = () => {
    setLocalCategories(DEFAULT_CATEGORY_ORDER);
    onChange(DEFAULT_CATEGORY_ORDER);
  };

  const isDefault = JSON.stringify(localCategories) === JSON.stringify(DEFAULT_CATEGORY_ORDER);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {localCategories.map((category, index) => (
          <div
            key={category}
            className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground w-6">
              {index + 1}.
            </span>
            <span
              className={`px-2 py-1 rounded text-sm font-medium flex-1 ${
                categoryColors[category] || categoryColors.other
              }`}
            >
              {t[category as keyof typeof t] || category}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                aria-label={`Move ${t[category as keyof typeof t] || category} up`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveDown(index)}
                disabled={index === localCategories.length - 1}
                aria-label={`Move ${t[category as keyof typeof t] || category} down`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!isDefault && (
        <Button variant="outline" size="sm" onClick={resetToDefault} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          {lang === 'en' ? 'Reset to Default' : 'Resetează la implicit'}
        </Button>
      )}
    </div>
  );
}
