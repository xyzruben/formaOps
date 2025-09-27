'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PromptList } from '@/components/prompts/PromptList';
import { PromptCreationModal } from '@/components/prompt-creation-form/PromptCreationModal';
import { PromptEditModal } from '@/components/prompts/PromptEditModal';
import { usePrompts } from '@/hooks/use-prompts';
import { useToast } from '@/hooks/use-toast';
import type { Prompt } from '@/types/database';

export default function PromptsPage(): JSX.Element {
  const router = useRouter();
  const { prompts, refetch } = usePrompts();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const handleCreatePrompt = (): void => {
    setShowCreateModal(true);
  };

  const handleEditPrompt = (id: string): void => {
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      setEditingPrompt(prompt);
    }
  };

  const handleCreateSuccess = (newPrompt: any): void => {
    setShowCreateModal(false);
    refetch();
    toast({
      title: 'Prompt Created',
      description: `${newPrompt.name} has been created successfully.`,
    });
  };

  const handleCreateError = (error: string): void => {
    toast({
      title: 'Creation Failed',
      description: error,
      variant: 'destructive',
    });
  };

  const handleEditSuccess = (): void => {
    setEditingPrompt(null);
    refetch();
    toast({
      title: 'Prompt Updated',
      description: 'Your prompt has been updated successfully.',
    });
  };

  return (
    <div className="container mx-auto py-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            ← Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/executions')}>
            View Executions
          </Button>
        </div>
      </div>

      <PromptList
        onCreatePrompt={handleCreatePrompt}
        onEditPrompt={handleEditPrompt}
      />

      {/* Prompt Creation Modal */}
      <PromptCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        onError={handleCreateError}
      />

      {/* Prompt Edit Modal */}
      {editingPrompt && (
        <PromptEditModal
          isOpen={!!editingPrompt}
          onOpenChange={open => {
            if (!open) setEditingPrompt(null);
          }}
          onSuccess={handleEditSuccess}
          prompt={editingPrompt}
        />
      )}
    </div>
  );
}
