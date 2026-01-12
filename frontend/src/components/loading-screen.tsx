'use client';

import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  showHeader?: boolean;
}

export function LoadingScreen({ message = 'Loading...', showHeader = true }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header />}
      <div className="container py-8 px-6 md:px-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-4 rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">{message}</p>
        </div>
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      {message && <span>{message}</span>}
    </div>
  );
}
