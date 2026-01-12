'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { ShoppingList, MealPlan } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

const translations = {
  en: {
    title: 'Shopping Lists',
    subtitle: 'Manage your shopping lists',
    newList: 'New List',
    createList: 'Create Shopping List',
    fromMealPlan: 'From Meal Plan',
    emptyList: 'Empty List',
    listName: 'List Name (optional)',
    createEmpty: 'Create Empty',
    generateFromPlan: 'Generate from Current Week',
    noLists: 'No shopping lists yet',
    noListsDesc: 'Create a shopping list manually or generate one from your meal plan.',
    items: 'items',
    checked: 'checked',
    delete: 'Delete',
    loading: 'Loading shopping lists...',
    cancel: 'Cancel',
    create: 'Create',
  },
  ro: {
    title: 'Liste de Cumpărături',
    subtitle: 'Gestionează listele de cumpărături',
    newList: 'Listă Nouă',
    createList: 'Creează Listă de Cumpărături',
    fromMealPlan: 'Din Planul de Mese',
    emptyList: 'Listă Goală',
    listName: 'Nume Listă (opțional)',
    createEmpty: 'Creează Goală',
    generateFromPlan: 'Generează din Săptămâna Curentă',
    noLists: 'Nicio listă încă',
    noListsDesc: 'Creează o listă manual sau generează una din planul de mese.',
    items: 'articole',
    checked: 'bifate',
    delete: 'Șterge',
    loading: 'Se încarcă listele...',
    cancel: 'Anulează',
    create: 'Creează',
  },
};

export default function ShoppingListsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);

  const loadLists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getShoppingLists();
      setLists(data);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentMealPlan = useCallback(async () => {
    try {
      const plan = await api.getCurrentMealPlan();
      setCurrentMealPlan(plan);
    } catch (error) {
      console.error('Failed to load meal plan:', error);
    }
  }, []);

  useEffect(() => {
    loadLists();
    loadCurrentMealPlan();
  }, [loadLists, loadCurrentMealPlan]);

  const handleCreateEmpty = async () => {
    try {
      setCreating(true);
      const list = await api.createShoppingList(newListName || undefined);
      router.push(`/shopping-lists/${list.id}`);
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateFromMealPlan = async () => {
    if (!currentMealPlan) return;

    try {
      setCreating(true);
      const list = await api.generateShoppingListFromMealPlan(currentMealPlan.id);
      router.push(`/shopping-lists/${list.id}`);
    } catch (error) {
      console.error('Failed to generate list:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure?')) return;

    try {
      await api.deleteShoppingList(id);
      setLists(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'ro-RO', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 px-6 md:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t.loading}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 px-6 md:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.newList}
        </Button>
      </div>

      {/* Lists Grid */}
      {lists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t.noLists}</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {t.noListsDesc}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t.newList}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {lists.map(list => {
            const checkedCount = list.items.filter(i => i.is_checked).length;
            const totalCount = list.items.length;
            const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

            return (
              <Link key={list.id} href={`/shopping-lists/${list.id}`} className="h-full">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {list.name || t.emptyList}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(list.id, e)}
                        aria-label={`Delete ${list.name || t.emptyList}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(list.created_at)}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {totalCount} {t.items}
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        {checkedCount} {t.checked}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex-1" />
                    {list.meal_plan_id && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {t.fromMealPlan}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.createList}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.listName}</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={t.listName}
              />
            </div>

            {currentMealPlan && currentMealPlan.items.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  {t.fromMealPlan}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateFromMealPlan}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  {t.generateFromPlan}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleCreateEmpty} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t.createEmpty}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
