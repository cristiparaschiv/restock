'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Store, StoreCreate } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Store as StoreIcon,
  Loader2,
  Plus,
  MapPin,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  GripVertical,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const translations = {
  en: {
    title: 'My Stores',
    subtitle: 'Manage stores and customize category order for each',
    create: 'Add Store',
    noStores: 'No stores yet',
    noStoresDesc: 'Add stores to organize your shopping by location',
    loading: 'Loading...',
    defaultStore: 'Default',
    setDefault: 'Set as Default',
    edit: 'Edit',
    delete: 'Delete',
    createTitle: 'Add Store',
    createDesc: 'Add a new store to organize your shopping',
    editTitle: 'Edit Store',
    editDesc: 'Update store details and category order',
    name: 'Store Name',
    namePlaceholder: 'e.g., Costco, Whole Foods',
    location: 'Location',
    locationPlaceholder: 'e.g., 123 Main St',
    notes: 'Notes',
    notesPlaceholder: 'Any notes about this store...',
    color: 'Color',
    categoryOrder: 'Category Order',
    categoryOrderDesc: 'Drag categories to customize the order for this store',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    deleteTitle: 'Delete Store',
    deleteDesc: 'Are you sure you want to delete this store? This action cannot be undone.',
    deleteConfirm: 'Delete',
    addCategory: 'Add Category',
    categoryPlaceholder: 'Category name',
  },
  ro: {
    title: 'Magazinele Mele',
    subtitle: 'Gestionează magazinele și personalizează ordinea categoriilor',
    create: 'Adaugă Magazin',
    noStores: 'Niciun magazin încă',
    noStoresDesc: 'Adaugă magazine pentru a-ți organiza cumpărăturile',
    loading: 'Se încarcă...',
    defaultStore: 'Implicit',
    setDefault: 'Setează ca Implicit',
    edit: 'Editează',
    delete: 'Șterge',
    createTitle: 'Adaugă Magazin',
    createDesc: 'Adaugă un magazin nou pentru cumpărături',
    editTitle: 'Editează Magazin',
    editDesc: 'Actualizează detaliile și ordinea categoriilor',
    name: 'Nume Magazin',
    namePlaceholder: 'ex., Kaufland, Lidl',
    location: 'Locație',
    locationPlaceholder: 'ex., Str. Principală 123',
    notes: 'Note',
    notesPlaceholder: 'Orice note despre acest magazin...',
    color: 'Culoare',
    categoryOrder: 'Ordine Categorii',
    categoryOrderDesc: 'Trage categoriile pentru a personaliza ordinea',
    cancel: 'Anulează',
    save: 'Salvează',
    saving: 'Se salvează...',
    deleteTitle: 'Șterge Magazin',
    deleteDesc: 'Ești sigur că vrei să ștergi acest magazin? Acțiunea nu poate fi anulată.',
    deleteConfirm: 'Șterge',
    addCategory: 'Adaugă Categorie',
    categoryPlaceholder: 'Nume categorie',
  },
};

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

const DEFAULT_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Household',
  'Other',
];

interface StoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store | null;
  onSave: (data: StoreCreate) => Promise<void>;
  t: typeof translations.en;
}

function StoreDialog({ open, onOpenChange, store, onSave, t }: StoreDialogProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (store) {
      setName(store.name);
      setLocation(store.location || '');
      setNotes(store.notes || '');
      setColor(store.color || '#3b82f6');
      setCategoryOrder(store.category_order || [...DEFAULT_CATEGORIES]);
    } else {
      setName('');
      setLocation('');
      setNotes('');
      setColor('#3b82f6');
      setCategoryOrder([...DEFAULT_CATEGORIES]);
    }
  }, [store, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        color,
        category_order: categoryOrder.length > 0 ? categoryOrder : undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...categoryOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, removed);
    setCategoryOrder(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const addCategory = () => {
    if (newCategory.trim() && !categoryOrder.includes(newCategory.trim())) {
      setCategoryOrder([...categoryOrder, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (index: number) => {
    setCategoryOrder(categoryOrder.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{store ? t.editTitle : t.createTitle}</DialogTitle>
            <DialogDescription>{store ? t.editDesc : t.createDesc}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">{t.location}</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t.locationPlaceholder}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">{t.notes}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label>{t.color}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => setColor(presetColor)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === presetColor ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: presetColor }}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t.categoryOrder}</Label>
              <p className="text-xs text-muted-foreground">{t.categoryOrderDesc}</p>
              <div className="border rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto">
                {categoryOrder.map((category, index) => (
                  <div
                    key={category}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 bg-muted/50 rounded cursor-move hover:bg-muted ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm">{category}</span>
                    <button
                      type="button"
                      onClick={() => removeCategory(index)}
                      className="p-1 hover:bg-destructive/10 rounded"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder={t.categoryPlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCategory}>
                  {t.addCategory}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.saving}
                </>
              ) : (
                t.save
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StoresPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteStore, setDeleteStore] = useState<Store | null>(null);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStores();
    }
  }, [isAuthenticated]);

  const loadStores = async () => {
    setIsLoading(true);
    try {
      const data = await api.getStores();
      setStores(data);
    } catch (error) {
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingStore(null);
    setDialogOpen(true);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setDialogOpen(true);
  };

  const handleSave = async (data: StoreCreate) => {
    try {
      if (editingStore) {
        await api.updateStore(editingStore.id, data);
        toast.success(lang === 'en' ? 'Store updated' : 'Magazin actualizat');
      } else {
        await api.createStore(data);
        toast.success(lang === 'en' ? 'Store created' : 'Magazin creat');
      }
      loadStores();
    } catch (error) {
      toast.error(lang === 'en' ? 'Failed to save store' : 'Eroare la salvare');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteStore) return;
    try {
      await api.deleteStore(deleteStore.id);
      toast.success(lang === 'en' ? 'Store deleted' : 'Magazin șters');
      loadStores();
    } catch (error) {
      toast.error(lang === 'en' ? 'Failed to delete store' : 'Eroare la ștergere');
    } finally {
      setDeleteStore(null);
    }
  };

  const handleSetDefault = async (store: Store) => {
    try {
      await api.setDefaultStore(store.id);
      toast.success(lang === 'en' ? 'Default store updated' : 'Magazin implicit actualizat');
      loadStores();
    } catch (error) {
      toast.error(lang === 'en' ? 'Failed to set default' : 'Eroare la setare');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <StoreIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t.create}
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.loading}</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <StoreIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.noStores}</h2>
              <p className="text-muted-foreground mb-6 max-w-md">{t.noStoresDesc}</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t.create}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <Card key={store.id} className="relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: store.color || '#3b82f6' }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {store.name}
                          {store.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              {t.defaultStore}
                            </Badge>
                          )}
                        </CardTitle>
                        {store.location && (
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {store.location}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(store)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t.edit}
                          </DropdownMenuItem>
                          {!store.is_default && (
                            <DropdownMenuItem onClick={() => handleSetDefault(store)}>
                              <Star className="h-4 w-4 mr-2" />
                              {t.setDefault}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteStore(store)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {store.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {store.notes}
                      </p>
                    )}
                    {store.category_order && store.category_order.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {store.category_order.slice(0, 5).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {store.category_order.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{store.category_order.length - 5}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <StoreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        store={editingStore}
        onSave={handleSave}
        t={t}
      />

      <AlertDialog open={!!deleteStore} onOpenChange={() => setDeleteStore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
