'use client';

import { useState } from 'react';
import { PromptList } from '@/components/prompts/prompt-list';

export default function PromptsPage(): JSX.Element {
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
