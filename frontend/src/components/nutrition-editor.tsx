'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NutritionInfo } from '@/types';
import { Flame, Beef, Wheat, Droplets, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NutritionEditorProps {
  nutrition: NutritionInfo | null;
  onChange: (nutrition: NutritionInfo) => void;
  translations: {
    nutrition: string;
    nutritionDesc: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    perServing: string;
    optional: string;
  };
}

export function NutritionEditor({ nutrition, onChange, translations: t }: NutritionEditorProps) {
  const [isOpen, setIsOpen] = useState(
    !!(nutrition?.calories_per_serving || nutrition?.protein_g || nutrition?.carbs_g || nutrition?.fat_g)
  );

  const handleChange = (field: keyof NutritionInfo, value: string) => {
    const numValue = value === '' ? null : Number(value);
    if (value !== '' && isNaN(numValue as number)) return;

    onChange({
      calories_per_serving: nutrition?.calories_per_serving ?? null,
      protein_g: nutrition?.protein_g ?? null,
      carbs_g: nutrition?.carbs_g ?? null,
      fat_g: nutrition?.fat_g ?? null,
      nutrition_source: 'manual',
      [field]: numValue,
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="h-5 w-5 text-orange-500" />
                  {t.nutrition}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({t.optional})
                  </span>
                </CardTitle>
                <CardDescription>{t.nutritionDesc}</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">{t.perServing}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories" className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {t.calories}
                </Label>
                <Input
                  id="calories"
                  type="number"
                  min="0"
                  placeholder="e.g., 350"
                  value={nutrition?.calories_per_serving ?? ''}
                  onChange={(e) => handleChange('calories_per_serving', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein" className="flex items-center gap-2">
                  <Beef className="h-4 w-4 text-red-500" />
                  {t.protein} (g)
                </Label>
                <Input
                  id="protein"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g., 25"
                  value={nutrition?.protein_g ?? ''}
                  onChange={(e) => handleChange('protein_g', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs" className="flex items-center gap-2">
                  <Wheat className="h-4 w-4 text-amber-500" />
                  {t.carbs} (g)
                </Label>
                <Input
                  id="carbs"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g., 45"
                  value={nutrition?.carbs_g ?? ''}
                  onChange={(e) => handleChange('carbs_g', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat" className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  {t.fat} (g)
                </Label>
                <Input
                  id="fat"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g., 12"
                  value={nutrition?.fat_g ?? ''}
                  onChange={(e) => handleChange('fat_g', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
