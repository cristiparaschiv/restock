'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Globe, Link2, Loader2, Sparkles, Bot, Zap, CheckCircle, Plus, Trash2, Edit2, X, Save, HelpCircle } from 'lucide-react';
import { RecipePreview, Ingredient, NutritionInfo, RecipeConfirmImport } from '@/types';

const translations = {
  en: {
    title: 'Import Recipe',
    description: 'Paste a URL from any recipe website to import it automatically',
    urlLabel: 'Recipe URL',
    urlPlaceholder: 'https://example.com/recipe/...',
    preview: 'Preview Recipe',
    previewing: 'Extracting recipe...',
    cancel: 'Cancel',
    back: 'Back to Recipes',
    supportedSites: 'Supports 500+ recipe websites.',
    viewSupportedSites: 'View all supported sites',
    success: 'Recipe imported successfully!',
    loading: 'Loading...',
    howItWorks: 'How it works',
    step1: 'Find a recipe you love online',
    step2: 'Copy the recipe URL',
    step3: 'Preview and edit, then save',
    // Preview step
    previewTitle: 'Review & Edit',
    previewDescription: 'Review the extracted data and make any edits before saving',
    extractedVia: 'Extracted via',
    scraper: 'Website Parser',
    custom: 'Custom Parser',
    ai: 'AI Extraction',
    detectedLanguage: 'Detected Language',
    english: 'English',
    romanian: 'Romanian',
    recipeTitle: 'Title',
    recipeDescription: 'Description',
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    prepTime: 'Prep Time',
    cookTime: 'Cook Time',
    servings: 'Servings',
    minutes: 'min',
    tags: 'Tags',
    nutrition: 'Nutrition (per serving)',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    saveRecipe: 'Save Recipe',
    saving: 'Saving...',
    startOver: 'Start Over',
    addIngredient: 'Add Ingredient',
    addStep: 'Add Step',
    addTag: 'Add Tag',
    amount: 'Amount',
    unit: 'Unit',
    name: 'Name',
    step: 'Step',
    editImage: 'Edit Image URL',
    noImage: 'No image found',
  },
  ro: {
    title: 'Importă Rețetă',
    description: 'Lipește un URL de pe orice site de rețete pentru a-l importa automat',
    urlLabel: 'URL Rețetă',
    urlPlaceholder: 'https://example.com/reteta/...',
    preview: 'Previzualizează',
    previewing: 'Se extrage rețeta...',
    cancel: 'Anulează',
    back: 'Înapoi la Rețete',
    supportedSites: 'Suportă peste 500 de site-uri de rețete.',
    viewSupportedSites: 'Vezi toate site-urile suportate',
    success: 'Rețeta a fost importată cu succes!',
    loading: 'Se încarcă...',
    howItWorks: 'Cum funcționează',
    step1: 'Găsește o rețetă online',
    step2: 'Copiază URL-ul rețetei',
    step3: 'Previzualizează, editează și salvează',
    // Preview step
    previewTitle: 'Verifică și Editează',
    previewDescription: 'Verifică datele extrase și fă modificări înainte de salvare',
    extractedVia: 'Extras prin',
    scraper: 'Parser Website',
    custom: 'Parser Personalizat',
    ai: 'Extragere AI',
    detectedLanguage: 'Limbă Detectată',
    english: 'Engleză',
    romanian: 'Română',
    recipeTitle: 'Titlu',
    recipeDescription: 'Descriere',
    ingredients: 'Ingrediente',
    instructions: 'Instrucțiuni',
    prepTime: 'Timp Preparare',
    cookTime: 'Timp Gătit',
    servings: 'Porții',
    minutes: 'min',
    tags: 'Etichete',
    nutrition: 'Nutriție (per porție)',
    calories: 'Calorii',
    protein: 'Proteine',
    carbs: 'Carbohidrați',
    fat: 'Grăsimi',
    saveRecipe: 'Salvează Rețeta',
    saving: 'Se salvează...',
    startOver: 'Începe Din Nou',
    addIngredient: 'Adaugă Ingredient',
    addStep: 'Adaugă Pas',
    addTag: 'Adaugă Etichetă',
    amount: 'Cantitate',
    unit: 'Unitate',
    name: 'Nume',
    step: 'Pasul',
    editImage: 'Editează URL Imagine',
    noImage: 'Nicio imagine găsită',
  },
};

export default function ImportRecipePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<'url' | 'preview'>('url');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Preview data state
  const [preview, setPreview] = useState<RecipePreview | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [cookTime, setCookTime] = useState<number | ''>('');
  const [servings, setServings] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState<'en' | 'ro'>('en');
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(null);
  const [newTag, setNewTag] = useState('');

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // When preview data is received, populate the form
  useEffect(() => {
    if (preview) {
      setTitle(preview.title || '');
      setDescription(preview.description || '');
      setIngredients(preview.ingredients || []);
      setInstructions(preview.instructions || []);
      setPrepTime(preview.prep_time_minutes || '');
      setCookTime(preview.cook_time_minutes || '');
      setServings(preview.servings || '');
      setImageUrl(preview.image_url || '');
      setTags(preview.tags || []);
      setLanguage(preview.detected_language || 'en');
      setNutrition(preview.nutrition);
    }
  }, [preview]);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsLoading(true);

    try {
      const data = await api.previewImport(url);
      setPreview(data);
      setStep('preview');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('At least one ingredient is required');
      return;
    }

    setIsLoading(true);

    try {
      const data: RecipeConfirmImport = {
        url,
        language,
        title: title.trim(),
        description: description.trim() || undefined,
        ingredients,
        instructions,
        prep_time_minutes: prepTime || undefined,
        cook_time_minutes: cookTime || undefined,
        servings: servings || undefined,
        image_url: imageUrl || undefined,
        tags: tags.length > 0 ? tags : undefined,
        nutrition: nutrition || undefined,
      };

      const recipe = await api.confirmImport(data);
      toast.success(t.success);
      router.push(`/recipes/${recipe.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('url');
    setPreview(null);
    setUrl('');
  };

  // Ingredient handlers
  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value || null };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { amount: null, unit: null, name: '' }]);
  };

  // Instruction handlers
  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  // Tag handlers
  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Nutrition handlers
  const updateNutrition = (field: keyof NutritionInfo, value: string) => {
    const numValue = value ? parseFloat(value) : null;
    setNutrition(prev => ({
      calories_per_serving: prev?.calories_per_serving ?? null,
      protein_g: prev?.protein_g ?? null,
      carbs_g: prev?.carbs_g ?? null,
      fat_g: prev?.fat_g ?? null,
      [field]: numValue,
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Step 1: URL Input
  if (step === 'url') {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container py-8 px-6 md:px-8 max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t.back}
            </Link>
          </Button>

          <Card className="overflow-hidden">
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t.title}</CardTitle>
              <CardDescription className="text-base">{t.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-8">
              <form onSubmit={handlePreview} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="url" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    {t.urlLabel}
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder={t.urlPlaceholder}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t.supportedSites}{' '}
                    <Link href="/help/supported-sites" className="text-primary hover:underline inline-flex items-center gap-1">
                      {t.viewSupportedSites}
                      <HelpCircle className="h-3 w-3" />
                    </Link>
                  </p>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-11 text-base">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.previewing}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t.preview}
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Button type="button" variant="ghost" asChild>
                    <Link href="/recipes">{t.cancel}</Link>
                  </Button>
                </div>
              </form>

              {/* How it works */}
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm font-medium text-center mb-4 text-muted-foreground">{t.howItWorks}</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto text-sm font-medium">1</div>
                    <p className="text-xs text-muted-foreground">{t.step1}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto text-sm font-medium">2</div>
                    <p className="text-xs text-muted-foreground">{t.step2}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto text-sm font-medium">3</div>
                    <p className="text-xs text-muted-foreground">{t.step3}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Step 2: Preview & Edit
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={handleStartOver} className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t.startOver}
        </Button>

        <div className="space-y-6">
          {/* Header with extraction info */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{t.previewTitle}</CardTitle>
                  <CardDescription>{t.previewDescription}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={preview?.extraction_method === 'ai' ? 'default' : 'secondary'} className="gap-1">
                    {preview?.extraction_method === 'ai' ? <Bot className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                    {t.extractedVia}: {preview?.extraction_method === 'ai' ? t.ai : preview?.extraction_method === 'custom' ? t.custom : t.scraper}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />
                    {language === 'en' ? t.english : t.romanian}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Image */}
          {imageUrl && (
            <div className="aspect-video relative overflow-hidden rounded-lg max-h-72 bg-muted">
              <img
                src={imageUrl}
                alt={title}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          {/* Basic info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t.recipeTitle} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.recipeTitle}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t.recipeDescription}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.recipeDescription}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">{t.prepTime}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="prepTime"
                      type="number"
                      min="0"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : '')}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">{t.minutes}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cookTime">{t.cookTime}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="cookTime"
                      type="number"
                      min="0"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value ? parseInt(e.target.value) : '')}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">{t.minutes}</span>
                  </div>
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
                <div className="space-y-2">
                  <Label>{t.detectedLanguage}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={language === 'en' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLanguage('en')}
                      className="flex-1"
                    >
                      EN
                    </Button>
                    <Button
                      type="button"
                      variant={language === 'ro' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLanguage('ro')}
                      className="flex-1"
                    >
                      RO
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">{t.editImage}</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.ingredients}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder={t.amount}
                    value={ing.amount || ''}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    placeholder={t.unit}
                    value={ing.unit || ''}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="w-24"
                  />
                  <Input
                    placeholder={t.name}
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="gap-1">
                <Plus className="h-4 w-4" />
                {t.addIngredient}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.instructions}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructions.map((step, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-sm font-medium text-muted-foreground pt-2 w-8">{index + 1}.</span>
                  <Textarea
                    value={step}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addInstruction} className="gap-1">
                <Plus className="h-4 w-4" />
                {t.addStep}
              </Button>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.tags}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t.addTag}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.nutrition}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">{t.calories}</Label>
                  <Input
                    id="calories"
                    type="number"
                    min="0"
                    value={nutrition?.calories_per_serving ?? ''}
                    onChange={(e) => updateNutrition('calories_per_serving', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">{t.protein} (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    min="0"
                    step="0.1"
                    value={nutrition?.protein_g ?? ''}
                    onChange={(e) => updateNutrition('protein_g', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">{t.carbs} (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    min="0"
                    step="0.1"
                    value={nutrition?.carbs_g ?? ''}
                    onChange={(e) => updateNutrition('carbs_g', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">{t.fat} (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    min="0"
                    step="0.1"
                    value={nutrition?.fat_g ?? ''}
                    onChange={(e) => updateNutrition('fat_g', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleStartOver} disabled={isLoading}>
              {t.startOver}
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {t.saveRecipe}
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
