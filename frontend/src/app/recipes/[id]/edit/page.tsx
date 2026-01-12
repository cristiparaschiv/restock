'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { RecipeFullResponse, Ingredient, RecipeUpdate, NutritionInfo } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Edit3, ImageIcon, ListOrdered, Loader2, Plus, ShoppingBasket, Trash2, Upload, Users, X } from 'lucide-react';
import { NutritionEditor } from '@/components/nutrition-editor';

const translations = {
  en: {
    editRecipe: 'Edit Recipe',
    editRecipeDesc: 'Update your recipe details',
    back: 'Back to Recipe',
    basicInfo: 'Basic Information',
    basicInfoDesc: 'Recipe name and description',
    title: 'Title',
    description: 'Description',
    ingredients: 'Ingredients',
    ingredientsDesc: 'List all the ingredients needed',
    instructions: 'Instructions',
    instructionsDesc: 'Step-by-step cooking instructions',
    details: 'Cooking Details',
    detailsDesc: 'Time and serving information',
    prepTime: 'Prep Time',
    cookTime: 'Cook Time',
    servings: 'Servings',
    minutes: 'minutes',
    people: 'people',
    save: 'Save Changes',
    saving: 'Saving...',
    cancel: 'Cancel',
    english: 'English',
    romanian: 'Romanian',
    addIngredient: 'Add Ingredient',
    addStep: 'Add Step',
    amount: 'Qty',
    unit: 'Unit',
    ingredientName: 'Ingredient name',
    step: 'Step',
    loading: 'Loading...',
    notFound: 'Recipe not found',
    noInstructions: 'No instructions added yet',
    noInstructionsHint: 'Click "Add Step" to add cooking steps',
    nutrition: 'Nutrition',
    nutritionDesc: 'Nutritional information per serving',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    perServing: 'Values are per serving',
    optional: 'optional',
    image: 'Recipe Image',
    imageDesc: 'Add a photo of your dish',
    imageUrl: 'Image URL',
    imageUrlPlaceholder: 'https://example.com/image.jpg',
    removeImage: 'Remove image',
    noImage: 'No image',
    uploadImage: 'Upload Image',
    orPasteUrl: 'Or paste an image URL',
    uploading: 'Uploading...',
    uploadSuccess: 'Image uploaded',
    uploadError: 'Failed to upload image',
    maxFileSize: 'Max file size: 10MB',
  },
  ro: {
    editRecipe: 'Editează Rețeta',
    editRecipeDesc: 'Actualizează detaliile rețetei',
    back: 'Înapoi la Rețetă',
    basicInfo: 'Informații de Bază',
    basicInfoDesc: 'Numele și descrierea rețetei',
    title: 'Titlu',
    description: 'Descriere',
    ingredients: 'Ingrediente',
    ingredientsDesc: 'Listează toate ingredientele necesare',
    instructions: 'Instrucțiuni',
    instructionsDesc: 'Pașii de gătit',
    details: 'Detalii Gătit',
    detailsDesc: 'Timp și informații despre porții',
    prepTime: 'Timp Preparare',
    cookTime: 'Timp Gătit',
    servings: 'Porții',
    minutes: 'minute',
    people: 'persoane',
    save: 'Salvează Modificările',
    saving: 'Se salvează...',
    cancel: 'Anulează',
    english: 'Engleză',
    romanian: 'Română',
    addIngredient: 'Adaugă Ingredient',
    addStep: 'Adaugă Pas',
    amount: 'Cant.',
    unit: 'Unitate',
    ingredientName: 'Numele ingredientului',
    step: 'Pas',
    loading: 'Se încarcă...',
    notFound: 'Rețeta nu a fost găsită',
    noInstructions: 'Nicio instrucțiune adăugată',
    noInstructionsHint: 'Apasă "Adaugă Pas" pentru a adăuga pași',
    nutrition: 'Nutriție',
    nutritionDesc: 'Informații nutriționale per porție',
    calories: 'Calorii',
    protein: 'Proteine',
    carbs: 'Carbohidrați',
    fat: 'Grăsimi',
    perServing: 'Valorile sunt per porție',
    optional: 'opțional',
    image: 'Imagine Rețetă',
    imageDesc: 'Adaugă o fotografie a preparatului',
    imageUrl: 'URL Imagine',
    imageUrlPlaceholder: 'https://exemplu.com/imagine.jpg',
    removeImage: 'Șterge imaginea',
    noImage: 'Fără imagine',
    uploadImage: 'Încarcă Imagine',
    orPasteUrl: 'Sau lipește un URL de imagine',
    uploading: 'Se încarcă...',
    uploadSuccess: 'Imagine încărcată',
    uploadError: 'Eroare la încărcarea imaginii',
    maxFileSize: 'Dimensiune maximă: 10MB',
  },
};

export default function EditRecipePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [recipe, setRecipe] = useState<RecipeFullResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editLang, setEditLang] = useState<'en' | 'ro'>('en');

  // Form state
  const [titleEn, setTitleEn] = useState('');
  const [titleRo, setTitleRo] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionRo, setDescriptionRo] = useState('');
  const [ingredientsEn, setIngredientsEn] = useState<Ingredient[]>([]);
  const [ingredientsRo, setIngredientsRo] = useState<Ingredient[]>([]);
  const [instructionsEn, setInstructionsEn] = useState<string[]>([]);
  const [instructionsRo, setInstructionsRo] = useState<string[]>([]);
  const [prepTime, setPrepTime] = useState<string>('');
  const [cookTime, setCookTime] = useState<string>('');
  const [servings, setServings] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (user) {
      setEditLang(user.preferred_language as 'en' | 'ro');
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadRecipe();
    }
  }, [isAuthenticated, params.id]);

  const loadRecipe = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRecipeFull(params.id as string);
      setRecipe(data);

      // Populate form
      setTitleEn(data.title_en || '');
      setTitleRo(data.title_ro || '');
      setDescriptionEn(data.description_en || '');
      setDescriptionRo(data.description_ro || '');
      setIngredientsEn(data.ingredients_en || []);
      setIngredientsRo(data.ingredients_ro || []);
      setInstructionsEn(data.instructions_en || []);
      setInstructionsRo(data.instructions_ro || []);
      setPrepTime(data.prep_time_minutes?.toString() || '');
      setCookTime(data.cook_time_minutes?.toString() || '');
      setServings(data.servings?.toString() || '');
      setImageUrl(data.image_url || '');
      setNutrition(data.nutrition);
    } catch (error) {
      toast.error('Failed to load recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: RecipeUpdate = {
        title_en: titleEn || undefined,
        title_ro: titleRo || undefined,
        description_en: descriptionEn || undefined,
        description_ro: descriptionRo || undefined,
        ingredients_en: ingredientsEn.length > 0 ? ingredientsEn : undefined,
        ingredients_ro: ingredientsRo.length > 0 ? ingredientsRo : undefined,
        instructions_en: instructionsEn.length > 0 ? instructionsEn : undefined,
        instructions_ro: instructionsRo.length > 0 ? instructionsRo : undefined,
        prep_time_minutes: prepTime ? parseInt(prepTime) : undefined,
        cook_time_minutes: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        image_url: imageUrl || null,
        nutrition: nutrition || undefined,
      };

      await api.updateRecipe(params.id as string, updateData);
      toast.success('Recipe updated');
      router.push(`/recipes/${params.id}`);
    } catch (error) {
      toast.error('Failed to update recipe');
    } finally {
      setIsSaving(false);
    }
  };

  // Ingredient helpers
  const addIngredient = (langKey: 'en' | 'ro') => {
    const newIngredient: Ingredient = { amount: '', unit: '', name: '' };
    if (langKey === 'en') {
      setIngredientsEn([...ingredientsEn, newIngredient]);
    } else {
      setIngredientsRo([...ingredientsRo, newIngredient]);
    }
  };

  const updateIngredient = (langKey: 'en' | 'ro', index: number, field: keyof Ingredient, value: string) => {
    const ingredients = langKey === 'en' ? [...ingredientsEn] : [...ingredientsRo];
    ingredients[index] = { ...ingredients[index], [field]: value };
    if (langKey === 'en') {
      setIngredientsEn(ingredients);
    } else {
      setIngredientsRo(ingredients);
    }
  };

  const removeIngredient = (langKey: 'en' | 'ro', index: number) => {
    if (langKey === 'en') {
      setIngredientsEn(ingredientsEn.filter((_, i) => i !== index));
    } else {
      setIngredientsRo(ingredientsRo.filter((_, i) => i !== index));
    }
  };

  // Instruction helpers
  const addInstruction = (langKey: 'en' | 'ro') => {
    if (langKey === 'en') {
      setInstructionsEn([...instructionsEn, '']);
    } else {
      setInstructionsRo([...instructionsRo, '']);
    }
  };

  const updateInstruction = (langKey: 'en' | 'ro', index: number, value: string) => {
    if (langKey === 'en') {
      const updated = [...instructionsEn];
      updated[index] = value;
      setInstructionsEn(updated);
    } else {
      const updated = [...instructionsRo];
      updated[index] = value;
      setInstructionsRo(updated);
    }
  };

  const removeInstruction = (langKey: 'en' | 'ro', index: number) => {
    if (langKey === 'en') {
      setInstructionsEn(instructionsEn.filter((_, i) => i !== index));
    } else {
      setInstructionsRo(instructionsRo.filter((_, i) => i !== index));
    }
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !params.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please use JPEG, PNG, GIF, or WebP.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      const updatedRecipe = await api.uploadRecipeImage(params.id as string, file);
      setImageUrl(updatedRecipe.image_url || '');
      toast.success(t.uploadSuccess);
    } catch (error) {
      toast.error(t.uploadError);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container py-8">
          <p>{t.notFound}</p>
          <Button asChild className="mt-4">
            <Link href="/recipes">{t.back}</Link>
          </Button>
        </main>
      </div>
    );
  }

  const currentIngredients = editLang === 'en' ? ingredientsEn : ingredientsRo;
  const currentInstructions = editLang === 'en' ? instructionsEn : instructionsRo;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href={`/recipes/${params.id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t.back}
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.editRecipe}</h1>
              <p className="text-muted-foreground text-sm">{t.editRecipeDesc}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Language Tabs */}
          <Tabs value={editLang} onValueChange={(v) => setEditLang(v as 'en' | 'ro')}>
            <TabsList className="mb-4">
              <TabsTrigger value="en">{t.english}</TabsTrigger>
              <TabsTrigger value="ro">{t.romanian}</TabsTrigger>
            </TabsList>

            {/* Basic Info Card */}
            <TabsContent value="en" className="mt-0">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-muted-foreground" />
                    {t.basicInfo} (EN)
                  </CardTitle>
                  <CardDescription>{t.basicInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titleEn">{t.title}</Label>
                    <Input
                      id="titleEn"
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionEn">{t.description}</Label>
                    <Textarea
                      id="descriptionEn"
                      value={descriptionEn}
                      onChange={(e) => setDescriptionEn(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ro" className="mt-0">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-muted-foreground" />
                    {t.basicInfo} (RO)
                  </CardTitle>
                  <CardDescription>{t.basicInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titleRo">{t.title}</Label>
                    <Input
                      id="titleRo"
                      value={titleRo}
                      onChange={(e) => setTitleRo(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionRo">{t.description}</Label>
                    <Textarea
                      id="descriptionRo"
                      value={descriptionRo}
                      onChange={(e) => setDescriptionRo(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Ingredients Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBasket className="h-5 w-5 text-muted-foreground" />
                    {t.ingredients} ({editLang.toUpperCase()})
                  </CardTitle>
                  <CardDescription>{t.ingredientsDesc}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => addIngredient(editLang)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t.addIngredient}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentIngredients.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-lg">
                  <ShoppingBasket className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">No ingredients added</p>
                </div>
              ) : (
                currentIngredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 items-center group">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                      {i + 1}
                    </div>
                    <Input
                      placeholder={t.amount}
                      className="w-20"
                      value={ing.amount || ''}
                      onChange={(e) => updateIngredient(editLang, i, 'amount', e.target.value)}
                    />
                    <Input
                      placeholder={t.unit}
                      className="w-24"
                      value={ing.unit || ''}
                      onChange={(e) => updateIngredient(editLang, i, 'unit', e.target.value)}
                    />
                    <Input
                      placeholder={t.ingredientName}
                      className="flex-1"
                      value={ing.name}
                      onChange={(e) => updateIngredient(editLang, i, 'name', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(editLang, i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ingredient ${ing.name || i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-muted-foreground" />
                    {t.instructions} ({editLang.toUpperCase()})
                  </CardTitle>
                  <CardDescription>{t.instructionsDesc}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => addInstruction(editLang)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t.addStep}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentInstructions.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-lg">
                  <ListOrdered className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground font-medium">{t.noInstructions}</p>
                  <p className="text-muted-foreground text-sm">{t.noInstructionsHint}</p>
                </div>
              ) : (
                currentInstructions.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start group">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium mt-2">
                      {i + 1}
                    </div>
                    <Textarea
                      value={step}
                      onChange={(e) => updateInstruction(editLang, i, e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstruction(editLang, i)}
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

          {/* Image Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                {t.image}
              </CardTitle>
              <CardDescription>{t.imageDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {imageUrl && (
                <div className="relative group">
                  <img
                    src={imageUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imageUrl}` : imageUrl}
                    alt="Recipe preview"
                    className="w-full max-h-64 object-cover rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setImageUrl('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex flex-col gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.uploading}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t.uploadImage}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">{t.maxFileSize}</p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t.orPasteUrl}</span>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl">{t.imageUrl}</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder={t.imageUrlPlaceholder}
                  value={imageUrl.startsWith('/') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              {!imageUrl && (
                <div className="py-8 text-center border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">{t.noImage}</p>
                </div>
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

          {/* Nutrition Editor */}
          <NutritionEditor
            nutrition={nutrition}
            onChange={setNutrition}
            translations={{
              nutrition: t.nutrition,
              nutritionDesc: t.nutritionDesc,
              calories: t.calories,
              protein: t.protein,
              carbs: t.carbs,
              fat: t.fat,
              perServing: t.perServing,
              optional: t.optional,
            }}
          />

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" asChild>
              <Link href={`/recipes/${params.id}`}>{t.cancel}</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.saving}
                </>
              ) : (
                t.save
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
