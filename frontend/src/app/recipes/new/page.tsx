'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Ingredient, RecipeCreate } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChefHat, Clock, ListOrdered, Plus, ShoppingBasket, Trash2, Users, Loader2, ArrowLeft } from 'lucide-react';

const translations = {
  en: {
    createRecipe: 'Create Recipe',
    createRecipeDesc: 'Add a new recipe to your collection',
    back: 'Back to Recipes',
    basicInfo: 'Basic Information',
    basicInfoDesc: 'Give your recipe a name and description',
    title: 'Recipe Title',
    titlePlaceholder: 'e.g., Grandma\'s Apple Pie',
    description: 'Description',
    descriptionPlaceholder: 'A brief description of your recipe...',
    ingredients: 'Ingredients',
    ingredientsDesc: 'List all the ingredients needed',
    ingredientsRequired: 'At least one ingredient is required',
    instructions: 'Instructions',
    instructionsDesc: 'Step-by-step cooking instructions (optional)',
    details: 'Cooking Details',
    detailsDesc: 'Time and serving information',
    prepTime: 'Prep Time',
    cookTime: 'Cook Time',
    servings: 'Servings',
    minutes: 'minutes',
    people: 'people',
    language: 'Recipe Language',
    create: 'Create Recipe',
    creating: 'Creating...',
    cancel: 'Cancel',
    addIngredient: 'Add Ingredient',
    addStep: 'Add Step',
    amount: 'Qty',
    unit: 'Unit',
    ingredientName: 'Ingredient name',
    step: 'Step',
    english: 'English',
    romanian: 'Romanian',
    loading: 'Loading...',
    noInstructions: 'No instructions added yet',
    noInstructionsHint: 'Click "Add Step" to add cooking steps',
  },
  ro: {
    createRecipe: 'Creează Rețetă',
    createRecipeDesc: 'Adaugă o rețetă nouă în colecția ta',
    back: 'Înapoi la Rețete',
    basicInfo: 'Informații de Bază',
    basicInfoDesc: 'Dă un nume și o descriere rețetei tale',
    title: 'Titlul Rețetei',
    titlePlaceholder: 'ex., Plăcinta cu mere a bunicii',
    description: 'Descriere',
    descriptionPlaceholder: 'O scurtă descriere a rețetei...',
    ingredients: 'Ingrediente',
    ingredientsDesc: 'Listează toate ingredientele necesare',
    ingredientsRequired: 'Cel puțin un ingredient este necesar',
    instructions: 'Instrucțiuni',
    instructionsDesc: 'Pașii de gătit (opțional)',
    details: 'Detalii Gătit',
    detailsDesc: 'Timp și informații despre porții',
    prepTime: 'Timp Preparare',
    cookTime: 'Timp Gătit',
    servings: 'Porții',
    minutes: 'minute',
    people: 'persoane',
    language: 'Limba Rețetei',
    create: 'Creează Rețeta',
    creating: 'Se creează...',
    cancel: 'Anulează',
    addIngredient: 'Adaugă Ingredient',
    addStep: 'Adaugă Pas',
    amount: 'Cant.',
    unit: 'Unitate',
    ingredientName: 'Numele ingredientului',
    step: 'Pas',
    english: 'Engleză',
    romanian: 'Română',
    loading: 'Se încarcă...',
    noInstructions: 'Nicio instrucțiune adăugată',
    noInstructionsHint: 'Apasă "Adaugă Pas" pentru a adăuga pași',
  },
};

export default function CreateRecipePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ amount: '', unit: '', name: '' }]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [recipeLang, setRecipeLang] = useState<'en' | 'ro'>('en');

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (user) {
      setRecipeLang(user.preferred_language as 'en' | 'ro');
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleCreate = async () => {
    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      toast.error(t.ingredientsRequired);
      return;
    }

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsCreating(true);
    try {
      const validInstructions = instructions.filter((step) => step.trim());

      const data: RecipeCreate = {
        title: title.trim(),
        description: description.trim() || undefined,
        ingredients: validIngredients,
        instructions: validInstructions.length > 0 ? validInstructions : undefined,
        prep_time_minutes: prepTime ? parseInt(prepTime) : undefined,
        cook_time_minutes: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        language: recipeLang,
      };

      const recipe = await api.createRecipe(data);
      toast.success('Recipe created');
      router.push(`/recipes/${recipe.id}`);
    } catch (error) {
      toast.error('Failed to create recipe');
    } finally {
      setIsCreating(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { amount: '', unit: '', name: '' }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
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
    setInstructions(instructions.filter((_, i) => i !== index));
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
      <main className="container py-8 px-6 md:px-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t.back}
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.createRecipe}</h1>
              <p className="text-muted-foreground text-sm">{t.createRecipeDesc}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-muted-foreground" />
                {t.basicInfo}
              </CardTitle>
              <CardDescription>{t.basicInfoDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t.title} *</Label>
                <Input
                  id="title"
                  placeholder={t.titlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t.description}</Label>
                <Textarea
                  id="description"
                  placeholder={t.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.language}</Label>
                <Select value={recipeLang} onValueChange={(v) => setRecipeLang(v as 'en' | 'ro')}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t.english}</SelectItem>
                    <SelectItem value="ro">{t.romanian}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBasket className="h-5 w-5 text-muted-foreground" />
                    {t.ingredients} *
                  </CardTitle>
                  <CardDescription>{t.ingredientsDesc}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addIngredient} className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t.addIngredient}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-center group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                    {i + 1}
                  </div>
                  <Input
                    placeholder={t.amount}
                    className="w-20"
                    value={ing.amount || ''}
                    onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                  />
                  <Input
                    placeholder={t.unit}
                    className="w-24"
                    value={ing.unit || ''}
                    onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  />
                  <Input
                    placeholder={t.ingredientName}
                    className="flex-1"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(i)}
                    disabled={ingredients.length <= 1}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ingredient ${ing.name || i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-muted-foreground" />
                    {t.instructions}
                  </CardTitle>
                  <CardDescription>{t.instructionsDesc}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addInstruction} className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t.addStep}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructions.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-lg">
                  <ListOrdered className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground font-medium">{t.noInstructions}</p>
                  <p className="text-muted-foreground text-sm">{t.noInstructionsHint}</p>
                </div>
              ) : (
                instructions.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start group">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium mt-2">
                      {i + 1}
                    </div>
                    <Textarea
                      placeholder={`${t.step} ${i + 1}...`}
                      value={step}
                      onChange={(e) => updateInstruction(i, e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstruction(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-1"
                      aria-label={`Remove step ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                {t.details}
              </CardTitle>
              <CardDescription>{t.detailsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime" className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t.prepTime}
                  </Label>
                  <div className="relative">
                    <Input
                      id="prepTime"
                      type="number"
                      min="0"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {t.minutes}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cookTime" className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t.cookTime}
                  </Label>
                  <div className="relative">
                    <Input
                      id="cookTime"
                      type="number"
                      min="0"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {t.minutes}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings" className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {t.servings}
                  </Label>
                  <div className="relative">
                    <Input
                      id="servings"
                      type="number"
                      min="1"
                      value={servings}
                      onChange={(e) => setServings(e.target.value)}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {t.people}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" asChild>
              <Link href="/recipes">{t.cancel}</Link>
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className="min-w-32">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.creating}
                </>
              ) : (
                t.create
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
