'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShoppingSuggestion, SuggestionReason } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Loader2,
  Lightbulb,
  Calendar,
  AlertTriangle,
  TrendingDown,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const translations = {
  en: {
    title: 'Smart Suggestions',
    subtitle: 'Based on your meal plan and pantry',
    noSuggestions: 'No suggestions right now',
    noSuggestionsDesc: 'Add items to your meal plan or pantry to get shopping suggestions',
    addSelected: 'Add Selected',
    addAll: 'Add All',
    mealPlan: 'Meal Plan',
    lowStock: 'Low Stock',
    expiringSoon: 'Expiring Soon',
    forRecipes: 'For:',
    currentAmount: 'Have:',
    expires: 'Expires:',
    loading: 'Loading suggestions...',
    selected: 'selected',
    added: 'Added to shopping list',
  },
  ro: {
    title: 'Sugestii Inteligente',
    subtitle: 'Bazate pe planul de mese și cămară',
    noSuggestions: 'Nicio sugestie momentan',
    noSuggestionsDesc: 'Adaugă articole în planul de mese sau cămară pentru sugestii',
    addSelected: 'Adaugă Selectate',
    addAll: 'Adaugă Toate',
    mealPlan: 'Plan Mese',
    lowStock: 'Stoc Scăzut',
    expiringSoon: 'Expiră Curând',
    forRecipes: 'Pentru:',
    currentAmount: 'Am:',
    expires: 'Expiră:',
    loading: 'Se încarcă sugestiile...',
    selected: 'selectate',
    added: 'Adăugat în lista de cumpărături',
  },
};

interface ShoppingSuggestionsProps {
  lang: 'en' | 'ro';
  shoppingListId: string;
  onItemsAdded?: () => void;
}

const reasonIcons: Record<SuggestionReason, React.ReactNode> = {
  meal_plan: <Calendar className="h-3 w-3" />,
  low_stock: <TrendingDown className="h-3 w-3" />,
  expiring_soon: <AlertTriangle className="h-3 w-3" />,
};

const reasonColors: Record<SuggestionReason, string> = {
  meal_plan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  low_stock: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  expiring_soon: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function ShoppingSuggestions({ lang, shoppingListId, onItemsAdded }: ShoppingSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ShoppingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getShoppingSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (ingredientName: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(ingredientName)) {
      newSelected.delete(ingredientName);
    } else {
      newSelected.add(ingredientName);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(suggestions.map((s) => s.ingredient_name)));
  };

  const addItems = async (items: ShoppingSuggestion[]) => {
    setIsAdding(true);
    try {
      for (const item of items) {
        await api.addShoppingListItem(shoppingListId, {
          ingredient_name: item.ingredient_name,
          amount: item.amount || undefined,
          unit: item.unit || undefined,
          category: item.category || undefined,
        });
      }
      toast.success(t.added);

      // Remove added items from suggestions
      const addedNames = new Set(items.map((i) => i.ingredient_name));
      setSuggestions(suggestions.filter((s) => !addedNames.has(s.ingredient_name)));
      setSelectedItems(new Set());

      onItemsAdded?.();
    } catch (error) {
      toast.error('Failed to add items');
    } finally {
      setIsAdding(false);
    }
  };

  const addSelected = () => {
    const itemsToAdd = suggestions.filter((s) => selectedItems.has(s.ingredient_name));
    addItems(itemsToAdd);
  };

  const addAll = () => {
    addItems(suggestions);
  };

  const formatReason = (reason: SuggestionReason): string => {
    switch (reason) {
      case 'meal_plan':
        return t.mealPlan;
      case 'low_stock':
        return t.lowStock;
      case 'expiring_soon':
        return t.expiringSoon;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">{t.loading}</span>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-left">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <CardDescription className="text-xs">{t.subtitle}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {suggestions.length}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2 mb-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.ingredient_name}
                  className="flex items-start gap-3 p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedItems.has(suggestion.ingredient_name)}
                    onCheckedChange={() => toggleItem(suggestion.ingredient_name)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{suggestion.ingredient_name}</span>
                      {suggestion.amount && (
                        <span className="text-sm text-muted-foreground">
                          {suggestion.amount}
                          {suggestion.unit && ` ${suggestion.unit}`}
                        </span>
                      )}
                      <Badge className={`text-xs ${reasonColors[suggestion.reason]}`}>
                        {reasonIcons[suggestion.reason]}
                        <span className="ml-1">{formatReason(suggestion.reason)}</span>
                      </Badge>
                    </div>
                    {suggestion.source_recipes && suggestion.source_recipes.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.forRecipes} {suggestion.source_recipes.join(', ')}
                      </p>
                    )}
                    {suggestion.current_pantry_amount && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.currentAmount} {suggestion.current_pantry_amount}
                        {suggestion.unit && ` ${suggestion.unit}`}
                      </p>
                    )}
                    {suggestion.expiration_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.expires} {new Date(suggestion.expiration_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {selectedItems.size} {t.selected}
              </span>
              <div className="flex gap-2">
                {selectedItems.size > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addSelected}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        {t.addSelected}
                      </>
                    )}
                  </Button>
                )}
                <Button size="sm" onClick={addAll} disabled={isAdding}>
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      {t.addAll}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
