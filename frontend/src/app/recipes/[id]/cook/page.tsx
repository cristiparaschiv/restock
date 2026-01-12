'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Recipe } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  ChefHat,
  Clock,
  List,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Timer,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const translations = {
  en: {
    loading: 'Loading...',
    notFound: 'Recipe not found',
    back: 'Back to Recipe',
    step: 'Step',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    finish: 'Finish',
    ingredients: 'Ingredients',
    showIngredients: 'Show Ingredients',
    hideIngredients: 'Hide Ingredients',
    startTimer: 'Start Timer',
    timerComplete: 'Timer complete!',
    exitCooking: 'Exit Cooking Mode',
    congratulations: 'Congratulations!',
    recipeComplete: "You've completed this recipe!",
    cookAgain: 'Cook Again',
    backToRecipe: 'Back to Recipe',
  },
  ro: {
    loading: 'Se incarca...',
    notFound: 'Reteta nu a fost gasita',
    back: 'Inapoi la Reteta',
    step: 'Pasul',
    of: 'din',
    previous: 'Anterior',
    next: 'Urmator',
    finish: 'Finalizeaza',
    ingredients: 'Ingrediente',
    showIngredients: 'Arata Ingredientele',
    hideIngredients: 'Ascunde Ingredientele',
    startTimer: 'Porneste Cronometru',
    timerComplete: 'Timpul a expirat!',
    exitCooking: 'Iesire Mod Gatit',
    congratulations: 'Felicitari!',
    recipeComplete: 'Ai terminat aceasta reteta!',
    cookAgain: 'Gateste din Nou',
    backToRecipe: 'Inapoi la Reteta',
  },
};

// Parse time from instruction text (e.g., "cook for 10 minutes", "bake for 30-35 minutes")
function parseTimeFromText(text: string | undefined | null): number | null {
  if (!text) return null;

  const patterns = [
    /(\d+)\s*-\s*\d+\s*(?:minute|min|minut)/i,
    /(\d+)\s*(?:minute|min|minut)/i,
    /(\d+)\s*(?:hour|ora|ore)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (pattern.source.includes('hour|ora|ore')) {
        return value * 60; // Convert hours to minutes
      }
      return value;
    }
  }
  return null;
}

interface TimerState {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

function TimerComponent({
  timer,
  onToggle,
  onReset,
  onRemove,
}: {
  timer: TimerState;
  onToggle: () => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const minutes = Math.floor(timer.remainingSeconds / 60);
  const seconds = timer.remainingSeconds % 60;
  const progress = ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;

  return (
    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
      <div className="flex-1">
        <div className="text-sm text-muted-foreground mb-1">{timer.label}</div>
        <div className="text-2xl font-mono font-bold">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <Progress value={progress} className="h-1 mt-2" />
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label={timer.isRunning ? 'Pause timer' : 'Start timer'}>
          {timer.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onReset} aria-label="Reset timer">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove timer">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CookingModePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [timers, setTimers] = useState<TimerState[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

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

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (timer.isRunning && timer.remainingSeconds > 0) {
            const newRemaining = timer.remainingSeconds - 1;
            if (newRemaining === 0) {
              // Timer complete - play sound
              playAlarm();
              toast.success(`${timer.label}: ${t.timerComplete}`);
              return { ...timer, remainingSeconds: 0, isRunning: false };
            }
            return { ...timer, remainingSeconds: newRemaining };
          }
          return timer;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [t.timerComplete]);

  // Keep screen awake during cooking (if supported)
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake Lock not supported');
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  const loadRecipe = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRecipe(params.id as string, lang);
      setRecipe(data);
    } catch (error) {
      toast.error('Failed to load recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const playAlarm = () => {
    // Use Web Audio API for alarm sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Beep pattern
      setTimeout(() => {
        oscillator.stop();
      }, 200);
    } catch (err) {
      console.log('Audio not supported');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    const instructionsList = recipe?.instructions || [];
    if (currentStep < instructionsList.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsComplete(true);
    }
  };

  const addTimer = (minutes: number, label: string) => {
    const id = `timer-${Date.now()}`;
    setTimers([
      ...timers,
      {
        id,
        label,
        totalSeconds: minutes * 60,
        remainingSeconds: minutes * 60,
        isRunning: true,
      },
    ]);
  };

  const toggleTimer = (id: string) => {
    setTimers(
      timers.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const resetTimer = (id: string) => {
    setTimers(
      timers.map((t) =>
        t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false } : t
      )
    );
  };

  const removeTimer = (id: string) => {
    setTimers(timers.filter((t) => t.id !== id));
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ChefHat className="h-16 w-16 text-muted-foreground" />
        <p className="text-xl">{t.notFound}</p>
        <Button asChild>
          <Link href="/recipes">{t.back}</Link>
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-8">
        <div className="p-6 bg-primary/10 rounded-full">
          <ChefHat className="h-20 w-20 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-center">{t.congratulations}</h1>
        <p className="text-xl text-muted-foreground text-center">{t.recipeComplete}</p>
        <p className="text-2xl font-medium text-center">{recipe.title}</p>
        <div className="flex gap-4 mt-4">
          <Button variant="outline" onClick={() => {
            setCurrentStep(0);
            setIsComplete(false);
          }}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t.cookAgain}
          </Button>
          <Button asChild>
            <Link href={`/recipes/${recipe.id}`}>{t.backToRecipe}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const instructions = recipe.instructions || [];
  const currentInstruction = instructions[currentStep] || '';
  const detectedTime = parseTimeFromText(currentInstruction);
  const progress = instructions.length > 0 ? ((currentStep + 1) / instructions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/recipes/${recipe.id}`}>
              <X className="h-4 w-4 mr-2" />
              {t.exitCooking}
            </Link>
          </Button>
          <span className="font-medium truncate max-w-[200px]">{recipe.title}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIngredients(!showIngredients)}
          >
            <List className="h-4 w-4 mr-2" />
            {showIngredients ? t.hideIngredients : t.showIngredients}
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <Progress value={progress} className="h-1 rounded-none" />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Ingredients Panel */}
        <div
          className={cn(
            'md:w-80 border-r bg-muted/30 overflow-y-auto transition-all duration-300',
            showIngredients ? 'max-h-60 md:max-h-full' : 'max-h-0 md:max-h-0 md:w-0 overflow-hidden'
          )}
        >
          <div className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <List className="h-4 w-4" />
              {t.ingredients}
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="font-medium text-muted-foreground min-w-[80px]">
                    {ing.amount} {ing.unit}
                  </span>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-4 md:p-8">
          {/* Step Counter */}
          <div className="text-center mb-6">
            <span className="text-sm text-muted-foreground">
              {t.step} {currentStep + 1} {t.of} {instructions.length}
            </span>
          </div>

          {/* Instruction */}
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-2xl">
              <CardContent className="p-8 md:p-12">
                <p className="text-xl md:text-2xl lg:text-3xl leading-relaxed text-center">
                  {currentInstruction}
                </p>

                {/* Timer button if time detected */}
                {detectedTime && (
                  <div className="mt-8 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => addTimer(detectedTime, `${t.step} ${currentStep + 1}`)}
                      className="gap-2"
                    >
                      <Timer className="h-4 w-4" />
                      {t.startTimer} ({detectedTime} min)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Timers */}
          {timers.length > 0 && (
            <div className="mt-6 space-y-2 max-w-md mx-auto w-full">
              {timers.map((timer) => (
                <TimerComponent
                  key={timer.id}
                  timer={timer}
                  onToggle={() => toggleTimer(timer.id)}
                  onReset={() => resetTimer(timer.id)}
                  onRemove={() => removeTimer(timer.id)}
                />
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.previous}
            </Button>

            <div className="flex gap-1">
              {instructions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === currentStep ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            <Button onClick={handleNext} className="gap-2">
              {currentStep === instructions.length - 1 ? t.finish : t.next}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
