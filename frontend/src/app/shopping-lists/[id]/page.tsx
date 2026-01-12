'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { ShoppingList, ShoppingListItem, Ingredient } from '@/types';
import { Header } from '@/components/header';
import { LoadingScreen } from '@/components/loading-screen';
import { ActiveUsersIndicator } from '@/components/active-users-indicator';
import { useShoppingListSync } from '@/hooks/use-shopping-list-sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { convertIngredient, UnitSystem } from '@/lib/unit-utils';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  X,
  Sparkles,
  Apple,
  Milk,
  Beef,
  Fish,
  Wheat,
  Package,
  Flame,
  Snowflake,
  Wine,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ShareToFamilyDialog } from '@/components/share-to-family-dialog';
import { ShoppingSuggestions } from '@/components/shopping-suggestions';

// Category icons and colors
const categoryConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  produce: { icon: Apple, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/50' },
  dairy: { icon: Milk, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/50' },
  meat: { icon: Beef, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/50' },
  seafood: { icon: Fish, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/50' },
  grains: { icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/50' },
  pantry: { icon: Package, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/50' },
  spices: { icon: Flame, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/50' },
  frozen: { icon: Snowflake, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/50' },
  beverages: { icon: Wine, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/50' },
  other: { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/50' },
};

const translations = {
  en: {
    back: 'Back to Lists',
    items: 'items',
    checked: 'checked',
    clearChecked: 'Clear Checked',
    addItem: 'Add item...',
    add: 'Add',
    noItems: 'No items in this list',
    noItemsDesc: 'Add items manually or generate from a meal plan.',
    loading: 'Loading...',
    allDone: 'All done!',
    allDoneDesc: 'You\'ve checked off everything on your list.',
    from: 'from',
    connected: 'Live',
    disconnected: 'Offline',
    viewing: 'Also viewing',
    you: 'You',
    updatedBy: 'Updated by',
    categories: {
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
    shareToFamily: 'Share to Family',
    shareToFamilyDescription: 'Share this shopping list with your family group',
    selectFamily: 'Select a family to share with',
    noFamilies: 'You are not in any family group yet',
    createFamily: 'Create a Family',
    shared: 'Shared successfully',
    shareBtn: 'Share',
    unshare: 'Unshare',
    sharedWith: 'Shared with Family',
  },
  ro: {
    back: 'Înapoi la Liste',
    items: 'articole',
    checked: 'bifate',
    clearChecked: 'Șterge Bifate',
    addItem: 'Adaugă articol...',
    add: 'Adaugă',
    noItems: 'Niciun articol în această listă',
    noItemsDesc: 'Adaugă articole manual sau generează din planul de mese.',
    loading: 'Se încarcă...',
    allDone: 'Gata!',
    allDoneDesc: 'Ai bifat tot de pe listă.',
    from: 'din',
    connected: 'Live',
    disconnected: 'Offline',
    viewing: 'Vizualizează și',
    you: 'Tu',
    updatedBy: 'Actualizat de',
    categories: {
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
    shareToFamily: 'Distribuie Familiei',
    shareToFamilyDescription: 'Distribuie această listă de cumpărături grupului tău de familie',
    selectFamily: 'Selectează o familie pentru a distribui',
    noFamilies: 'Nu ești încă într-un grup de familie',
    createFamily: 'Creează o Familie',
    shared: 'Distribuit cu succes',
    shareBtn: 'Distribuie',
    unshare: 'Anulează distribuirea',
    sharedWith: 'Distribuit Familiei',
  },
};

interface ActiveUser {
  user_id: string;
  email: string;
}

export default function ShoppingListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];
  const unitSystem: UnitSystem = user?.preferences?.unit_system || 'metric';

  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // WebSocket sync callbacks
  const handleItemToggled = useCallback((itemId: string, isChecked: boolean) => {
    setList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(i =>
          i.id === itemId ? { ...i, is_checked: isChecked } : i
        ),
      };
    });
  }, []);

  const handleItemAdded = useCallback((item: ShoppingListItem) => {
    setList(prev => {
      if (!prev) return prev;
      // Check if item already exists (in case we added it locally)
      if (prev.items.some(i => i.id === item.id)) {
        return prev;
      }
      return {
        ...prev,
        items: [...prev.items, item],
      };
    });
  }, []);

  const handleItemRemoved = useCallback((itemId: string) => {
    setList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      };
    });
  }, []);

  const handleCheckedCleared = useCallback((removedIds: string[]) => {
    setList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter(i => !removedIds.includes(i.id)),
      };
    });
  }, []);

  const handleActiveUsersChanged = useCallback((users: ActiveUser[]) => {
    setActiveUsers(users);
  }, []);

  // WebSocket sync hook
  const {
    isConnected,
    activeUsers: wsActiveUsers,
    toggleItem: wsToggleItem,
    addItem: wsAddItem,
    removeItem: wsRemoveItem,
    clearChecked: wsClearChecked,
  } = useShoppingListSync({
    listId: params.id as string,
    onItemToggled: handleItemToggled,
    onItemAdded: handleItemAdded,
    onItemRemoved: handleItemRemoved,
    onCheckedCleared: handleCheckedCleared,
    onActiveUsersChanged: handleActiveUsersChanged,
  });

  // Helper to convert shopping list item units
  const convertItem = useCallback((item: ShoppingListItem) => {
    if (!item.amount || !item.unit) return item;
    const ingredient: Ingredient = {
      amount: item.amount,
      unit: item.unit,
      name: item.ingredient_name,
    };
    const converted = convertIngredient(ingredient, unitSystem);
    return {
      ...item,
      amount: converted.amount,
      unit: converted.unit,
      ingredient_name: converted.name,
    };
  }, [unitSystem]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getShoppingList(params.id as string);
      setList(data);
    } catch (error) {
      console.error('Failed to load shopping list:', error);
      router.push('/shopping-lists');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleToggleItem = async (item: ShoppingListItem) => {
    if (!list) return;

    // Optimistic update
    setList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(i =>
          i.id === item.id ? { ...i, is_checked: !i.is_checked } : i
        ),
      };
    });

    // Try WebSocket first, fallback to REST
    if (isConnected && wsToggleItem(item.id)) {
      // WebSocket will handle the broadcast
      return;
    }

    try {
      await api.toggleShoppingListItem(list.id, item.id);
    } catch (error) {
      console.error('Failed to toggle item:', error);
      // Revert optimistic update
      setList(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(i =>
            i.id === item.id ? { ...i, is_checked: !i.is_checked } : i
          ),
        };
      });
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !newItemName.trim()) return;

    setAdding(true);
    const itemName = newItemName.trim();
    setNewItemName('');

    // Try WebSocket first, fallback to REST
    if (isConnected && wsAddItem(itemName)) {
      setAdding(false);
      return;
    }

    try {
      await api.addShoppingListItem(list.id, { ingredient_name: itemName });
      await loadList();
    } catch (error) {
      console.error('Failed to add item:', error);
      setNewItemName(itemName); // Restore input on error
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!list) return;

    // Optimistic update
    setList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      };
    });

    // Try WebSocket first, fallback to REST
    if (isConnected && wsRemoveItem(itemId)) {
      return;
    }

    try {
      await api.removeShoppingListItem(list.id, itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
      await loadList(); // Reload on error
    }
  };

  const handleClearChecked = async () => {
    if (!list) return;

    // Optimistic update
    const checkedItems = list.items.filter(i => i.is_checked);
    setList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter(i => !i.is_checked),
      };
    });

    // Try WebSocket first, fallback to REST
    if (isConnected && wsClearChecked()) {
      return;
    }

    try {
      await api.clearCheckedItems(list.id);
    } catch (error) {
      console.error('Failed to clear checked items:', error);
      await loadList(); // Reload on error
    }
  };

  // Group items by category
  const groupedItems = list?.items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>) || {};

  // Sort categories using user preference or default order
  const DEFAULT_CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'seafood', 'grains', 'pantry', 'spices', 'frozen', 'beverages', 'other'];
  const categoryOrder = user?.preferences?.category_order || DEFAULT_CATEGORY_ORDER;
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    // If category not in order, put it at the end
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  if (loading) {
    return <LoadingScreen message={t.loading} />;
  }

  if (!list) return null;

  const checkedCount = list.items.filter(i => i.is_checked).length;
  const totalCount = list.items.length;
  const allDone = totalCount > 0 && checkedCount === totalCount;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 px-6 md:px-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/shopping-lists"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
          <ActiveUsersIndicator
            users={wsActiveUsers}
            isConnected={isConnected}
            currentUserEmail={user?.email}
            translations={{
              connected: t.connected,
              disconnected: t.disconnected,
              viewing: t.viewing,
              you: t.you,
            }}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              {list.name || 'Shopping List'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalCount} {t.items} · {checkedCount} {t.checked}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ShareToFamilyDialog
              contentType="shopping-list"
              contentId={list.id}
              currentFamilyId={list.family_id}
              onShareChange={(familyId) => {
                setList({ ...list, family_id: familyId });
              }}
              translations={{
                shareToFamily: t.shareToFamily,
                shareDescription: t.shareToFamilyDescription,
                selectFamily: t.selectFamily,
                noFamilies: t.noFamilies,
                createFamily: t.createFamily,
                shared: t.shared,
                share: t.shareBtn,
                unshare: t.unshare,
                sharedWith: t.sharedWith,
              }}
            />
            {checkedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChecked}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.clearChecked}
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="mb-6">
        <div className="flex gap-2">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={t.addItem}
            className="flex-1"
          />
          <Button type="submit" disabled={adding || !newItemName.trim()}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-2 max-sm:hidden">{t.add}</span>
          </Button>
        </div>
      </form>

      {/* Smart Suggestions */}
      <div className="mb-6">
        <ShoppingSuggestions
          lang={lang}
          shoppingListId={list.id}
          onItemsAdded={loadList}
        />
      </div>

      {/* All Done State */}
      {allDone && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">{t.allDone}</h3>
              <p className="text-sm text-green-600 dark:text-green-400">{t.allDoneDesc}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      {totalCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t.noItems}</h3>
            <p className="text-muted-foreground text-center">{t.noItemsDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(category => {
            const items = groupedItems[category];
            const categoryName = t.categories[category as keyof typeof t.categories] || category;
            const config = categoryConfig[category] || categoryConfig.other;
            const CategoryIcon = config.icon;
            const uncheckedCount = items.filter(i => !i.is_checked).length;

            return (
              <div key={category}>
                <div className={`flex items-center gap-3 mb-3 px-3 py-2 rounded-lg ${config.bg}`}>
                  <div className={`p-1.5 rounded-md bg-white/50 dark:bg-white/10 ${config.color}`}>
                    <CategoryIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold flex-1">{categoryName}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                    {uncheckedCount > 0 ? uncheckedCount : items.length}
                  </span>
                </div>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {items.map(item => {
                      const displayItem = convertItem(item);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-4 group transition-colors ${
                            item.is_checked ? 'bg-muted/50' : ''
                          }`}
                        >
                          <Checkbox
                            checked={item.is_checked}
                            onCheckedChange={() => handleToggleItem(item)}
                            className="h-5 w-5"
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium ${
                                item.is_checked
                                  ? 'line-through text-muted-foreground'
                                  : ''
                              }`}
                            >
                              {displayItem.amount && displayItem.unit
                                ? `${displayItem.amount} ${displayItem.unit} `
                                : displayItem.amount
                                ? `${displayItem.amount} `
                                : ''}
                              {displayItem.ingredient_name}
                            </p>
                            {item.source_recipes && item.source_recipes.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t.from}:{' '}
                                {item.source_recipes.map(r => r.recipe_title).join(', ')}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-destructive/10 text-destructive transition-all"
                            aria-label={`Remove ${item.ingredient_name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
