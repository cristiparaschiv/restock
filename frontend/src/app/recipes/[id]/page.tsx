'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Recipe } from '@/types';
import { Header } from '@/components/header';
import { LoadingScreen } from '@/components/loading-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FavoriteButton } from '@/components/favorite-button';
import { StarRating } from '@/components/star-rating';
import { CategorySelector } from '@/components/category-selector';
import { CategoryBadge } from '@/components/category-badge';
import { ServingsAdjuster } from '@/components/servings-adjuster';
import { UnitSystemToggle } from '@/components/unit-system-toggle';
import { NutritionCard } from '@/components/nutrition-card';
import { ShareRecipeDialog } from '@/components/share-recipe-dialog';
import { ShareToFamilyDialog } from '@/components/share-to-family-dialog';
import { Category } from '@/types';
import { scaleAmount, getScaleFactor } from '@/lib/amount-utils';
import { convertIngredient, UnitSystem } from '@/lib/unit-utils';

const translations = {
  en: {
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    prep: 'Prep Time',
    cook: 'Cook Time',
    total: 'Total Time',
    servings: 'Servings',
    min: 'minutes',
    source: 'Source',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back to Recipes',
    deleteTitle: 'Delete Recipe',
    deleteDescription: 'Are you sure you want to delete this recipe? This action cannot be undone.',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    loading: 'Loading...',
    notFound: 'Recipe not found',
    retranslate: 'Re-translate',
    viewIn: 'View in',
    english: 'English',
    romanian: 'Romanian',
    categories: 'Categories',
    addCategory: 'Add to category',
    newCategory: 'New category',
    create: 'Create',
    noCategories: 'No categories yet',
    startCooking: 'Start Cooking',
    original: 'original',
    metric: 'Metric',
    imperial: 'Imperial',
    nutrition: 'Nutrition',
    addNutrition: 'Add nutrition info',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    perServing: 'Per serving',
    noNutritionDesc: 'Track calories and macros for better meal planning',
    share: 'Share',
    shareRecipe: 'Share Recipe',
    shareDescription: 'Anyone with the link can view this recipe (read-only)',
    copyLink: 'Copy Link',
    copied: 'Copied!',
    stopSharing: 'Stop Sharing',
    enableSharing: 'Enable Sharing',
    sharingEnabled: 'Sharing enabled',
    sharingStopped: 'Sharing disabled',
    notes: 'My Notes',
    addNotes: 'Add notes',
    notesPlaceholder: 'Add personal notes, modifications, tips...',
    saveNotes: 'Save',
    shareToFamily: 'Share to Family',
    shareToFamilyDescription: 'Share this recipe with your family group',
    selectFamily: 'Select a family to share with',
    noFamilies: 'You are not in any family group yet',
    createFamily: 'Create a Family',
    shared: 'Shared successfully',
    shareBtn: 'Share',
    unshare: 'Unshare',
    sharedWith: 'Shared with Family',
  },
  ro: {
    ingredients: 'Ingrediente',
    instructions: 'Instrucțiuni',
    prep: 'Timp Preparare',
    cook: 'Timp Gătit',
    total: 'Timp Total',
    servings: 'Porții',
    min: 'minute',
    source: 'Sursă',
    delete: 'Șterge',
    edit: 'Editează',
    back: 'Înapoi la Rețete',
    deleteTitle: 'Șterge Rețeta',
    deleteDescription: 'Ești sigur că vrei să ștergi această rețetă? Această acțiune nu poate fi anulată.',
    cancel: 'Anulează',
    confirmDelete: 'Șterge',
    loading: 'Se încarcă...',
    notFound: 'Rețeta nu a fost găsită',
    retranslate: 'Re-traduce',
    viewIn: 'Vezi în',
    english: 'Engleză',
    romanian: 'Română',
    categories: 'Categorii',
    addCategory: 'Adaugă la categorie',
    newCategory: 'Categorie nouă',
    create: 'Creează',
    noCategories: 'Nicio categorie încă',
    startCooking: 'Începe gătitul',
    original: 'original',
    metric: 'Metric',
    imperial: 'Imperial',
    nutrition: 'Nutriție',
    addNutrition: 'Adaugă info nutriționale',
    calories: 'Calorii',
    protein: 'Proteine',
    carbs: 'Carbohidrați',
    fat: 'Grăsimi',
    perServing: 'Per porție',
    noNutritionDesc: 'Urmărește caloriile și macronutrienții pentru planificarea meselor',
    share: 'Distribuie',
    shareRecipe: 'Distribuie Rețeta',
    shareDescription: 'Oricine are linkul poate vizualiza această rețetă (doar citire)',
    copyLink: 'Copiază Link',
    copied: 'Copiat!',
    stopSharing: 'Oprește Distribuirea',
    enableSharing: 'Activează Distribuirea',
    sharingEnabled: 'Distribuire activată',
    sharingStopped: 'Distribuire dezactivată',
    notes: 'Notițele Mele',
    addNotes: 'Adaugă notițe',
    notesPlaceholder: 'Adaugă notițe personale, modificări, sfaturi...',
    saveNotes: 'Salvează',
    shareToFamily: 'Distribuie Familiei',
    shareToFamilyDescription: 'Distribuie această rețetă grupului tău de familie',
    selectFamily: 'Selectează o familie pentru a distribui',
    noFamilies: 'Nu ești încă într-un grup de familie',
    createFamily: 'Creează o Familie',
    shared: 'Distribuit cu succes',
    shareBtn: 'Distribuie',
    unshare: 'Anulează distribuirea',
    sharedWith: 'Distribuit Familiei',
  },
};

export default function RecipeDetailPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayLang, setDisplayLang] = useState<'en' | 'ro'>('en');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recipeCategories, setRecipeCategories] = useState<Category[]>([]);
  const [displayServings, setDisplayServings] = useState<number | null>(null);
  const [displaySystem, setDisplaySystem] = useState<UnitSystem>('metric');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (user) {
      setDisplayLang(user.preferred_language as 'en' | 'ro');
    }
  }, [user]);

  // Initialize displayServings when recipe loads
  useEffect(() => {
    if (recipe?.servings) {
      setDisplayServings(recipe.servings);
    }
  }, [recipe?.servings]);

  // Initialize displaySystem from user preferences
  useEffect(() => {
    if (user?.preferences?.unit_system) {
      setDisplaySystem(user.preferences.unit_system);
    }
  }, [user?.preferences?.unit_system]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadRecipe();
    }
  }, [isAuthenticated, params.id, displayLang]);

  const loadRecipe = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRecipe(params.id as string, displayLang);
      setRecipe(data);
    } catch (error) {
      toast.error('Failed to load recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteRecipe(params.id as string);
      toast.success('Recipe deleted');
      router.push('/recipes');
    } catch (error) {
      toast.error('Failed to delete recipe');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleRetranslate = async () => {
    try {
      await api.retranslateRecipe(params.id as string);
      toast.success('Recipe re-translated');
      loadRecipe();
    } catch (error) {
      toast.error('Failed to re-translate recipe');
    }
  };

  const handleSaveNotes = async () => {
    if (!recipe) return;
    setIsSavingNotes(true);
    try {
      await api.updateRecipe(recipe.id, { notes: notesText || undefined });
      setRecipe({ ...recipe, notes: notesText || null });
      setIsEditingNotes(false);
      toast.success(lang === 'en' ? 'Notes saved' : 'Notițe salvate');
    } catch (error) {
      toast.error(lang === 'en' ? 'Failed to save notes' : 'Salvarea notițelor a eșuat');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const startEditingNotes = () => {
    setNotesText(recipe?.notes || '');
    setIsEditingNotes(true);
  };

  const handleRatingChange = async (newRating: number) => {
    if (!recipe) return;
    const ratingValue = newRating === 0 ? null : newRating;
    try {
      await api.updateRating(recipe.id, ratingValue);
      setRecipe({ ...recipe, rating: ratingValue });
    } catch (error) {
      toast.error(lang === 'en' ? 'Failed to update rating' : 'Actualizarea rating-ului a eșuat');
    }
  };

  if (authLoading || isLoading) {
    return <LoadingScreen message={t.loading} />;
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 px-6 md:px-8 max-w-2xl">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <span className="text-4xl">404</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.notFound}</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {lang === 'en'
                  ? 'This recipe may have been deleted or the link is incorrect.'
                  : 'Această rețetă poate fi fost ștearsă sau linkul este incorect.'}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/recipes">{t.back}</Link>
                </Button>
                <Button asChild>
                  <Link href="/recipes/import">
                    {lang === 'en' ? 'Import Recipe' : 'Importă Rețetă'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 px-6 md:px-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/recipes">← {t.back}</Link>
          </Button>
        </div>

        <div className="grid gap-6">
          {recipe.image_url && (
            <div className="relative w-full overflow-hidden rounded-t-lg">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-[300px] md:h-[400px] object-cover"
              />
              {/* Gradient fade at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-3">
              <FavoriteButton
                recipeId={recipe.id}
                isFavorite={recipe.is_favorite}
                size="default"
                variant="outline"
                className="mt-1"
                onToggle={(isFav) => setRecipe({ ...recipe, is_favorite: isFav })}
              />
              <div>
                <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
                {recipe.description && (
                  <p className="text-muted-foreground mb-2">{recipe.description}</p>
                )}
                <StarRating
                  rating={recipe.rating}
                  onRate={handleRatingChange}
                  size="md"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground max-sm:hidden">{t.viewIn}:</span>
              <Tabs value={displayLang} onValueChange={(v) => setDisplayLang(v as 'en' | 'ro')}>
                <TabsList aria-label={t.viewIn}>
                  <TabsTrigger value="en">{t.english}</TabsTrigger>
                  <TabsTrigger value="ro">{t.romanian}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm items-center">
            {recipe.prep_time_minutes && (
              <div>
                <span className="font-medium">{t.prep}:</span> {recipe.prep_time_minutes} {t.min}
              </div>
            )}
            {recipe.cook_time_minutes && (
              <div>
                <span className="font-medium">{t.cook}:</span> {recipe.cook_time_minutes} {t.min}
              </div>
            )}
            {recipe.total_time_minutes && (
              <div>
                <span className="font-medium">{t.total}:</span> {recipe.total_time_minutes} {t.min}
              </div>
            )}
            {recipe.servings && displayServings && (
              <ServingsAdjuster
                originalServings={recipe.servings}
                currentServings={displayServings}
                onChange={setDisplayServings}
                translations={{ servings: t.servings, original: t.original }}
              />
            )}
          </div>

          <Separator />

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{t.ingredients}</CardTitle>
                <UnitSystemToggle
                  value={displaySystem}
                  onChange={setDisplaySystem}
                  translations={{ metric: t.metric, imperial: t.imperial }}
                />
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, i) => {
                    // Step 1: Scale the amount
                    const scaleFactor = getScaleFactor(recipe.servings, displayServings || recipe.servings || 1);
                    const scaledIng = {
                      ...ing,
                      amount: scaleAmount(ing.amount, scaleFactor, ing.unit, ing.name),
                    };
                    // Step 2: Convert units if needed
                    const convertedIng = convertIngredient(scaledIng, displaySystem);
                    return (
                      <li key={i}>
                        {convertedIng.amount && (
                          <span className="font-medium">{convertedIng.amount} </span>
                        )}
                        {convertedIng.unit && (
                          <span className="font-medium">{convertedIng.unit} </span>
                        )}
                        {convertedIng.name}
                      </li>
                    );
                  })}
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

          {recipe.source_url && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{t.source}:</span>{' '}
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

          {/* Nutrition */}
          <NutritionCard
            nutrition={recipe.nutrition}
            onEdit={() => router.push(`/recipes/${recipe.id}/edit`)}
            translations={{
              nutrition: t.nutrition,
              addNutrition: t.addNutrition,
              calories: t.calories,
              protein: t.protein,
              carbs: t.carbs,
              fat: t.fat,
              perServing: t.perServing,
              noNutritionDesc: t.noNutritionDesc,
            }}
          />

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {t.notes}
                {!isEditingNotes && (
                  <Button variant="ghost" size="sm" onClick={startEditingNotes}>
                    {recipe.notes ? (lang === 'en' ? 'Edit' : 'Editează') : t.addNotes}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder={t.notesPlaceholder}
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNotes(false)}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                    >
                      {isSavingNotes ? '...' : t.saveNotes}
                    </Button>
                  </div>
                </div>
              ) : recipe.notes ? (
                <p className="text-sm whitespace-pre-wrap">{recipe.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t.notesPlaceholder}</p>
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          {recipeCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipeCategories.map((cat) => (
                <CategoryBadge
                  key={cat.id}
                  name={cat.name}
                  color={cat.color}
                  onRemove={() => {
                    api.removeRecipeFromCategory(recipe.id, cat.id);
                    setRecipeCategories(recipeCategories.filter((c) => c.id !== cat.id));
                  }}
                />
              ))}
            </div>
          )}

          <Separator />

          {/* Actions - organized by importance */}
          <div className="space-y-4">
            {/* Primary action */}
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/recipes/${recipe.id}/cook`}>{t.startCooking}</Link>
            </Button>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={`/recipes/${recipe.id}/edit`}>{t.edit}</Link>
              </Button>

              <ShareRecipeDialog
                recipe={recipe}
                onShareChange={(isShared, shareToken) => {
                  setRecipe({ ...recipe, is_shared: isShared, share_token: shareToken });
                }}
                translations={{
                  share: t.share,
                  shareRecipe: t.shareRecipe,
                  shareDescription: t.shareDescription,
                  copyLink: t.copyLink,
                  copied: t.copied,
                  stopSharing: t.stopSharing,
                  enableSharing: t.enableSharing,
                  sharingEnabled: t.sharingEnabled,
                  sharingStopped: t.sharingStopped,
                }}
              />

              <ShareToFamilyDialog
                contentType="recipe"
                contentId={recipe.id}
                currentFamilyId={recipe.family_id}
                onShareChange={(familyId) => {
                  setRecipe({ ...recipe, family_id: familyId });
                }}
                translations={{
                  shareToFamily: t.shareToFamily,
                  shareDescription: t.shareToFamilyDescription,
                  selectFamily: t.selectFamily,
                  noFamilies: t.noFamilies,
                  createFamily: t.createFamily,
                  shared: t.shared,
                  share: t.shareBtn,
                  unshare: t.unshare,
                  sharedWith: t.sharedWith,
                }}
              />

              <CategorySelector
                recipeId={recipe.id}
                selectedCategories={recipeCategories}
                onCategoriesChange={setRecipeCategories}
                translations={{
                  categories: t.categories,
                  addCategory: t.addCategory,
                  newCategory: t.newCategory,
                  create: t.create,
                  noCategories: t.noCategories,
                }}
              />

              <Button variant="outline" onClick={handleRetranslate}>
                {t.retranslate}
              </Button>
            </div>

            {/* Destructive action - separated */}
            <div className="pt-2 border-t">
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    {t.delete}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.deleteTitle}</DialogTitle>
                    <DialogDescription>{t.deleteDescription}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      {t.cancel}
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? '...' : t.confirmDelete}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
