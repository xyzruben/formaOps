'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Prompt } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { PromptModal } from './PromptModal';
import { EnhancedExecutionPanel } from '../execution/enhanced-execution-panel';
import { DeletePromptDialog } from './DeletePromptDialog';

interface PromptsResponse {
  prompts: Prompt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function PromptList(): JSX.Element {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<Prompt | null>(null);
  const [executePrompt, setExecutePrompt] = useState<Prompt | null>(null);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPrompts = async (search?: string): Promise<void> => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams();
      if (search) {
        searchParams.set('search', search);
      }

      const response = await fetch(`/api/prompts?${searchParams.toString()}`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }

      const data: PromptsResponse = await response.json();
      setPrompts(data.prompts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // In test mode, allow fetching even without user from AuthContext
    const isTestMode =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        process.env.NODE_ENV === 'test');
    const hasTestAuth =
      typeof window !== 'undefined' && window.localStorage.getItem('auth-user');

    if (user || (isTestMode && hasTestAuth)) {
      fetchPrompts();
    }
  }, [user]);

  const handleSearch = (value: string): void => {
    setSearchTerm(value);
    fetchPrompts(value);
  };

  const handleCreatePrompt = (): void => {
    setIsCreateModalOpen(true);
  };

  const handlePromptCreated = (): void => {
    // Refresh the prompts list after successful creation
    fetchPrompts();
    setSuccessMessage('Prompt created successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExecutePrompt = (prompt: Prompt): void => {
    setExecutePrompt(prompt);
    setShowExecutionPanel(true);
  };

  const handleExecutionComplete = (): void => {
    // Add success notification and close panel
    setSuccessMessage('Prompt executed successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
    setExecutePrompt(null);
    setShowExecutionPanel(false);
  };

  const handleEditPrompt = (prompt: Prompt): void => {
    setEditPrompt(prompt);
  };

  const handleDeletePrompt = (prompt: Prompt): void => {
    setDeletePrompt(prompt);
  };

  const handleEditComplete = (): void => {
    setEditPrompt(null);
    fetchPrompts(); // Refresh list
    setSuccessMessage('Prompt updated successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteComplete = (): void => {
    setDeletePrompt(null);
    fetchPrompts(); // Refresh list
    setSuccessMessage('Prompt deleted successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Loading prompts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-destructive">Error: {error}</p>
        <Button variant="outline" onClick={() => fetchPrompts()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompts</h2>
        <Button onClick={handleCreatePrompt}>Create Prompt</Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search prompts"
          value={searchTerm}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Prompts List */}
      {prompts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No prompts found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {prompts.map(prompt => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{prompt.name}</CardTitle>
                    {prompt.description && (
                      <CardDescription>{prompt.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecutePrompt(prompt)}
                      disabled={loading}
                    >
                      Execute
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPrompt(prompt)}
                      disabled={loading}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePrompt(prompt)}
                      disabled={loading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {prompt.template && prompt.template.length > 100
                      ? `${prompt.template.substring(0, 100)}...`
                      : prompt.template}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Status: {prompt.status}</span>
                    <span>
                      Updated: {new Date(prompt.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Prompt Modal */}
      <PromptModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handlePromptCreated}
      />

      {/* Edit Prompt Modal */}
      <PromptModal
        isOpen={!!editPrompt}
        onOpenChange={open => !open && setEditPrompt(null)}
        onSuccess={handleEditComplete}
        prompt={editPrompt}
      />

      {/* Delete Prompt Dialog */}
      <DeletePromptDialog
        isOpen={!!deletePrompt}
        onOpenChange={open => !open && setDeletePrompt(null)}
        prompt={deletePrompt}
        onSuccess={handleDeleteComplete}
      />

      {/* Enhanced Execution Panel */}
      {showExecutionPanel && executePrompt && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Execute Prompt: {executePrompt.name}</CardTitle>
            <CardDescription>
              Configure variables and model settings for execution
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <EnhancedExecutionPanel
              prompt={executePrompt}
              onExecutionComplete={_result => {
                handleExecutionComplete();
              }}
              onExecutionStart={_executionId => {
                // Optional: Add execution tracking
              }}
            />
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExecutionPanel(false);
                  setExecutePrompt(null);
                }}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
