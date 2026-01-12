'use client';

import { useState, useEffect } from 'react';
import { Check, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Category } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CategorySelectorProps {
  recipeId: string;
  selectedCategories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  translations: {
    categories: string;
    addCategory: string;
    newCategory: string;
    create: string;
    noCategories: string;
  };
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function CategorySelector({
  recipeId,
  selectedCategories,
  onCategoriesChange,
  translations: t,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCategory = async (category: Category) => {
    const isSelected = selectedCategories.some((c) => c.id === category.id);

    try {
      if (isSelected) {
        await api.removeRecipeFromCategory(recipeId, category.id);
        onCategoriesChange(selectedCategories.filter((c) => c.id !== category.id));
      } else {
        await api.addRecipeToCategory(recipeId, category.id);
        onCategoriesChange([...selectedCategories, category]);
      }
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreating(true);
    try {
      const newCategory = await api.createCategory({
        name: newCategoryName.trim(),
        color: selectedColor,
      });
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      // Auto-select the new category
      await api.addRecipeToCategory(recipeId, newCategory.id);
      onCategoriesChange([...selectedCategories, newCategory]);
    } catch (error) {
      toast.error('Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="h-4 w-4" />
          {t.categories}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.categories}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category list */}
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">{t.noCategories}</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map((category) => {
                const isSelected = selectedCategories.some((c) => c.id === category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleToggleCategory(category)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      'hover:bg-muted',
                      isSelected && 'bg-muted'
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color || '#6b7280' }}
                    />
                    <span className="flex-1 text-left">{category.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create new category */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">{t.newCategory}</p>
            <div className="flex gap-2">
              <Input
                placeholder={t.newCategory}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <Button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || isCreating}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'w-6 h-6 rounded-full transition-all',
                    selectedColor === color && 'ring-2 ring-offset-2 ring-primary'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
