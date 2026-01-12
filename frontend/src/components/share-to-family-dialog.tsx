'use client';

import { useState, useEffect } from 'react';
import { Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Family } from '@/types';
import { toast } from 'sonner';

type ContentType = 'recipe' | 'shopping-list' | 'meal-plan';

interface ShareToFamilyDialogProps {
  contentType: ContentType;
  contentId: string;
  currentFamilyId: string | null;
  onShareChange: (familyId: string | null) => void;
  translations: {
    shareToFamily: string;
    shareDescription: string;
    selectFamily: string;
    noFamilies: string;
    createFamily: string;
    shared: string;
    share: string;
    unshare: string;
    sharedWith: string;
  };
}

export function ShareToFamilyDialog({
  contentType,
  contentId,
  currentFamilyId,
  onShareChange,
  translations: t,
}: ShareToFamilyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(true);

  useEffect(() => {
    if (open) {
      loadFamilies();
    }
  }, [open]);

  const loadFamilies = async () => {
    setLoadingFamilies(true);
    try {
      const families = await api.getFamilies();
      setFamilies(families);
    } catch (error) {
      toast.error('Failed to load families');
    } finally {
      setLoadingFamilies(false);
    }
  };

  const handleShare = async (familyId: string) => {
    setIsLoading(true);
    try {
      switch (contentType) {
        case 'recipe':
          await api.shareRecipeToFamily(familyId, contentId);
          break;
        case 'shopping-list':
          await api.shareShoppingListToFamily(familyId, contentId);
          break;
        case 'meal-plan':
          await api.shareMealPlanToFamily(familyId, contentId);
          break;
      }
      onShareChange(familyId);
      toast.success(t.shared);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to share');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!currentFamilyId) return;

    setIsLoading(true);
    try {
      switch (contentType) {
        case 'recipe':
          await api.unshareRecipeFromFamily(currentFamilyId, contentId);
          break;
        case 'shopping-list':
          await api.unshareShoppingListFromFamily(currentFamilyId, contentId);
          break;
        case 'meal-plan':
          await api.unshareMealPlanFromFamily(currentFamilyId, contentId);
          break;
      }
      onShareChange(null);
      toast.success('Unshared successfully');
      setOpen(false);
    } catch (error) {
      toast.error('Failed to unshare');
    } finally {
      setIsLoading(false);
    }
  };

  const currentFamily = families.find(f => f.id === currentFamilyId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          {currentFamilyId ? t.sharedWith : t.shareToFamily}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.shareToFamily}</DialogTitle>
          <DialogDescription>{t.shareDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loadingFamilies ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : families.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>{t.noFamilies}</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => {
                  setOpen(false);
                  window.location.href = '/family';
                }}
              >
                {t.createFamily}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Currently shared with */}
              {currentFamily && (
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-medium">{currentFamily.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({currentFamily.member_count} members)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnshare}
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t.unshare}
                  </Button>
                </div>
              )}

              {/* Other families to share with */}
              {families
                .filter(f => f.id !== currentFamilyId)
                .map(family => (
                  <div
                    key={family.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <span className="font-medium">{family.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({family.member_count} members)
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(family.id)}
                      disabled={isLoading}
                    >
                      {t.share}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
