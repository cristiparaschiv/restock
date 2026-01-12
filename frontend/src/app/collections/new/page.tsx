'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, FolderPlus } from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

const translations = {
  en: {
    title: 'New Collection',
    subtitle: 'Create a collection to organize your recipes',
    back: 'Back',
    name: 'Name',
    namePlaceholder: 'e.g., Quick Weeknight Dinners',
    description: 'Description',
    descriptionPlaceholder: 'Add a description for your collection...',
    color: 'Color',
    create: 'Create Collection',
    creating: 'Creating...',
    success: 'Collection created!',
  },
  ro: {
    title: 'Colecție Nouă',
    subtitle: 'Creează o colecție pentru a-ți organiza rețetele',
    back: 'Înapoi',
    name: 'Nume',
    namePlaceholder: 'ex. Cine Rapide de Săptămână',
    description: 'Descriere',
    descriptionPlaceholder: 'Adaugă o descriere pentru colecția ta...',
    color: 'Culoare',
    create: 'Creează Colecția',
    creating: 'Se creează...',
    success: 'Colecție creată!',
  },
};

export default function NewCollectionPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const collection = await api.createCollection({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      toast.success(t.success);
      router.push(`/collections/${collection.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create collection');
    } finally {
      setIsSubmitting(false);
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
      <main className="container py-8 px-6 md:px-8 max-w-2xl">
        <div className="flex flex-col gap-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href="/collections">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Link>
          </Button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground text-sm">{t.subtitle}</p>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.name}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t.description}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.descriptionPlaceholder}
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
                        onClick={() => setColor(color === presetColor ? undefined : presetColor)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          color === presetColor
                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: presetColor }}
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={!name.trim() || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.creating}
                    </>
                  ) : (
                    t.create
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
