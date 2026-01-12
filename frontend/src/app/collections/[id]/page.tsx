'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { CollectionWithRecipes, Recipe } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChefHat,
  Clock,
  Edit,
  FolderOpen,
  ImagePlus,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StarRatingDisplay } from '@/components/star-rating';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

const translations = {
  en: {
    back: 'Collections',
    recipes: 'recipes',
    recipe: 'recipe',
    empty: 'This collection is empty',
    emptyDesc: 'Add recipes to this collection from the recipe page',
    browseRecipes: 'Browse Recipes',
    addRecipes: 'Add Recipes',
    search: 'Search recipes to add...',
    add: 'Add',
    remove: 'Remove',
    edit: 'Edit Collection',
    delete: 'Delete Collection',
    deleteConfirm: 'Delete this collection?',
    deleteDesc: 'This will remove the collection but not the recipes in it.',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    loading: 'Loading...',
    name: 'Name',
    description: 'Description',
    color: 'Color',
    coverImage: 'Cover Image',
    uploadCover: 'Upload Cover',
    removeCover: 'Remove Cover',
    save: 'Save Changes',
    saving: 'Saving...',
    min: 'min',
    noResults: 'No recipes found',
  },
  ro: {
    back: 'Colecții',
    recipes: 'rețete',
    recipe: 'rețetă',
    empty: 'Această colecție este goală',
    emptyDesc: 'Adaugă rețete în această colecție din pagina rețetei',
    browseRecipes: 'Caută Rețete',
    addRecipes: 'Adaugă Rețete',
    search: 'Caută rețete de adăugat...',
    add: 'Adaugă',
    remove: 'Elimină',
    edit: 'Editează Colecția',
    delete: 'Șterge Colecția',
    deleteConfirm: 'Ștergi această colecție?',
    deleteDesc: 'Aceasta va elimina colecția, dar nu și rețetele din ea.',
    cancel: 'Anulează',
    confirmDelete: 'Șterge',
    loading: 'Se încarcă...',
    name: 'Nume',
    description: 'Descriere',
    color: 'Culoare',
    coverImage: 'Imagine Copertă',
    uploadCover: 'Încarcă Copertă',
    removeCover: 'Elimină Copertă',
    save: 'Salvează',
    saving: 'Se salvează...',
    min: 'min',
    noResults: 'Nicio rețetă găsită',
  },
};

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionWithRecipes | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState<string | undefined>(undefined);

  // Add recipes state
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCollection();
    }
  }, [isAuthenticated, resolvedParams.id]);

  const loadCollection = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCollection(resolvedParams.id);
      setCollection(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
      setEditColor(data.color || undefined);

      // Load recipes in collection
      if (data.recipe_ids.length > 0) {
        const response = await api.getRecipes(1, 100);
        const collectionRecipes = response.recipes.filter((r) =>
          data.recipe_ids.includes(r.id)
        );
        setRecipes(collectionRecipes);
      }
    } catch (error) {
      toast.error('Failed to load collection');
      router.push('/collections');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      const response = await api.getRecipes(1, 100);
      setAllRecipes(response.recipes);
    } catch (error) {
      toast.error('Failed to load recipes');
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteCollection(resolvedParams.id);
      toast.success('Collection deleted');
      router.push('/collections');
    } catch (error) {
      toast.error('Failed to delete collection');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) return;

    setIsSaving(true);
    try {
      const updated = await api.updateCollection(resolvedParams.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        color: editColor,
      });
      setCollection((prev) => (prev ? { ...prev, ...updated } : null));
      toast.success('Collection updated');
      setShowEditDialog(false);
    } catch (error) {
      toast.error('Failed to update collection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const updated = await api.uploadCollectionCover(resolvedParams.id, file);
      setCollection((prev) => (prev ? { ...prev, cover_image_url: updated.cover_image_url } : null));
      toast.success('Cover image uploaded');
    } catch (error) {
      toast.error('Failed to upload cover image');
    }
  };

  const handleRemoveCover = async () => {
    try {
      await api.deleteCollectionCover(resolvedParams.id);
      setCollection((prev) => (prev ? { ...prev, cover_image_url: null } : null));
      toast.success('Cover image removed');
    } catch (error) {
      toast.error('Failed to remove cover image');
    }
  };

  const handleAddRecipe = async (recipeId: string) => {
    try {
      await api.addRecipeToCollection(resolvedParams.id, recipeId);
      const recipe = allRecipes.find((r) => r.id === recipeId);
      if (recipe) {
        setRecipes((prev) => [...prev, recipe]);
        setCollection((prev) =>
          prev ? { ...prev, recipe_ids: [...prev.recipe_ids, recipeId], recipe_count: prev.recipe_count + 1 } : null
        );
      }
      toast.success('Recipe added to collection');
    } catch (error) {
      toast.error('Failed to add recipe');
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    try {
      await api.removeRecipeFromCollection(resolvedParams.id, recipeId);
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setCollection((prev) =>
        prev
          ? {
              ...prev,
              recipe_ids: prev.recipe_ids.filter((id) => id !== recipeId),
              recipe_count: prev.recipe_count - 1,
            }
          : null
      );
      toast.success('Recipe removed from collection');
    } catch (error) {
      toast.error('Failed to remove recipe');
    }
  };

  const filteredRecipes = allRecipes.filter(
    (r) =>
      !collection?.recipe_ids.includes(r.id) &&
      r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!collection) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8">
        <div className="flex flex-col gap-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href="/collections">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Link>
          </Button>

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              {collection.cover_image_url ? (
                <img
                  src={collection.cover_image_url}
                  alt={collection.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: collection.color || '#f3f4f6' }}
                >
                  <FolderOpen className="h-8 w-8 text-white/80" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{collection.name}</h1>
                {collection.description && (
                  <p className="text-muted-foreground text-sm">{collection.description}</p>
                )}
                <p className="text-muted-foreground text-sm mt-1">
                  {collection.recipe_count} {collection.recipe_count === 1 ? t.recipe : t.recipes}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog
                open={showAddDialog}
                onOpenChange={(open) => {
                  setShowAddDialog(open);
                  if (open) loadAllRecipes();
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.addRecipes}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{t.addRecipes}</DialogTitle>
                  </DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
                    {isLoadingRecipes ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredRecipes.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">{t.noResults}</p>
                    ) : (
                      filteredRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            {recipe.image_url ? (
                              <img
                                src={recipe.image_url}
                                alt={recipe.title}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <ChefHat className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium line-clamp-1">{recipe.title}</span>
                          </div>
                          <Button size="sm" onClick={() => handleAddRecipe(recipe.id)}>
                            {t.add}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t.edit}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Recipes Grid */}
          {recipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <ChefHat className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.empty}</h2>
              <p className="text-muted-foreground mb-6 max-w-md">{t.emptyDesc}</p>
              <Button asChild>
                <Link href="/recipes">
                  <Search className="h-4 w-4 mr-2" />
                  {t.browseRecipes}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <Card key={recipe.id} className="group relative overflow-hidden">
                  <Link href={`/recipes/${recipe.id}`}>
                    {recipe.image_url ? (
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <ChefHat className="h-12 w-12 text-muted-foreground/30" />
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
                      {recipe.rating && <StarRatingDisplay rating={recipe.rating} size="sm" />}
                      {recipe.prep_time_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipe.prep_time_minutes} {t.min}
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {recipe.servings}
                        </span>
                      )}
                    </CardFooter>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveRecipe(recipe.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.edit}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">{t.name}</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">{t.description}</Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.color}</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      onClick={() => setEditColor(editColor === presetColor ? undefined : presetColor)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        editColor === presetColor
                          ? 'ring-2 ring-offset-2 ring-primary scale-110'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: presetColor }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.coverImage}</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {t.uploadCover}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>
                  </Button>
                  {collection.cover_image_url && (
                    <Button variant="outline" size="sm" onClick={handleRemoveCover}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.removeCover}
                    </Button>
                  )}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!editName.trim() || isSaving}>
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
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle>
              <AlertDialogDescription>{t.deleteDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.confirmDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
