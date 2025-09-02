'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Prompt } from '@/types/database';

interface DeletePromptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
  onSuccess?: () => void;
}

export function DeletePromptDialog({ 
  isOpen, 
  onOpenChange, 
  prompt, 
  onSuccess 
}: DeletePromptDialogProps): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!prompt) return;

    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete prompt');
      }

      // Success
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete prompt';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = (): void => {
    if (!isDeleting) {
      setError(null);
      onOpenChange(false);
    }
  };

  if (!prompt) return <></>;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Prompt</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{prompt.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}