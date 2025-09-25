'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PromptList } from '@/components/prompts/prompt-list';

export default function PromptsPage(): JSX.Element {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  const handleCreatePrompt = (): void => {
    setShowCreateForm(true);
    setEditingPromptId(null);
  };

  const handleEditPrompt = (id: string): void => {
    setEditingPromptId(id);
    setShowCreateForm(false);
  };

  // For Phase 2, we'll show a simple list
  // In Phase 3, we'll add the actual create/edit forms
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

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Prompt</h3>
            <p className="text-muted-foreground mb-4">
              Create prompt form will be implemented in Phase 3.
            </p>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editingPromptId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Prompt</h3>
            <p className="text-muted-foreground mb-4">
              Edit prompt form will be implemented in Phase 3.
              <br />
              Prompt ID: {editingPromptId}
            </p>
            <button
              onClick={() => setEditingPromptId(null)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
