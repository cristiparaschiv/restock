'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CategoryOrderEditor } from '@/components/category-order-editor';
import { Settings, Globe, ShoppingCart, Scale } from 'lucide-react';
import { toast } from 'sonner';

const translations = {
  en: {
    title: 'Settings',
    subtitle: 'Manage your preferences',
    language: 'Language',
    languageDesc: 'Choose your preferred display language',
    english: 'English',
    romanian: 'Romanian',
    shoppingList: 'Shopping List',
    shoppingListDesc: 'Customize how your shopping list is organized',
    categoryOrder: 'Category Order',
    categoryOrderDesc: 'Drag to reorder categories to match your supermarket layout',
    unitSystem: 'Unit System',
    unitSystemDesc: 'Choose your preferred measurement system for recipes',
    metric: 'Metric (g, ml, l)',
    imperial: 'Imperial (oz, cups, lb)',
    saved: 'Settings saved',
    loading: 'Loading...',
  },
  ro: {
    title: 'Setări',
    subtitle: 'Gestionează preferințele',
    language: 'Limbă',
    languageDesc: 'Alege limba preferată',
    english: 'Engleză',
    romanian: 'Română',
    shoppingList: 'Listă de Cumpărături',
    shoppingListDesc: 'Personalizează organizarea listei de cumpărături',
    categoryOrder: 'Ordinea Categoriilor',
    categoryOrderDesc: 'Trage pentru a reordona categoriile să corespundă cu supermarketul tău',
    unitSystem: 'Sistem de Măsură',
    unitSystemDesc: 'Alege sistemul de măsură preferat pentru rețete',
    metric: 'Metric (g, ml, l)',
    imperial: 'Imperial (oz, cups, lb)',
    saved: 'Setări salvate',
    loading: 'Se încarcă...',
  },
};

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

export default function SettingsPage() {
  const { user, isLoading, isAuthenticated, updateLanguage, updatePreferences } = useAuth();
  const router = useRouter();
  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  // Local state for unit system to ensure immediate visual feedback
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  // Sync local state with user preferences
  useEffect(() => {
    if (user?.preferences?.unit_system) {
      setUnitSystem(user.preferences.unit_system);
    }
  }, [user?.preferences?.unit_system]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLanguageChange = async (value: string) => {
    try {
      await updateLanguage(value);
      toast.success(translations[value as 'en' | 'ro'].saved);
    } catch (error) {
      toast.error('Failed to update language');
    }
  };

  const handleCategoryOrderChange = async (newOrder: string[]) => {
    try {
      await updatePreferences({ category_order: newOrder });
      toast.success(t.saved);
    } catch (error) {
      toast.error('Failed to update category order');
    }
  };

  const handleUnitSystemChange = async (value: string) => {
    const newValue = value as 'metric' | 'imperial';
    // Update local state immediately for responsive UI
    setUnitSystem(newValue);
    try {
      await updatePreferences({ unit_system: newValue });
      toast.success(t.saved);
    } catch (error) {
      // Revert on error
      setUnitSystem(unitSystem);
      toast.error('Failed to update unit system');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 px-6 md:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const categoryOrder = user.preferences?.category_order || DEFAULT_CATEGORY_ORDER;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 px-6 md:px-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        <div className="space-y-6">
          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t.language}
              </CardTitle>
              <CardDescription>{t.languageDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={user.preferred_language}
                onValueChange={handleLanguageChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="en" id="lang-en" />
                  <Label htmlFor="lang-en" className="cursor-pointer">
                    {t.english}
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="ro" id="lang-ro" />
                  <Label htmlFor="lang-ro" className="cursor-pointer">
                    {t.romanian}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Shopping List Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t.shoppingList}
              </CardTitle>
              <CardDescription>{t.shoppingListDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label>{t.categoryOrder}</Label>
                <p className="text-sm text-muted-foreground">{t.categoryOrderDesc}</p>
                <CategoryOrderEditor
                  categories={categoryOrder}
                  onChange={handleCategoryOrderChange}
                  lang={lang}
                />
              </div>
            </CardContent>
          </Card>

          {/* Unit System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                {t.unitSystem}
              </CardTitle>
              <CardDescription>{t.unitSystemDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={unitSystem}
                onValueChange={handleUnitSystemChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="metric" id="unit-metric" />
                  <Label htmlFor="unit-metric" className="cursor-pointer">
                    {t.metric}
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="imperial" id="unit-imperial" />
                  <Label htmlFor="unit-imperial" className="cursor-pointer">
                    {t.imperial}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
