'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { MealPlan, MealPlanItem, Recipe, MealPlanNutrition } from '@/types';
import { Header } from '@/components/header';
import { LoadingScreen } from '@/components/loading-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  Loader2,
  UtensilsCrossed,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ShoppingCart,
  Flame,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const translations = {
  en: {
    title: 'Meal Planner',
    subtitle: 'Plan your weekly meals',
    today: 'Today',
    addRecipe: 'Add Recipe',
    selectRecipe: 'Select a Recipe',
    search: 'Search recipes...',
    noRecipes: 'No recipes found',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
    mondayFull: 'Monday',
    tuesdayFull: 'Tuesday',
    wednesdayFull: 'Wednesday',
    thursdayFull: 'Thursday',
    fridayFull: 'Friday',
    saturdayFull: 'Saturday',
    sundayFull: 'Sunday',
    emptySlot: 'Click + to add',
    loading: 'Loading meal plan...',
    remove: 'Remove',
    generateShoppingList: 'Shopping List',
    cal: 'cal',
  },
  ro: {
    title: 'Planificator Mese',
    subtitle: 'Planifică mesele săptămânii',
    today: 'Astăzi',
    addRecipe: 'Adaugă Rețetă',
    selectRecipe: 'Selectează o Rețetă',
    search: 'Caută rețete...',
    noRecipes: 'Nicio rețetă găsită',
    breakfast: 'Mic dejun',
    lunch: 'Prânz',
    dinner: 'Cină',
    snack: 'Gustare',
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mie',
    thursday: 'Joi',
    friday: 'Vin',
    saturday: 'Sâm',
    sunday: 'Dum',
    mondayFull: 'Luni',
    tuesdayFull: 'Marți',
    wednesdayFull: 'Miercuri',
    thursdayFull: 'Joi',
    fridayFull: 'Vineri',
    saturdayFull: 'Sâmbătă',
    sundayFull: 'Duminică',
    emptySlot: 'Click + pentru a adăuga',
    loading: 'Se încarcă planul...',
    remove: 'Șterge',
    generateShoppingList: 'Listă Cumpărături',
    cal: 'cal',
  },
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function MealTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'breakfast':
      return <Coffee className="h-4 w-4" />;
    case 'lunch':
      return <Sun className="h-4 w-4" />;
    case 'dinner':
      return <Moon className="h-4 w-4" />;
    case 'snack':
      return <Cookie className="h-4 w-4" />;
    default:
      return <UtensilsCrossed className="h-4 w-4" />;
  }
}

export default function MealPlannerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  } | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [generatingList, setGeneratingList] = useState(false);
  const [dailyNutrition, setDailyNutrition] = useState<MealPlanNutrition | null>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState<number>(() => {
    // Default to today's day index (0 = Monday, 6 = Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });

  const dayNames = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday];
  const dayNamesFull = [t.mondayFull, t.tuesdayFull, t.wednesdayFull, t.thursdayFull, t.fridayFull, t.saturdayFull, t.sundayFull];
  const mealTypeNames: Record<string, string> = {
    breakfast: t.breakfast,
    lunch: t.lunch,
    dinner: t.dinner,
    snack: t.snack,
  };

  const loadMealPlan = useCallback(async () => {
    try {
      setLoading(true);
      const plan = await api.getMealPlan(formatDate(weekStart));
      setMealPlan(plan);
      // Load nutrition data
      if (plan.items.length > 0) {
        try {
          const nutrition = await api.getMealPlanNutrition(plan.id);
          setDailyNutrition(nutrition);
        } catch (e) {
          setDailyNutrition(null);
        }
      } else {
        setDailyNutrition(null);
      }
    } catch (error) {
      console.error('Failed to load meal plan:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadMealPlan();
  }, [loadMealPlan]);

  const loadRecipes = useCallback(async () => {
    try {
      setLoadingRecipes(true);
      const response = await api.getRecipes(1, 50, searchQuery || undefined);
      setRecipes(response.recipes);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (dialogOpen) {
      loadRecipes();
    }
  }, [dialogOpen, loadRecipes]);

  const handlePrevWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const handleToday = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  const handleOpenDialog = (dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedSlot({ dayOfWeek, mealType });
    setDialogOpen(true);
  };

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!mealPlan || !selectedSlot) return;

    try {
      await api.addMealPlanItem(mealPlan.id, {
        recipe_id: recipe.id,
        day_of_week: selectedSlot.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        meal_type: selectedSlot.mealType,
        servings: recipe.servings || 1,
      });
      await loadMealPlan();
      setDialogOpen(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to add recipe:', error);
    }
  };

  const handleRemoveItem = async (item: MealPlanItem) => {
    if (!mealPlan) return;

    try {
      await api.removeMealPlanItem(mealPlan.id, item.id);
      await loadMealPlan();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!mealPlan || mealPlan.items.length === 0) return;

    try {
      setGeneratingList(true);
      const list = await api.generateShoppingListFromMealPlan(mealPlan.id);
      router.push(`/shopping-lists/${list.id}`);
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
    } finally {
      setGeneratingList(false);
    }
  };

  const getItemsForSlot = (dayOfWeek: number, mealType: string): MealPlanItem[] => {
    if (!mealPlan) return [];
    return mealPlan.items.filter(
      item => item.day_of_week === dayOfWeek && item.meal_type === mealType
    );
  };

  const isToday = (dayOfWeek: number): boolean => {
    const today = new Date();
    const weekStartDate = new Date(weekStart);
    const dayDate = addDays(weekStartDate, dayOfWeek);
    return formatDate(dayDate) === formatDate(today);
  };

  const formatWeekRange = (): string => {
    const endOfWeek = addDays(weekStart, 6);
    const startMonth = weekStart.toLocaleDateString(lang === 'en' ? 'en-US' : 'ro-RO', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString(lang === 'en' ? 'en-US' : 'ro-RO', { month: 'short' });

    if (startMonth === endMonth) {
      return `${weekStart.getDate()} - ${endOfWeek.getDate()} ${startMonth} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth} ${weekStart.getFullYear()}`;
  };

  if (loading) {
    return <LoadingScreen message={t.loading} />;
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
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            {t.today}
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {mealPlan && mealPlan.items.length > 0 && (
            <Button
              size="sm"
              onClick={handleGenerateShoppingList}
              disabled={generatingList}
              className="ml-2"
            >
              {generatingList ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              {t.generateShoppingList}
            </Button>
          )}
        </div>
      </div>

      {/* Week Display */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{formatWeekRange()}</h2>
      </div>

      {/* Mobile View - Day by Day */}
      <div className="md:hidden">
        {/* Mobile Day Selector */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedMobileDay(prev => prev === 0 ? 6 : prev - 1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-1 justify-center">
              {DAYS.map(day => {
                const dayDate = addDays(weekStart, day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedMobileDay(day)}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors min-w-[48px] ${
                      selectedMobileDay === day
                        ? 'bg-primary text-primary-foreground'
                        : isToday(day)
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="text-xs font-medium">{dayNames[day]}</span>
                    <span className="text-sm">{dayDate.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedMobileDay(prev => prev === 6 ? 0 : prev + 1)}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Daily Calories */}
        {(() => {
          const dayKey = `day_${selectedMobileDay}` as keyof MealPlanNutrition;
          const dayCalories = dailyNutrition?.[dayKey]?.calories || 0;
          return dayCalories > 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-orange-600 mb-4">
              <Flame className="h-4 w-4" />
              <span>{dayCalories} {t.cal}</span>
            </div>
          ) : null;
        })()}

        {/* Mobile Meal Cards */}
        <div className="space-y-3">
          {MEAL_TYPES.map(mealType => {
            const items = getItemsForSlot(selectedMobileDay, mealType);
            return (
              <Card key={mealType}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MealTypeIcon type={mealType} />
                    <span className="font-medium">{mealTypeNames[mealType]}</span>
                  </div>

                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                        >
                          {item.recipe.image_url && (
                            <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={item.recipe.image_url}
                                alt={item.recipe.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <Link href={`/recipes/${item.recipe.id}`} className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.recipe.title}</p>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(item)}
                            aria-label={`${t.remove} ${item.recipe.title}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleOpenDialog(selectedMobileDay, mealType)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t.addRecipe}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Desktop Calendar Grid - Hidden on Mobile */}
      <div className="max-md:hidden block overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="p-2"></div>
            {DAYS.map(day => {
              const dayDate = addDays(weekStart, day);
              const dayKey = `day_${day}` as keyof MealPlanNutrition;
              const dayCalories = dailyNutrition?.[dayKey]?.calories || 0;
              return (
                <div
                  key={day}
                  className={`p-3 text-center rounded-lg ${
                    isToday(day)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="font-semibold">{dayNames[day]}</div>
                  <div className="text-sm opacity-80">{dayDate.getDate()}</div>
                  {dayCalories > 0 && (
                    <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                      isToday(day) ? 'text-primary-foreground/80' : 'text-orange-600'
                    }`}>
                      <Flame className="h-3 w-3" />
                      {dayCalories} {t.cal}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Meal Rows */}
          {MEAL_TYPES.map(mealType => (
            <div key={mealType} className="grid grid-cols-8 gap-2 mb-2">
              {/* Meal Type Label */}
              <div className="p-3 flex items-center gap-2 bg-muted/30 rounded-lg">
                <MealTypeIcon type={mealType} />
                <span className="text-sm font-medium">{mealTypeNames[mealType]}</span>
              </div>

              {/* Day Slots */}
              {DAYS.map(day => {
                const items = getItemsForSlot(day, mealType);
                return (
                  <Card
                    key={`${day}-${mealType}`}
                    className={`min-h-[100px] ${
                      isToday(day) ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <CardContent className="p-2 h-full">
                      {items.length > 0 ? (
                        <div className="space-y-1">
                          {items.map(item => (
                            <div
                              key={item.id}
                              className="group relative bg-primary/5 rounded-md p-2 hover:bg-primary/10 transition-colors"
                            >
                              <Link
                                href={`/recipes/${item.recipe.id}`}
                                className="block"
                              >
                                <div className="flex items-start gap-2">
                                  {item.recipe.image_url && (
                                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                      <Image
                                        src={item.recipe.image_url}
                                        alt={item.recipe.title}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {item.recipe.title}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveItem(item);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all"
                                aria-label={`${t.remove} ${item.recipe.title}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => handleOpenDialog(day, mealType)}
                            className="w-full p-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors flex items-center justify-center gap-1"
                            aria-label={`${t.addRecipe} for ${mealTypeNames[mealType]}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenDialog(day, mealType)}
                          className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors"
                          aria-label={`${t.addRecipe} for ${mealTypeNames[mealType]}`}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Recipe Selection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              {t.selectRecipe}
            </DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <p className="text-sm text-muted-foreground">
              {dayNamesFull[selectedSlot.dayOfWeek]} - {mealTypeNames[selectedSlot.mealType]}
            </p>
          )}

          <div className="space-y-4 overflow-hidden">
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <ScrollArea className="h-[300px]">
              {loadingRecipes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : recipes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.noRecipes}
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {recipes.map(recipe => (
                    <button
                      key={recipe.id}
                      onClick={() => handleSelectRecipe(recipe)}
                      className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      {recipe.image_url ? (
                        <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={recipe.image_url}
                            alt={recipe.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-2">{recipe.title}</p>
                        {recipe.total_time_minutes && (
                          <p className="text-sm text-muted-foreground">
                            {recipe.total_time_minutes} min
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
