'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { RecipeMatchResult } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChefHat,
  Clock,
  Loader2,
  Plus,
  Search,
  Users,
  UtensilsCrossed,
  X,
  Check,
} from 'lucide-react';
import { StarRatingDisplay } from '@/components/star-rating';

const translations = {
  en: {
    title: 'Cook from Ingredients',
    subtitle: 'Find recipes based on what you have',
    back: 'Recipes',
    inputPlaceholder: 'Type an ingredient and press Enter...',
    search: 'Search',
    clear: 'Clear All',
    noIngredients: 'Add ingredients to find matching recipes',
    noIngredientsDesc: 'Type the ingredients you have available and we\'ll find recipes you can make',
    searching: 'Searching recipes...',
    noResults: 'No matching recipes found',
    noResultsDesc: 'Try adding more ingredients or removing some',
    matchOf: 'of',
    ingredients: 'ingredients',
    missing: 'Missing',
    matched: 'Have',
    min: 'min',
    results: 'results',
    result: 'result',
    addIngredient: 'Add',
  },
  ro: {
    title: 'Gătește din Ingrediente',
    subtitle: 'Găsește rețete cu ce ai în casă',
    back: 'Rețete',
    inputPlaceholder: 'Scrie un ingredient și apasă Enter...',
    search: 'Caută',
    clear: 'Șterge Tot',
    noIngredients: 'Adaugă ingrediente pentru a găsi rețete',
    noIngredientsDesc: 'Scrie ingredientele pe care le ai și îți vom găsi rețete potrivite',
    searching: 'Se caută rețete...',
    noResults: 'Nicio rețetă găsită',
    noResultsDesc: 'Încearcă să adaugi mai multe ingrediente sau să elimini unele',
    matchOf: 'din',
    ingredients: 'ingrediente',
    missing: 'Lipsă',
    matched: 'Ai',
    min: 'min',
    results: 'rezultate',
    result: 'rezultat',
    addIngredient: 'Adaugă',
  },
};

export default function CookFromIngredientsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<RecipeMatchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsTimeout = useRef<NodeJS.Timeout>();

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (suggestionsTimeout.current) {
      clearTimeout(suggestionsTimeout.current);
    }

    if (inputValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionsTimeout.current = setTimeout(async () => {
      try {
        const data = await api.getIngredientSuggestions(inputValue);
        setSuggestions(data.suggestions.filter((s) => !ingredients.includes(s)));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
      }
    }, 300);

    return () => {
      if (suggestionsTimeout.current) {
        clearTimeout(suggestionsTimeout.current);
      }
    };
  }, [inputValue, ingredients]);

  // Search recipes when ingredients change
  const searchRecipes = useCallback(async () => {
    if (ingredients.length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await api.searchByIngredients(ingredients);
      setResults(data.results);
    } catch (error) {
      toast.error('Failed to search recipes');
    } finally {
      setIsSearching(false);
    }
  }, [ingredients]);

  useEffect(() => {
    if (ingredients.length > 0) {
      searchRecipes();
    }
  }, [ingredients, searchRecipes]);

  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
    }
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter((i) => i !== ingredient));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addIngredient(inputValue);
    }
  };

  const clearAll = () => {
    setIngredients([]);
    setResults([]);
    setHasSearched(false);
    setInputValue('');
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
          {/* Back button */}
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Link>
          </Button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground text-sm">{t.subtitle}</p>
            </div>
          </div>

          {/* Ingredient Input */}
          <div className="max-w-2xl">
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder={t.inputPlaceholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="pl-10"
                  />
                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm"
                          onMouseDown={() => addIngredient(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => inputValue.trim() && addIngredient(inputValue)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.addIngredient}
                </Button>
              </div>
            </div>

            {/* Ingredient Tags */}
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {ingredients.map((ingredient) => (
                  <Badge
                    key={ingredient}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm flex items-center gap-2"
                  >
                    {ingredient}
                    <button
                      type="button"
                      onClick={() => removeIngredient(ingredient)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-muted-foreground"
                >
                  {t.clear}
                </Button>
              </div>
            )}
          </div>

          {/* Results */}
          {ingredients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.noIngredients}</h2>
              <p className="text-muted-foreground max-w-md">{t.noIngredientsDesc}</p>
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.searching}</p>
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <ChefHat className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.noResults}</h2>
              <p className="text-muted-foreground max-w-md">{t.noResultsDesc}</p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                {results.length} {results.length === 1 ? t.result : t.results}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((match) => (
                  <Link key={match.recipe.id} href={`/recipes/${match.recipe.id}`}>
                    <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden">
                      {match.recipe.image_url ? (
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={match.recipe.image_url}
                            alt={match.recipe.title}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge
                              variant={match.match_percentage >= 80 ? 'default' : match.match_percentage >= 50 ? 'secondary' : 'outline'}
                              className="bg-background/90 backdrop-blur-sm"
                            >
                              {Math.round(match.match_percentage)}%
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center relative">
                          <ChefHat className="h-12 w-12 text-muted-foreground/30" />
                          <div className="absolute top-2 right-2">
                            <Badge
                              variant={match.match_percentage >= 80 ? 'default' : match.match_percentage >= 50 ? 'secondary' : 'outline'}
                            >
                              {Math.round(match.match_percentage)}%
                            </Badge>
                          </div>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                          {match.recipe.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {match.match_count} {t.matchOf} {match.total_ingredients} {t.ingredients}
                        </p>
                        {match.matched_ingredients.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {match.matched_ingredients.slice(0, 3).map((ing) => (
                              <Badge key={ing} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <Check className="h-2.5 w-2.5 mr-1" />
                                {ing}
                              </Badge>
                            ))}
                            {match.matched_ingredients.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{match.matched_ingredients.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        {match.missing_ingredients.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {match.missing_ingredients.slice(0, 2).map((ing) => (
                              <Badge key={ing} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                {ing}
                              </Badge>
                            ))}
                            {match.missing_ingredients.length > 2 && (
                              <Badge variant="outline" className="text-xs text-orange-700">
                                +{match.missing_ingredients.length - 2} {t.missing.toLowerCase()}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground gap-3 pt-0">
                        {match.recipe.rating && <StarRatingDisplay rating={match.recipe.rating} size="sm" />}
                        {match.recipe.prep_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {match.recipe.prep_time_minutes} {t.min}
                          </span>
                        )}
                        {match.recipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {match.recipe.servings}
                          </span>
                        )}
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
