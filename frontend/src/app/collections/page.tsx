'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Collection } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { FolderOpen, Loader2, Plus, BookOpen } from 'lucide-react';

const translations = {
  en: {
    title: 'My Collections',
    subtitle: 'Organize recipes into custom collections',
    create: 'New Collection',
    noCollections: 'No collections yet',
    noCollectionsDesc: 'Create collections to organize your favorite recipes',
    recipes: 'recipes',
    recipe: 'recipe',
    loading: 'Loading...',
  },
  ro: {
    title: 'Colecțiile Mele',
    subtitle: 'Organizează rețetele în colecții personalizate',
    create: 'Colecție Nouă',
    noCollections: 'Nicio colecție încă',
    noCollectionsDesc: 'Creează colecții pentru a-ți organiza rețetele favorite',
    recipes: 'rețete',
    recipe: 'rețetă',
    loading: 'Se încarcă...',
  },
};

export default function CollectionsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCollections();
    }
  }, [isAuthenticated]);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCollections();
      setCollections(data);
    } catch (error) {
      toast.error('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/collections/new">
                <Plus className="h-4 w-4 mr-2" />
                {t.create}
              </Link>
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.loading}</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.noCollections}</h2>
              <p className="text-muted-foreground mb-6 max-w-md">{t.noCollectionsDesc}</p>
              <Button asChild>
                <Link href="/collections/new">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.create}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <Link key={collection.id} href={`/collections/${collection.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden">
                    {collection.cover_image_url ? (
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={collection.cover_image_url}
                          alt={collection.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                        />
                        {collection.color && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1"
                            style={{ backgroundColor: collection.color }}
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        className="aspect-video flex items-center justify-center"
                        style={{ backgroundColor: collection.color || '#f3f4f6' }}
                      >
                        <FolderOpen className="h-12 w-12 text-white/80" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">
                        {collection.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      {collection.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {collection.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span>
                          {collection.recipe_count}{' '}
                          {collection.recipe_count === 1 ? t.recipe : t.recipes}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
