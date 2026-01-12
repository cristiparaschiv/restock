'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { PantryItem, StorageLocation } from '@/types';
import { Header } from '@/components/header';
import { LoadingScreen } from '@/components/loading-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Trash2,
  Edit,
  Refrigerator,
  Snowflake,
  Home,
  UtensilsCrossed,
  Box,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function to format date as "MMM d" (e.g., "Jan 15")
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const translations = {
  en: {
    pantry: 'Pantry',
    myPantry: 'My Pantry',
    addItem: 'Add Item',
    search: 'Search pantry...',
    all: 'All',
    fridge: 'Fridge',
    freezer: 'Freezer',
    pantryLoc: 'Pantry',
    counter: 'Counter',
    other: 'Other',
    expiringAlert: 'items expiring soon',
    noItems: 'No items in your pantry',
    noItemsDesc: 'Add items to track what you have at home.',
    addItemTitle: 'Add Pantry Item',
    ingredientName: 'Item Name',
    amount: 'Amount',
    unit: 'Unit',
    location: 'Location',
    expirationDate: 'Expiration Date',
    purchaseDate: 'Purchase Date',
    notes: 'Notes',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    editItem: 'Edit Item',
    expires: 'Expires',
    expired: 'Expired',
    daysLeft: 'days left',
    today: 'today',
    loading: 'Loading...',
  },
  ro: {
    pantry: 'Cămară',
    myPantry: 'Cămara Mea',
    addItem: 'Adaugă',
    search: 'Caută în cămară...',
    all: 'Toate',
    fridge: 'Frigider',
    freezer: 'Congelator',
    pantryLoc: 'Cămară',
    counter: 'Blat',
    other: 'Altele',
    expiringAlert: 'articole expiră curând',
    noItems: 'Niciun articol în cămară',
    noItemsDesc: 'Adaugă articole pentru a urmări ce ai acasă.',
    addItemTitle: 'Adaugă în Cămară',
    ingredientName: 'Nume Produs',
    amount: 'Cantitate',
    unit: 'Unitate',
    location: 'Locație',
    expirationDate: 'Data Expirării',
    purchaseDate: 'Data Cumpărării',
    notes: 'Note',
    cancel: 'Anulează',
    save: 'Salvează',
    delete: 'Șterge',
    edit: 'Editează',
    editItem: 'Editează Articol',
    expires: 'Expiră',
    expired: 'Expirat',
    daysLeft: 'zile rămase',
    today: 'astăzi',
    loading: 'Se încarcă...',
  },
};

const locationIcons: Record<StorageLocation, React.ElementType> = {
  fridge: Refrigerator,
  freezer: Snowflake,
  pantry: Home,
  counter: UtensilsCrossed,
  other: Box,
};

const locationColors: Record<StorageLocation, string> = {
  fridge: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  freezer: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950',
  pantry: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  counter: 'text-green-500 bg-green-50 dark:bg-green-950',
  other: 'text-gray-500 bg-gray-50 dark:bg-gray-950',
};

export default function PantryPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<StorageLocation | 'all'>('all');
  const [expiringCount, setExpiringCount] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    ingredient_name: '',
    amount: '',
    unit: '',
    location: 'pantry' as StorageLocation,
    expiration_date: '',
    purchase_date: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const location = activeTab === 'all' ? undefined : activeTab;
      const response = await api.getPantryItems(location);
      setItems(response.items);
      setExpiringCount(response.expiring_soon_count);
    } catch (error) {
      toast.error('Failed to load pantry items');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isAuthenticated) {
      loadItems();
    }
  }, [isAuthenticated, loadItems]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadItems();
      return;
    }
    try {
      setLoading(true);
      const response = await api.searchPantryItems(searchQuery);
      setItems(response.items);
      setExpiringCount(response.expiring_soon_count);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      ingredient_name: '',
      amount: '',
      unit: '',
      location: 'pantry',
      expiration_date: '',
      purchase_date: '',
      notes: '',
    });
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!formData.ingredient_name.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    try {
      const data = {
        ingredient_name: formData.ingredient_name,
        amount: formData.amount || undefined,
        unit: formData.unit || undefined,
        location: formData.location,
        expiration_date: formData.expiration_date || undefined,
        purchase_date: formData.purchase_date || undefined,
        notes: formData.notes || undefined,
      };

      if (editingItem) {
        await api.updatePantryItem(editingItem.id, data);
        toast.success('Item updated');
      } else {
        await api.createPantryItem(data);
        toast.success('Item added');
      }

      setShowAddDialog(false);
      resetForm();
      loadItems();
    } catch (error) {
      toast.error('Failed to save item');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await api.deletePantryItem(itemId);
      toast.success('Item deleted');
      loadItems();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const openEditDialog = (item: PantryItem) => {
    setEditingItem(item);
    setFormData({
      ingredient_name: item.ingredient_name,
      amount: item.amount || '',
      unit: item.unit || '',
      location: item.location,
      expiration_date: item.expiration_date || '',
      purchase_date: item.purchase_date || '',
      notes: item.notes || '',
    });
    setShowAddDialog(true);
  };

  const getExpirationBadge = (item: PantryItem) => {
    if (!item.expiration_date) return null;

    const days = item.days_until_expiration;
    if (days === null) return null;

    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
          <AlertTriangle className="h-3 w-3" />
          {t.expired}
        </span>
      );
    }

    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
          <Calendar className="h-3 w-3" />
          {t.expires} {t.today}
        </span>
      );
    }

    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
          <Calendar className="h-3 w-3" />
          {days} {t.daysLeft}
        </span>
      );
    }

    return (
      <span className="text-xs text-muted-foreground">
        {t.expires} {formatDate(item.expiration_date)}
      </span>
    );
  };

  if (authLoading || loading) {
    return <LoadingScreen message={t.loading} />;
  }

  const filteredItems = items.filter(item =>
    !searchQuery || item.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 px-6 md:px-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t.myPantry}</h1>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t.addItem}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItem ? t.editItem : t.addItemTitle}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t.ingredientName}</Label>
                  <Input
                    id="name"
                    value={formData.ingredient_name}
                    onChange={(e) => setFormData({ ...formData, ingredient_name: e.target.value })}
                    placeholder="e.g., Milk, Eggs, Butter..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">{t.amount}</Label>
                    <Input
                      id="amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g., 1, 500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">{t.unit}</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., L, g, pc"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">{t.location}</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value as StorageLocation })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fridge">{t.fridge}</SelectItem>
                      <SelectItem value="freezer">{t.freezer}</SelectItem>
                      <SelectItem value="pantry">{t.pantryLoc}</SelectItem>
                      <SelectItem value="counter">{t.counter}</SelectItem>
                      <SelectItem value="other">{t.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expiration">{t.expirationDate}</Label>
                    <Input
                      id="expiration"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="purchase">{t.purchaseDate}</Label>
                    <Input
                      id="purchase"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">{t.notes}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={handleSave}>{t.save}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Expiring Alert */}
        {expiringCount > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium text-yellow-700 dark:text-yellow-300">
                {expiringCount} {t.expiringAlert}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t.search}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Location Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StorageLocation | 'all')} className="mb-6">
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="all">{t.all}</TabsTrigger>
            <TabsTrigger value="fridge">{t.fridge}</TabsTrigger>
            <TabsTrigger value="freezer">{t.freezer}</TabsTrigger>
            <TabsTrigger value="pantry">{t.pantryLoc}</TabsTrigger>
            <TabsTrigger value="counter">{t.counter}</TabsTrigger>
            <TabsTrigger value="other">{t.other}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.noItems}</h3>
              <p className="text-muted-foreground text-center">{t.noItemsDesc}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => {
              const LocationIcon = locationIcons[item.location];
              const colorClass = locationColors[item.location];

              return (
                <Card key={item.id} className={`group ${item.is_expiring_soon ? 'border-yellow-300 dark:border-yellow-700' : ''}`}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <LocationIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{item.ingredient_name}</h3>
                        {getExpirationBadge(item)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.amount && item.unit && `${item.amount} ${item.unit}`}
                        {item.amount && !item.unit && item.amount}
                        {item.category && (
                          <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
