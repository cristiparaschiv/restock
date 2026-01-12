'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Link2Off, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Recipe } from '@/types';
import { toast } from 'sonner';

interface ShareRecipeDialogProps {
  recipe: Recipe;
  onShareChange: (isShared: boolean, shareToken: string | null) => void;
  translations: {
    share: string;
    shareRecipe: string;
    shareDescription: string;
    copyLink: string;
    copied: string;
    stopSharing: string;
    enableSharing: string;
    sharingEnabled: string;
    sharingStopped: string;
  };
}

export function ShareRecipeDialog({
  recipe,
  onShareChange,
  translations: t,
}: ShareRecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isShared, setIsShared] = useState(recipe.is_shared);
  const [shareToken, setShareToken] = useState(recipe.share_token);

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/recipes/share/${shareToken}`
    : '';

  const handleEnableSharing = async () => {
    setIsLoading(true);
    try {
      const response = await api.enableSharing(recipe.id);
      setShareToken(response.share_token);
      setIsShared(true);
      onShareChange(true, response.share_token);
      toast.success(t.sharingEnabled);
    } catch (error) {
      toast.error('Failed to enable sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableSharing = async () => {
    setIsLoading(true);
    try {
      await api.disableSharing(recipe.id);
      setIsShared(false);
      onShareChange(false, shareToken);
      toast.success(t.sharingStopped);
    } catch (error) {
      toast.error('Failed to disable sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    // If opening and not shared, enable sharing automatically
    if (newOpen && !isShared) {
      await handleEnableSharing();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          {t.share}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.shareRecipe}</DialogTitle>
          <DialogDescription>{t.shareDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : isShared ? (
            <>
              {/* Share URL */}
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Copy Link Button (for mobile) */}
              <Button
                onClick={handleCopyLink}
                className="w-full gap-2"
                variant="default"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t.copied}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {t.copyLink}
                  </>
                )}
              </Button>

              {/* Stop Sharing */}
              <div className="border-t pt-4">
                <Button
                  onClick={handleDisableSharing}
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive"
                >
                  <Link2Off className="h-4 w-4" />
                  {t.stopSharing}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Button
                onClick={handleEnableSharing}
                className="gap-2"
              >
                <Link className="h-4 w-4" />
                {t.enableSharing}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
