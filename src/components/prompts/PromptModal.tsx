'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Prompt } from '@/types/database';

// Variable detection function
const detectVariables = (template: string): string[] => {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  return matches ? matches.map(m => m.slice(2, -2)) : [];
};

const promptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  template: z
    .string()
    .min(1, 'Template is required')
    .max(10000, 'Template too long'),
});

type PromptFormData = z.infer<typeof promptSchema>;

interface PromptModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prompt?: Prompt | null; // For edit mode
}

export function PromptModal({
  isOpen,
  onOpenChange,
  onSuccess,
  prompt,
}: PromptModalProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  const isEditMode = !!prompt;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setError,
  } = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: isEditMode
      ? {
          name: prompt.name,
          description: prompt.description || '',
          template: prompt.template,
        }
      : undefined,
  });

  // Watch template field for variable detection
  const templateValue = watch('template', '');

  // Update detected variables when template changes
  React.useEffect(() => {
    const variables = detectVariables(templateValue);
    setDetectedVariables(variables);
  }, [templateValue]);

  const onSubmit = async (data: PromptFormData): Promise<void> => {
    try {
      setIsSubmitting(true);

      // Create variables array from detected variables
      const variables = detectedVariables.map(name => ({
        name,
        type: 'string' as const,
        required: true,
      }));

      const requestBody = {
        ...data,
        variables,
      };

      const url = isEditMode ? `/api/prompts/${prompt.id}` : '/api/prompts';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          errorData.error ||
            `Failed to ${isEditMode ? 'update' : 'create'} prompt`
        );
      }

      // Success
      reset();
      setDetectedVariables([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to ${isEditMode ? 'update' : 'create'} prompt`;
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (): void => {
    if (!isSubmitting) {
      reset();
      setDetectedVariables([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Prompt' : 'Create New Prompt'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your prompt template and variables'
              : 'Create a reusable prompt template with variables'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Prompt Name *
            </label>
            <Input
              id="name"
              placeholder="Prompt name"
              {...register('name')}
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="description"
              placeholder="Optional description"
              {...register('description')}
              disabled={isSubmitting}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Template Field */}
          <div className="space-y-2">
            <label htmlFor="template" className="text-sm font-medium">
              Prompt Template *
            </label>
            <Textarea
              id="template"
              placeholder="Enter your prompt template here. Use {{variable}} for dynamic content."
              rows={6}
              {...register('template')}
              disabled={isSubmitting}
              className={errors.template ? 'border-destructive' : ''}
            />
            {errors.template && (
              <p className="text-sm text-destructive">
                {errors.template.message}
              </p>
            )}
          </div>

          {/* Detected Variables */}
          {detectedVariables.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Detected Variables</label>
              <div className="flex flex-wrap gap-2">
                {detectedVariables.map(variable => (
                  <Badge key={variable} variant="outline">
                    {variable}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                These variables will be available as input fields when executing
                the prompt
              </p>
            </div>
          )}

          {/* Error Display */}
          {errors.root && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{errors.root.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update'
                  : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
