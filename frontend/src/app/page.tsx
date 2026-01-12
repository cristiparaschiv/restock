'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Calendar, ShoppingCart, UtensilsCrossed, BookOpen, Globe, Cloud } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/recipes');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />
      <main className="container py-16 px-6 md:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero with Banner */}
          <div className="flex justify-center mb-6">
            <Image
              src="/restok_banner.png"
              alt="Restok - Recipes, Meal Planning, Grocery Lists"
              width={400}
              height={150}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your recipes,{' '}
            <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
              beautifully organized
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Import recipes from your favorite websites, plan your weekly meals,
            and generate smart shopping lists - all in one place.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" asChild className="shadow-lg">
              <Link href="/auth/register">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>

          {/* Feature Grid */}
          <div className="pt-16 grid md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Import from 400+ sites</h3>
              <p className="text-muted-foreground">
                Paste a URL from AllRecipes, BBC Good Food, Food Network, and hundreds more.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Meal Planning</h3>
              <p className="text-muted-foreground">
                Plan your weekly meals with a beautiful calendar. Drag recipes to any day.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Shopping Lists</h3>
              <p className="text-muted-foreground">
                Generate shopping lists from meal plans. Ingredients are automatically combined.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Cooking Mode</h3>
              <p className="text-muted-foreground">
                Step-by-step instructions with built-in timers. Keep your screen on while cooking.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bilingual Support</h3>
              <p className="text-muted-foreground">
                Recipes are automatically translated to both English and Romanian.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Cloud className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Access Anywhere</h3>
              <p className="text-muted-foreground">
                Your recipes are saved in the cloud, accessible from any device.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/50">
        <div className="container py-8 px-6 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Image
                src="/restok_icon.png"
                alt="Restok"
                width={24}
                height={24}
                className="rounded"
              />
              <span>&copy; {new Date().getFullYear()} Restok. All rights reserved.</span>
            </div>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/help/supported-sites" className="text-muted-foreground hover:text-foreground transition-colors">
                Supported Sites
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
