'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, UtensilsCrossed, Import, Calendar, ShoppingCart, Settings, LogOut, FolderOpen, Users, Package, Store, DollarSign } from 'lucide-react';

const translations = {
  en: {
    recipes: 'Recipes',
    collections: 'Collections',
    import: 'Import Recipe',
    mealPlanner: 'Meal Planner',
    shoppingLists: 'Shopping',
    pantry: 'Pantry',
    stores: 'Stores',
    prices: 'Prices',
    family: 'Family',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    settings: 'Settings',
    language: 'Language',
  },
  ro: {
    recipes: 'Rețete',
    collections: 'Colecții',
    import: 'Importă Rețetă',
    mealPlanner: 'Planificator',
    shoppingLists: 'Cumpărături',
    pantry: 'Cămară',
    stores: 'Magazine',
    prices: 'Prețuri',
    family: 'Familie',
    login: 'Autentificare',
    register: 'Înregistrare',
    logout: 'Deconectare',
    settings: 'Setări',
    language: 'Limbă',
  },
};

export function Header() {
  const { user, isAuthenticated, logout, updateLanguage } = useAuth();
  const router = useRouter();
  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleLanguageChange = async (newLang: string) => {
    if (user && newLang !== user.preferred_language) {
      await updateLanguage(newLang);
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Mobile Menu */}
          {isAuthenticated && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Image
                      src="/restok_icon.png"
                      alt="Restok"
                      width={32}
                      height={32}
                      className="rounded-lg"
                    />
                    Restok
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-6">
                  <Link
                    href="/recipes"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                    {t.recipes}
                  </Link>
                  <Link
                    href="/collections"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    {t.collections}
                  </Link>
                  <Link
                    href="/recipes/import"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Import className="h-5 w-5 text-muted-foreground" />
                    {t.import}
                  </Link>
                  <Link
                    href="/meal-planner"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    {t.mealPlanner}
                  </Link>
                  <Link
                    href="/shopping-lists"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                    {t.shoppingLists}
                  </Link>
                  <Link
                    href="/pantry"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Package className="h-5 w-5 text-muted-foreground" />
                    {t.pantry}
                  </Link>
                  <Link
                    href="/stores"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Store className="h-5 w-5 text-muted-foreground" />
                    {t.stores}
                  </Link>
                  <Link
                    href="/prices"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    {t.prices}
                  </Link>
                  <Link
                    href="/family"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Users className="h-5 w-5 text-muted-foreground" />
                    {t.family}
                  </Link>
                  <div className="border-t my-2" />
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    {t.settings}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-destructive w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    {t.logout}
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          )}

          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/restok_icon.png"
              alt="Restok"
              width={40}
              height={40}
              className="rounded-lg group-hover:scale-105 transition-transform"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent max-sm:hidden">
              Restok
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="max-md:hidden flex items-center gap-1">
              <Link
                href="/recipes"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.recipes}
              </Link>
              <Link
                href="/collections"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.collections}
              </Link>
              <Link
                href="/recipes/import"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.import}
              </Link>
              <Link
                href="/meal-planner"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.mealPlanner}
              </Link>
              <Link
                href="/shopping-lists"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.shoppingLists}
              </Link>
              <Link
                href="/pantry"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.pantry}
              </Link>
              <Link
                href="/stores"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.stores}
              </Link>
              <Link
                href="/prices"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.prices}
              </Link>
              <Link
                href="/family"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                {t.family}
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                    {lang === 'en' ? '🇬🇧 EN' : '🇷🇴 RO'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                    🇬🇧 English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLanguageChange('ro')}>
                    🇷🇴 Română
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="User menu">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {t.settings}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="text-muted-foreground hover:text-primary">
                <Link href="/auth/login">{t.login}</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">{t.register}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
