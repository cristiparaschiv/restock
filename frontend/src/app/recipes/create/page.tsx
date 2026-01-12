'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Ingredient } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const translations = {
  en: {
    title: 'Create Recipe',
    description: 'Add a new recipe manually',
    recipeTitle: 'Recipe Title',
    recipeDescription: 'Description',
    ingredients: 'Ingredients',
    addIngredient: 'Add Ingredient',
    amount: 'Amount',
    unit: 'Unit',
    ingredientName: 'Ingredient',
    instructions: 'Instructions',
    addStep: 'Add Step',
    step: 'Step',
    times: 'Times',
    prepTime: 'Prep Time (minutes)',
    cookTime: 'Cook Time (minutes)',
    servings: 'Servings',
    language: 'Recipe Language',
    create: 'Create Recipe',
    creating: 'Creating...',
    cancel: 'Cancel',
    loading: 'Loading...',
  },
  ro: {
    title: 'Creează Rețetă',
    description: 'Adaugă o rețetă nouă manual',
    recipeTitle: 'Titlu Rețetă',
    recipeDescription: 'Descriere',
    ingredients: 'Ingrediente',
    addIngredient: 'Adaugă Ingredient',
    amount: 'Cantitate',
    unit: 'Unitate',
    ingredientName: 'Ingredient',
    instructions: 'Instrucțiuni',
    addStep: 'Adaugă Pas',
    step: 'Pasul',
    times: 'Timp',
    prepTime: 'Timp Preparare (minute)',
    cookTime: 'Timp Gătit (minute)',
    servings: 'Porții',
    language: 'Limba Rețetei',
    create: 'Creează Rețetă',
    creating: 'Se creează...',
    cancel: 'Anulează',
    loading: 'Se încarcă...',
  },
};

export default function CreateRecipePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { amount: '', unit: '', name: '' },
  ]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [cookTime, setCookTime] = useState<number | ''>('');
  const [servings, setServings] = useState<number | ''>('');
  const [recipeLang, setRecipeLang] = useState<'en' | 'ro'>('en');

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setRecipeLang(user.preferred_language as 'en' | 'ro');
    }
  }, [user]);

  const addIngredient = () => {
    setIngredients([...ingredients, { amount: '', unit: '', name: '' }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value || null };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a recipe title');
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    const validInstructions = instructions.filter((step) => step.trim());
    if (validInstructions.length === 0) {
      toast.error('Please add at least one instruction');
      return;
    }

    setIsLoading(true);

    try {
      const recipe = await api.createRecipe({
        title: title.trim(),
        description: description.trim() || undefined,
        ingredients: validIngredients,
        instructions: validInstructions,
        prep_time_minutes: prepTime || undefined,
        cook_time_minutes: cookTime || undefined,
        servings: servings || undefined,
        language: recipeLang,
      });
      toast.success('Recipe created!');
      router.push(`/recipes/${recipe.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create recipe');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">{t.recipeTitle} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t.recipeDescription}</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.language}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipeLang"
                      value="en"
                      checked={recipeLang === 'en'}
                      onChange={(e) => setRecipeLang(e.target.value as 'en' | 'ro')}
                      className="w-4 h-4"
                    />
                    <span>English</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipeLang"
                      value="ro"
                      checked={recipeLang === 'ro'}
                      onChange={(e) => setRecipeLang(e.target.value as 'en' | 'ro')}
                      className="w-4 h-4"
                    />
                    <span>Română</span>
                  </label>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>{t.ingredients} *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                    {t.addIngredient}
                  </Button>
                </div>
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="w-20">
                      <Label className="text-xs">{t.amount}</Label>
                      <Input
                        placeholder="1"
                        value={ing.amount || ''}
                        onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">{t.unit}</Label>
                      <Input
                        placeholder="cup"
                        value={ing.unit || ''}
                        onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">{t.ingredientName}</Label>
                      <Input
                        placeholder="flour"
                        value={ing.name}
                        onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                      />
                    </div>
                    {ingredients.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredient(i)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>{t.instructions} *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                    {t.addStep}
                  </Button>
                </div>
                {instructions.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-muted-foreground mt-2 w-16">
                      {t.step} {i + 1}
                    </span>
                    <Input
                      value={step}
                      onChange={(e) => updateInstruction(i, e.target.value)}
                      className="flex-1"
                    />
                    {instructions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInstruction(i)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">{t.prepTime}</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    min="0"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cookTime">{t.cookTime}</Label>
                  <Input
                    id="cookTime"
                    type="number"
                    min="0"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings">{t.servings}</Label>
                  <Input
                    id="servings"
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t.creating : t.create}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/recipes">{t.cancel}</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
