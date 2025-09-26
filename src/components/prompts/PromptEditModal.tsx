'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { VariableDefinitionEditor } from '../variable-editor/VariableDefinitionEditor';
import { Prompt, PromptStatus, VariableDefinition } from '@/types/database';

// Enhanced validation schema
const promptEditSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  template: z
    .string()
    .min(1, 'Template is required')
    .max(10000, 'Template too long'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
});

type PromptEditFormData = z.infer<typeof promptEditSchema>;

interface PromptEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prompt: Prompt;
}

interface EditState {
  formData: PromptEditFormData & { variables: VariableDefinition[] };
  isSubmitting: boolean;
  hasChanges: boolean;
  activeTab: string;
}

export function PromptEditModal({
  isOpen,
  onOpenChange,
  onSuccess,
  prompt,
}: PromptEditModalProps): JSX.Element {
  const [state, setState] = useState<EditState>({
    formData: {
      name: prompt.name,
      description: prompt.description || '',
      template: prompt.template,
      status: prompt.status,
      tags: prompt.tags || [],
      variables: (Array.isArray(prompt.variables)
        ? prompt.variables.map(v => ({
            name: ((v as Record<string, unknown>)?.name as string) || '',
            type: ((v as Record<string, unknown>)?.type as string) || 'string',
            required:
              ((v as Record<string, unknown>)?.required as boolean) ?? true,
            description: (v as Record<string, unknown>)?.description as string,
            defaultValue: (v as Record<string, unknown>)
              ?.defaultValue as unknown,
            options: (v as Record<string, unknown>)?.options as
              | (string | number)[]
              | undefined,
          }))
        : []) as VariableDefinition[],
    },
    isSubmitting: false,
    hasChanges: false,
    activeTab: 'details',
  });

  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setError,
    setValue,
  } = useForm<PromptEditFormData>({
    resolver: zodResolver(promptEditSchema),
    defaultValues: {
      name: prompt.name,
      description: prompt.description || '',
      template: prompt.template,
      status: prompt.status,
      tags: prompt.tags || [],
    },
  });

  // Watch for changes to detect if form is dirty
  const watchedFields = watch();

  useEffect(() => {
    const hasFormChanges =
      watchedFields.name !== prompt.name ||
      watchedFields.description !== (prompt.description || '') ||
      watchedFields.template !== prompt.template ||
      watchedFields.status !== prompt.status ||
      JSON.stringify(watchedFields.tags) !==
        JSON.stringify(prompt.tags || []) ||
      JSON.stringify(state.formData.variables) !==
        JSON.stringify(Array.isArray(prompt.variables) ? prompt.variables : []);

    setState(prev => ({ ...prev, hasChanges: hasFormChanges }));
  }, [watchedFields, state.formData.variables, prompt]);

  const handleFormDataChange = useCallback(
    (field: keyof EditState['formData'], value: unknown) => {
      setState(prev => ({
        ...prev,
        formData: { ...prev.formData, [field]: value },
      }));

      if (field !== 'variables') {
        setValue(
          field as keyof PromptEditFormData,
          value as string | string[] | undefined
        );
      }
    },
    [setValue]
  );

  const handleVariablesChange = useCallback(
    (variables: VariableDefinition[]) => {
      setState(prev => ({
        ...prev,
        formData: { ...prev.formData, variables },
      }));
    },
    []
  );

  const handleAddTag = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const tag = tagInput.trim();
        if (
          tag &&
          !state.formData.tags.includes(tag) &&
          state.formData.tags.length < 5
        ) {
          const newTags = [...state.formData.tags, tag];
          handleFormDataChange('tags', newTags);
          setTagInput('');
        }
      }
    },
    [tagInput, state.formData.tags, handleFormDataChange]
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      const newTags = state.formData.tags.filter(tag => tag !== tagToRemove);
      handleFormDataChange('tags', newTags);
    },
    [state.formData.tags, handleFormDataChange]
  );

  const getStatusColor = (status: PromptStatus): string => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const onSubmit = async (data: PromptEditFormData): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isSubmitting: true }));

      const requestBody = {
        ...data,
        variables: state.formData.variables,
        version: prompt.version + 1, // Increment version for tracking
      };

      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update prompt');
      }

      // Success
      reset();
      setState(prev => ({
        ...prev,
        hasChanges: false,
        activeTab: 'details',
      }));
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update prompt';
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleClose = (): void => {
    if (state.isSubmitting) return;

    if (state.hasChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }

    reset();
    setState(prev => ({
      ...prev,
      hasChanges: false,
      activeTab: 'details',
    }));
    onOpenChange(false);
  };

  const handleTabChange = (tab: string): void => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Prompt
            <Badge className={getStatusColor(state.formData.status)}>
              {state.formData.status}
            </Badge>
            {state.hasChanges && (
              <Badge
                variant="outline"
                className="text-orange-600 border-orange-600"
              >
                Unsaved Changes
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Update your prompt template, variables, and settings. Version:{' '}
            {prompt.version}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs
            value={state.activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="template">Template & Variables</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Prompt Name *
                </label>
                <Input
                  id="name"
                  placeholder="Enter prompt name"
                  {...register('name')}
                  disabled={state.isSubmitting}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Describe what this prompt does"
                  rows={3}
                  {...register('description')}
                  disabled={state.isSubmitting}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium">
                  Tags
                </label>
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tags (press Enter or comma to add)"
                  disabled={
                    state.isSubmitting || state.formData.tags.length >= 5
                  }
                />
                <p className="text-xs text-gray-500">
                  Press Enter or comma to add tags. Maximum 5 tags allowed.
                </p>

                {/* Display Tags */}
                {state.formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {state.formData.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="template" className="space-y-6 mt-6">
              {/* Template Field */}
              <div className="space-y-2">
                <label htmlFor="template" className="text-sm font-medium">
                  Prompt Template *
                </label>
                <Textarea
                  id="template"
                  placeholder="Enter your prompt template here. Use {{variable}} for dynamic content."
                  rows={8}
                  {...register('template')}
                  disabled={state.isSubmitting}
                  className={errors.template ? 'border-destructive' : ''}
                />
                {errors.template && (
                  <p className="text-sm text-destructive">
                    {errors.template.message}
                  </p>
                )}
              </div>

              {/* Variable Configuration Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Variable Configuration</CardTitle>
                  <CardDescription>
                    Variables are automatically detected from your template and
                    can be configured below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VariableDefinitionEditor
                    template={watchedFields.template || ''}
                    variables={state.formData.variables.map(v => ({
                      name: v.name,
                      type: v.type,
                      required: v.required,
                      description: v.description,
                      defaultValue: v.defaultValue as
                        | string
                        | number
                        | boolean
                        | (string | number | boolean)[]
                        | undefined,
                      options: v.options,
                    }))}
                    onChange={variables =>
                      handleVariablesChange(
                        variables.map(v => ({
                          ...v,
                          defaultValue: v.defaultValue as unknown,
                        }))
                      )
                    }
                    disabled={state.isSubmitting}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 mt-6">
              {/* Status Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Management</CardTitle>
                  <CardDescription>
                    Control the lifecycle status of your prompt
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-medium">
                      Status
                    </label>
                    <select
                      id="status"
                      {...register('status')}
                      disabled={state.isSubmitting}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="DRAFT">Draft - Work in progress</option>
                      <option value="PUBLISHED">
                        Published - Ready for use
                      </option>
                      <option value="ARCHIVED">
                        Archived - No longer active
                      </option>
                    </select>
                  </div>

                  {/* Status Information */}
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      {state.formData.status === 'DRAFT' &&
                        'This prompt is in draft mode and can be modified freely.'}
                      {state.formData.status === 'PUBLISHED' &&
                        'This prompt is published and available for execution.'}
                      {state.formData.status === 'ARCHIVED' &&
                        'This prompt is archived and will not be visible in the main list.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Version Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Version Information</CardTitle>
                  <CardDescription>
                    Track changes to your prompt
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Version:</span>
                    <span className="font-mono">{prompt.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Created:</span>
                    <span>
                      {new Date(prompt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Updated:</span>
                    <span>
                      {new Date(prompt.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {state.hasChanges && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                      <p className="text-sm text-yellow-800">
                        Saving will create version {prompt.version + 1}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Error Display */}
          {errors.root && (
            <div className="rounded-md bg-destructive/10 p-3 mt-4">
              <p className="text-sm text-destructive">{errors.root.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-6">
            <div className="flex items-center text-sm text-muted-foreground">
              {state.hasChanges && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  You have unsaved changes
                </span>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={state.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={state.isSubmitting || !state.hasChanges}
              >
                {state.isSubmitting ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
