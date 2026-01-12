'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NutritionInfo } from '@/types';
import { Flame, Beef, Wheat, Droplets, Plus } from 'lucide-react';

interface NutritionCardProps {
  nutrition: NutritionInfo | null;
  onEdit?: () => void;
  translations: {
    nutrition: string;
    addNutrition: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    perServing: string;
    noNutritionDesc?: string;
  };
}

function EmptyNutritionState({ onEdit, t }: { onEdit?: () => void; t: NutritionCardProps['translations'] }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-950/30 mb-4">
          <Flame className="h-6 w-6 text-orange-400" />
        </div>
        <h3 className="font-medium mb-1">{t.nutrition}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          {t.noNutritionDesc || 'Track calories and macros for better meal planning'}
        </p>
        {onEdit && (
          <Button onClick={onEdit} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t.addNutrition}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function NutritionCard({ nutrition, onEdit, translations: t }: NutritionCardProps) {
  if (!nutrition) {
    return <EmptyNutritionState onEdit={onEdit} t={t} />;
  }

  const hasData = nutrition.calories_per_serving || nutrition.protein_g || nutrition.carbs_g || nutrition.fat_g;

  if (!hasData) {
    return <EmptyNutritionState onEdit={onEdit} t={t} />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            {t.nutrition}
          </span>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t.perServing}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {nutrition.calories_per_serving !== null && (
            <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {nutrition.calories_per_serving}
              </div>
              <div className="text-xs text-muted-foreground">{t.calories}</div>
            </div>
          )}
          {nutrition.protein_g !== null && (
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <Beef className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {nutrition.protein_g}g
              </div>
              <div className="text-xs text-muted-foreground">{t.protein}</div>
            </div>
          )}
          {nutrition.carbs_g !== null && (
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <Wheat className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {nutrition.carbs_g}g
              </div>
              <div className="text-xs text-muted-foreground">{t.carbs}</div>
            </div>
          )}
          {nutrition.fat_g !== null && (
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Droplets className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {nutrition.fat_g}g
              </div>
              <div className="text-xs text-muted-foreground">{t.fat}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
