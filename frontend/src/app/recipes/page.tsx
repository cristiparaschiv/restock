'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Recipe, Category } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { BookOpen, ChefHat, ChevronLeft, ChevronRight, Clock, Filter, Globe, Heart, Loader2, Plus, Search, Star, Tag, Users, UtensilsCrossed, X } from 'lucide-react';
import { FavoriteButton } from '@/components/favorite-button';
import { StarRatingDisplay } from '@/components/star-rating';

const translations = {
  en: {
    title: 'My Recipes',
    subtitle: 'Your personal recipe collection',
    search: 'Search recipes...',
    import: 'Import Recipe',
    create: 'Create Recipe',
    cookFrom: 'Cook from Ingredients',
    noRecipes: 'No recipes yet',
    noRecipesDesc: 'Start building your recipe collection',
    startAdding: 'Import your first recipe from the web or create one from scratch',
    noResults: 'No recipes found',
    noResultsDesc: 'Try adjusting your search terms',
    prep: 'Prep',
    cook: 'Cook',
    servings: 'Servings',
    min: 'min',
    loading: 'Loading...',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    all: 'All',
    favorites: 'Favorites',
    noFavorites: 'No favorites yet',
    noFavoritesDesc: 'Heart your favorite recipes to find them quickly',
    quickMeals: 'Quick (< 30 min)',
    under60: 'Under 1 hour',
    anyTime: 'Any time',
    clearFilters: 'Clear filters',
    filters: 'Filters',
    anyRating: 'Any rating',
    rated4Plus: '4+ stars',
    rated5: '5 stars',
  },
  ro: {
    title: 'Rețetele Mele',
    subtitle: 'Colecția ta personală de rețete',
    search: 'Caută rețete...',
    import: 'Importă Rețetă',
    create: 'Creează Rețetă',
    cookFrom: 'Gătește din Ingrediente',
    noRecipes: 'Nicio rețetă încă',
    noRecipesDesc: 'Începe să-ți construiești colecția de rețete',
    startAdding: 'Importă prima ta rețetă de pe web sau creează una de la zero',
    noResults: 'Nicio rețetă găsită',
    noResultsDesc: 'Încearcă să ajustezi termenii de căutare',
    prep: 'Prep',
    cook: 'Gătit',
    servings: 'Porții',
    min: 'min',
    loading: 'Se încarcă...',
    previous: 'Anterior',
    next: 'Următor',
    page: 'Pagina',
    of: 'din',
    all: 'Toate',
    favorites: 'Favorite',
    noFavorites: 'Nicio favorită încă',
    noFavoritesDesc: 'Apasă pe inimă pentru a găsi rețetele favorite mai ușor',
    quickMeals: 'Rapide (< 30 min)',
    under60: 'Sub 1 oră',
    anyTime: 'Orice durată',
    clearFilters: 'Șterge filtrele',
    filters: 'Filtre',
    anyRating: 'Orice rating',
    rated4Plus: '4+ stele',
    rated5: '5 stele',
  },
};

export default function RecipesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFavorites, setShowFavorites] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [maxTime, setMaxTime] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
      loadCategories();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
    }
  }, [page, search, showFavorites, selectedCategory, maxTime, minRating]);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      const response = await api.getRecipes(
        page,
        20,
        search || undefined,
        showFavorites || undefined,
        selectedCategory,
        maxTime,
        undefined, // hasNutrition
        minRating
      );
      setRecipes(response.recipes);
      setTotalPages(response.total_pages);
    } catch (error) {
      toast.error('Failed to load recipes');
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters = showFavorites || selectedCategory || maxTime || minRating;

  const clearAllFilters = () => {
    setShowFavorites(false);
    setSelectedCategory(undefined);
    setMaxTime(undefined);
    setMinRating(undefined);
    setSearch('');
    setPage(1);
  };

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSearched = search.length > 0;
  const isEmpty = recipes.length === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline">
                <Link href="/recipes/cook-from-ingredients">
                  <UtensilsCrossed className="h-4 w-4 mr-2" />
                  {t.cookFrom}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recipes/new">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.create}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/recipes/import">
                  <Globe className="h-4 w-4 mr-2" />
                  {t.import}
                </Link>
              </Button>
            </div>
          </div>

          {/* Filters */}
          {(recipes.length > 0 || hasSearched || showFavorites || !isEmpty) && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.search}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={showFavorites ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowFavorites(!showFavorites);
                    setPage(1);
                  }}
                  className="gap-2"
                >
                  <Heart className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
                  {t.favorites}
                </Button>
                {categories.length > 0 && (
                  <Select
                    value={selectedCategory || 'all'}
                    onValueChange={(value) => {
                      setSelectedCategory(value === 'all' ? undefined : value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="min-w-[140px] w-auto h-9">
                      <Tag className="h-4 w-4 mr-2 flex-shrink-0" />
                      <SelectValue placeholder={t.all} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.all}</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color || '#6b7280' }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={maxTime?.toString() || 'any'}
                  onValueChange={(value) => {
                    setMaxTime(value === 'any' ? undefined : parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="min-w-[140px] w-auto h-9">
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue placeholder={t.anyTime} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t.anyTime}</SelectItem>
                    <SelectItem value="30">{t.quickMeals}</SelectItem>
                    <SelectItem value="60">{t.under60}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={minRating?.toString() || 'any'}
                  onValueChange={(value) => {
                    setMinRating(value === 'any' ? undefined : parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="min-w-[140px] w-auto h-9">
                    <Star className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue placeholder={t.anyRating} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t.anyRating}</SelectItem>
                    <SelectItem value="4">{t.rated4Plus}</SelectItem>
                    <SelectItem value="5">{t.rated5}</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="gap-2 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                    {t.clearFilters}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.loading}</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                {showFavorites ? (
                  <Heart className="h-12 w-12 text-muted-foreground" />
                ) : (
                  <ChefHat className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {showFavorites ? t.noFavorites : hasSearched ? t.noResults : t.noRecipes}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {showFavorites ? t.noFavoritesDesc : hasSearched ? t.noResultsDesc : t.startAdding}
              </p>
              {!hasSearched && !showFavorites && (
                <div className="flex gap-3">
                  <Button asChild variant="outline">
                    <Link href="/recipes/new">
                      <Plus className="h-4 w-4 mr-2" />
                      {t.create}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/recipes/import">
                      <Globe className="h-4 w-4 mr-2" />
                      {t.import}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                    <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden relative">
                      {recipe.image_url ? (
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute top-2 right-2">
                            <FavoriteButton
                              recipeId={recipe.id}
                              isFavorite={recipe.is_favorite}
                              className="bg-white/80 hover:bg-white shadow-sm"
                              onToggle={() => loadRecipes()}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center relative">
                          <ChefHat className="h-12 w-12 text-muted-foreground/30" />
                          <div className="absolute top-2 right-2">
                            <FavoriteButton
                              recipeId={recipe.id}
                              isFavorite={recipe.is_favorite}
                              onToggle={() => loadRecipes()}
                            />
                          </div>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                          {recipe.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {recipe.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {recipe.description}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground gap-3 pt-0">
                        {recipe.rating && (
                          <StarRatingDisplay rating={recipe.rating} size="sm" />
                        )}
                        {recipe.prep_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recipe.prep_time_minutes} {t.min}
                          </span>
                        )}
                        {recipe.cook_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recipe.cook_time_minutes} {t.min}
                          </span>
                        )}
                        {recipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {recipe.servings}
                          </span>
                        )}
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t.previous}
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    {t.page} {page} {t.of} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {t.next}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
