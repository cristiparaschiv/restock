'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { PriceHistory, PriceTrend, Store, PriceHistoryCreate } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Plus,
  DollarSign,
  History,
  BarChart3,
  Search,
  Trash2,
  Store as StoreIcon,
} from 'lucide-react';

const translations = {
  en: {
    title: 'Price Tracking',
    subtitle: 'Track ingredient prices and find the best deals',
    recordPrice: 'Record Price',
    noRecords: 'No price records yet',
    noRecordsDesc: 'Start recording prices to track spending over time',
    loading: 'Loading...',
    history: 'History',
    trends: 'Trends',
    ingredient: 'Ingredient',
    ingredientPlaceholder: 'e.g., Milk, Bread',
    price: 'Price',
    pricePlaceholder: '0.00',
    currency: 'Currency',
    amount: 'Amount',
    amountPlaceholder: 'e.g., 1',
    unit: 'Unit',
    unitPlaceholder: 'e.g., gallon, loaf',
    store: 'Store',
    selectStore: 'Select a store',
    noStore: 'No store',
    date: 'Date',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    delete: 'Delete',
    avgPrice: 'Avg',
    minPrice: 'Min',
    maxPrice: 'Max',
    change: 'Change',
    currentPrice: 'Current',
    entries: 'entries',
    noTrends: 'No trends yet',
    noTrendsDesc: 'Record multiple prices for the same ingredient to see trends',
    searchPlaceholder: 'Search ingredients...',
    recordedOn: 'Recorded',
    all: 'All',
    priceUp: 'Price increased',
    priceDown: 'Price decreased',
    priceStable: 'Price stable',
  },
  ro: {
    title: 'Urmărire Prețuri',
    subtitle: 'Urmărește prețurile ingredientelor și găsește cele mai bune oferte',
    recordPrice: 'Înregistrează Preț',
    noRecords: 'Nicio înregistrare încă',
    noRecordsDesc: 'Începe să înregistrezi prețuri pentru a urmări cheltuielile',
    loading: 'Se încarcă...',
    history: 'Istoric',
    trends: 'Tendințe',
    ingredient: 'Ingredient',
    ingredientPlaceholder: 'ex., Lapte, Pâine',
    price: 'Preț',
    pricePlaceholder: '0.00',
    currency: 'Monedă',
    amount: 'Cantitate',
    amountPlaceholder: 'ex., 1',
    unit: 'Unitate',
    unitPlaceholder: 'ex., litru, bucată',
    store: 'Magazin',
    selectStore: 'Selectează magazin',
    noStore: 'Fără magazin',
    date: 'Dată',
    cancel: 'Anulează',
    save: 'Salvează',
    saving: 'Se salvează...',
    delete: 'Șterge',
    avgPrice: 'Med',
    minPrice: 'Min',
    maxPrice: 'Max',
    change: 'Schimbare',
    currentPrice: 'Actual',
    entries: 'înregistrări',
    noTrends: 'Nicio tendință încă',
    noTrendsDesc: 'Înregistrează mai multe prețuri pentru același ingredient',
    searchPlaceholder: 'Caută ingrediente...',
    recordedOn: 'Înregistrat',
    all: 'Toate',
    priceUp: 'Prețul a crescut',
    priceDown: 'Prețul a scăzut',
    priceStable: 'Preț stabil',
  },
};

interface RecordPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
  onSave: (data: PriceHistoryCreate) => Promise<void>;
  t: typeof translations.en;
  initialIngredient?: string;
}

function RecordPriceDialog({ open, onOpenChange, stores, onSave, t, initialIngredient }: RecordPriceDialogProps) {
  const [ingredientName, setIngredientName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [storeId, setStoreId] = useState<string>('');
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setIngredientName(initialIngredient || '');
      setPrice('');
      setAmount('');
      setUnit('');
      setStoreId('');
      setRecordedDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, initialIngredient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientName.trim() || !price) return;

    setIsSaving(true);
    try {
      await onSave({
        ingredient_name: ingredientName.trim(),
        price: parseFloat(price),
        currency,
        amount: amount.trim() || undefined,
        unit: unit.trim() || undefined,
        store_id: storeId || undefined,
        recorded_date: recordedDate,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t.recordPrice}</DialogTitle>
            <DialogDescription>
              {t.ingredient}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ingredient">{t.ingredient}</Label>
              <Input
                id="ingredient"
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
                placeholder={t.ingredientPlaceholder}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">{t.price}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t.pricePlaceholder}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">{t.currency}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="RON">RON (lei)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">{t.amount}</Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t.amountPlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">{t.unit}</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={t.unitPlaceholder}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store">{t.store}</Label>
              <Select value={storeId || "none"} onValueChange={(val) => setStoreId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectStore} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noStore}</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">{t.date}</Label>
              <Input
                id="date"
                type="date"
                value={recordedDate}
                onChange={(e) => setRecordedDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isSaving || !ingredientName.trim() || !price}>
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

function formatCurrency(price: number | string, currency: string) {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    RON: 'lei',
    GBP: '£',
  };
  const symbol = symbols[currency] || currency;
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return currency === 'RON' ? `${numPrice.toFixed(2)} ${symbol}` : `${symbol}${numPrice.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PricesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [trends, setTrends] = useState<PriceTrend[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [historyResponse, trendsResponse, storesData] = await Promise.all([
        api.getPriceHistory(),
        api.getPriceTrends(),
        api.getStores(),
      ]);
      setHistory(historyResponse.history || []);
      setTrends(trendsResponse.ingredients || []);
      setStores(storesData);
    } catch (error) {
      toast.error('Failed to load price data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPrice = async (data: PriceHistoryCreate) => {
    try {
      await api.recordPrice(data);
      toast.success(lang === 'en' ? 'Price recorded' : 'Preț înregistrat');
      loadData();
    } catch (error) {
      toast.error(lang === 'en' ? 'Failed to record price' : 'Eroare la înregistrare');
      throw error;
    }
  };

  const handleDeletePrice = async (id: string) => {
    try {
      await api.deletePrice(id);
      toast.success(lang === 'en' ? 'Price deleted' : 'Preț șters');
      loadData();
    } catch (error) {
      toast.error(lang === 'en' ? 'Failed to delete' : 'Eroare la ștergere');
    }
  };

  const filteredHistory = history.filter((item) =>
    item.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrends = trends.filter((item) =>
    item.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t.recordPrice}
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="pl-9"
            />
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.loading}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <BarChart3 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.noRecords}</h2>
              <p className="text-muted-foreground mb-6 max-w-md">{t.noRecordsDesc}</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.recordPrice}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="trends" className="space-y-6">
              <TabsList>
                <TabsTrigger value="trends" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t.trends}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  {t.history}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="space-y-4">
                {filteredTrends.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-1">{t.noTrends}</h3>
                      <p className="text-sm text-muted-foreground">{t.noTrendsDesc}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTrends.map((trend) => (
                      <Card key={trend.ingredient_name}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{trend.ingredient_name}</CardTitle>
                            {trend.price_change_percent !== null && (
                              <Badge
                                variant={
                                  trend.price_change_percent > 0
                                    ? 'destructive'
                                    : trend.price_change_percent < 0
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="flex items-center gap-1"
                              >
                                {trend.price_change_percent > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : trend.price_change_percent < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <Minus className="h-3 w-3" />
                                )}
                                {trend.price_change_percent > 0 ? '+' : ''}
                                {trend.price_change_percent.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                          <CardDescription>
                            {trend.history.length} {t.entries}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {trend.current_price !== null && (
                              <div>
                                <p className="text-muted-foreground">{t.currentPrice}</p>
                                <p className="font-semibold text-lg">
                                  {formatCurrency(trend.current_price, trend.history[0]?.currency || 'USD')}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-muted-foreground">{t.avgPrice}</p>
                              <p className="font-medium">
                                {formatCurrency(trend.average_price, trend.history[0]?.currency || 'USD')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t.minPrice}</p>
                              <p className="font-medium text-green-600">
                                {formatCurrency(trend.min_price, trend.history[0]?.currency || 'USD')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t.maxPrice}</p>
                              <p className="font-medium text-red-600">
                                {formatCurrency(trend.max_price, trend.history[0]?.currency || 'USD')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.ingredient}</TableHead>
                        <TableHead>{t.price}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t.amount}</TableHead>
                        <TableHead className="hidden md:table-cell">{t.store}</TableHead>
                        <TableHead>{t.date}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                          <TableCell>{formatCurrency(item.price, item.currency)}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {item.amount && item.unit
                              ? `${item.amount} ${item.unit}`
                              : item.amount || item.unit || '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {item.store_name ? (
                              <span className="flex items-center gap-1">
                                <StoreIcon className="h-3 w-3" />
                                {item.store_name}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{formatDate(item.recorded_date)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeletePrice(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <RecordPriceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stores={stores}
        onSave={handleRecordPrice}
        t={t}
        initialIngredient={selectedIngredient || undefined}
      />
    </div>
  );
}
