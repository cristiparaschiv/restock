'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Recipe } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, ChefHat, ExternalLink } from 'lucide-react';

const translations = {
  en: {
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    prep: 'Prep',
    cook: 'Cook',
    total: 'Total',
    servings: 'Servings',
    min: 'min',
    source: 'Original recipe',
    viewIn: 'View in',
    english: 'English',
    romanian: 'Romanian',
    loading: 'Loading recipe...',
    notFound: 'Recipe not found',
    notFoundDesc: 'This recipe may have been unshared or the link is incorrect.',
    getRestok: 'Get Restok',
    ctaDescription: 'Save, organize, and cook your favorite recipes',
    nutrition: 'Nutrition',
    perServing: 'per serving',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
  },
  ro: {
    ingredients: 'Ingrediente',
    instructions: 'Instrucțiuni',
    prep: 'Preparare',
    cook: 'Gătit',
    total: 'Total',
    servings: 'Porții',
    min: 'min',
    source: 'Rețeta originală',
    viewIn: 'Vezi în',
    english: 'Engleză',
    romanian: 'Română',
    loading: 'Se încarcă rețeta...',
    notFound: 'Rețeta nu a fost găsită',
    notFoundDesc: 'Această rețetă poate fi fost oprită din partajare sau linkul este incorect.',
    getRestok: 'Obține Restok',
    ctaDescription: 'Salvează, organizează și gătește rețetele tale preferate',
    nutrition: 'Nutriție',
    perServing: 'per porție',
    calories: 'Calorii',
    protein: 'Proteine',
    carbs: 'Carbohidrați',
    fat: 'Grăsimi',
  },
};

export default function SharedRecipePage() {
  const params = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLang, setDisplayLang] = useState<'en' | 'ro'>('en');

  const t = translations[displayLang];

  useEffect(() => {
    if (params.token) {
      loadRecipe(displayLang);
    }
  }, [params.token, displayLang]);

  const loadRecipe = async (lang: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSharedRecipe(params.token as string, lang);
      setRecipe(data);
      // Set display language to recipe's original language on first load
      if (!recipe) {
        setDisplayLang(data.original_language as 'en' | 'ro');
      }
    } catch (err) {
      setError('Recipe not found');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <ChefHat className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t.notFound}</h2>
            <p className="text-muted-foreground mb-6">{t.notFoundDesc}</p>
            <Button asChild>
              <Link href="/">{t.getRestok}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            Restok
          </Link>
          <Tabs value={displayLang} onValueChange={(v) => setDisplayLang(v as 'en' | 'ro')}>
            <TabsList>
              <TabsTrigger value="en">{t.english}</TabsTrigger>
              <TabsTrigger value="ro">{t.romanian}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Recipe Image */}
          {recipe.image_url && (
            <div className="aspect-video relative overflow-hidden rounded-lg max-h-96">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          {/* Title and Description */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-muted-foreground text-lg">{recipe.description}</p>
            )}
          </div>

          {/* Time and Servings */}
          <div className="flex flex-wrap gap-4 text-sm">
            {recipe.prep_time_minutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.prep}:</span> {recipe.prep_time_minutes} {t.min}
              </div>
            )}
            {recipe.cook_time_minutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.cook}:</span> {recipe.cook_time_minutes} {t.min}
              </div>
            )}
            {recipe.total_time_minutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.total}:</span> {recipe.total_time_minutes} {t.min}
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.servings}:</span> {recipe.servings}
              </div>
            )}
          </div>

          <Separator />

          {/* Ingredients and Instructions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>{t.ingredients}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-medium">
                        {ing.amount && `${ing.amount} `}
                        {ing.unit && `${ing.unit} `}
                      </span>
                      <span>{ing.name}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t.instructions}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 list-decimal list-inside">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Nutrition */}
          {recipe.nutrition && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.nutrition} ({t.perServing})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {recipe.nutrition.calories_per_serving && (
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{recipe.nutrition.calories_per_serving}</div>
                      <div className="text-sm text-muted-foreground">{t.calories}</div>
                    </div>
                  )}
                  {recipe.nutrition.protein_g && (
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{recipe.nutrition.protein_g}g</div>
                      <div className="text-sm text-muted-foreground">{t.protein}</div>
                    </div>
                  )}
                  {recipe.nutrition.carbs_g && (
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{recipe.nutrition.carbs_g}g</div>
                      <div className="text-sm text-muted-foreground">{t.carbs}</div>
                    </div>
                  )}
                  {recipe.nutrition.fat_g && (
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{recipe.nutrition.fat_g}g</div>
                      <div className="text-sm text-muted-foreground">{t.fat}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source */}
          {recipe.source_url && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span>{t.source}:</span>
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {new URL(recipe.source_url).hostname}
              </a>
            </div>
          )}

          <Separator />

          {/* CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div>
                <h3 className="font-semibold text-lg">Restok</h3>
                <p className="text-muted-foreground">{t.ctaDescription}</p>
              </div>
              <Button asChild size="lg">
                <Link href="/auth/register">{t.getRestok}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
