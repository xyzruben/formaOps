'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { Button } from '../ui/button';
import { PromptDetailsForm } from './components/PromptDetailsForm';
import { PromptPreview } from './components/PromptPreview';
import { CreatePromptSchema, handleCreatePromptError } from './validation';
import { createPrompt } from './api';
import type {
  PromptCreationFormProps,
  PromptFormData,
  PromptCreationState,
  CreatePromptRequest
} from './types';

export function PromptCreationModal({
  isOpen,
  onClose,
  onSuccess,
  onError
}: PromptCreationFormProps) {
  const [state, setState] = useState<PromptCreationState>({
    formData: {
      name: '',
      description: '',
      template: '',
      variables: [],
      tags: [],
      status: 'DRAFT'
    },
    isSubmitting: false,
    errors: {}
  });

  const [activeTab, setActiveTab] = useState('details');

  const updateFormData = useCallback((data: Partial<PromptFormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
      errors: {} // Clear errors when user makes changes
    }));
  }, []);

  const validateForm = useCallback(() => {
    try {
      CreatePromptSchema.parse(state.formData);
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof Error && 'errors' in error) {
        const zodError = error as any;
        const errors: Record<string, string> = {};
        
        zodError.errors?.forEach((err: any) => {
          const field = err.path[0];
          if (field && typeof field === 'string') {
            errors[field] = err.message;
          }
        });
        
        return { isValid: false, errors };
      }
      return { isValid: false, errors: { general: 'Validation failed' } };
    }
  }, [state.formData]);

  const handleSubmit = useCallback(async (status: 'DRAFT' | 'PUBLISHED') => {
    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      setState(prev => ({ ...prev, errors: validation.errors }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      const requestData: CreatePromptRequest = {
        ...state.formData,
        status,
        description: state.formData.description || undefined,
        tags: state.formData.tags.length > 0 ? state.formData.tags : undefined
      };

      const newPrompt = await createPrompt(requestData);
      onSuccess(newPrompt);
      
      // Reset form
      setState({
        formData: {
          name: '',
          description: '',
          template: '',
          variables: [],
          tags: [],
          status: 'DRAFT'
        },
        isSubmitting: false,
        errors: {}
      });
    } catch (error) {
      const errorMessage = handleCreatePromptError(error);
      setState(prev => ({ 
        ...prev, 
        isSubmitting: false,
        errors: { general: errorMessage }
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [state.formData, validateForm, onSuccess, onError]);

  const handleClose = useCallback(() => {
    if (!state.isSubmitting) {
      onClose();
      // Reset form when closing
      setState({
        formData: {
          name: '',
          description: '',
          template: '',
          variables: [],
          tags: [],
          status: 'DRAFT'
        },
        isSubmitting: false,
        errors: {}
      });
    }
  }, [state.isSubmitting, onClose]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape key to close modal
      if (event.key === 'Escape' && !state.isSubmitting) {
        handleClose();
      }

      // Tab navigation between tabs
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            setActiveTab('details');
            break;
          case '2':
            event.preventDefault();
            setActiveTab('preview');
            break;
          case 's':
            event.preventDefault();
            handleSubmit('DRAFT');
            break;
          case 'Enter':
            if (event.shiftKey) {
              event.preventDefault();
              handleSubmit('PUBLISHED');
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state.isSubmitting, handleSubmit, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="prompt-creation-modal max-w-4xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="details" 
                className="text-sm"
                aria-label="Details tab (Ctrl+1)"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="text-sm"
                aria-label="Preview tab (Ctrl+2)"
              >
                Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="flex-1 overflow-y-auto">
              <PromptDetailsForm
                formData={state.formData}
                onChange={updateFormData}
                errors={state.errors}
                disabled={state.isSubmitting}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 overflow-y-auto">
              <PromptPreview
                template={state.formData.template}
                variables={state.formData.variables}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex-1">
            {state.errors.general && (
              <p className="text-sm text-red-500">{state.errors.general}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={state.isSubmitting}
              aria-label="Cancel and close modal"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit('DRAFT')}
              disabled={state.isSubmitting}
              aria-label="Save prompt as draft (Ctrl+S)"
            >
              {state.isSubmitting ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit('PUBLISHED')}
              disabled={state.isSubmitting}
              aria-label="Publish prompt (Ctrl+Shift+Enter)"
            >
              {state.isSubmitting ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}