'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSpinner, LoadingState, ErrorState } from '@/components/ui/loading-spinner';
import { ExecutionPanel } from '@/components/execution/execution-panel';
import { ExecutionHistory } from '@/components/execution/execution-history';

interface PromptWithDetails {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: any;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  userId: string;
  validations: any[];
  _count: {
    executions: number;
    versions: number;
  };
}

interface PromptTabs {
  details: boolean;
  executions: boolean;
  history: boolean;
  settings: boolean;
}

export default function PromptDetailPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;
  
  const [prompt, setPrompt] = useState<PromptWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPrompt = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/prompts/${promptId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Prompt not found');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch prompt: ${response.status}`);
      }

      const promptData = await response.json();
      setPrompt(promptData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load prompt';
      setError(message);
      console.error('Error fetching prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!prompt) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${prompt.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete prompt');
      }

      // Redirect to prompts list
      router.push('/prompts');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete prompt';
      alert(`Delete failed: ${message}`);
      console.error('Error deleting prompt:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): Promise<void> => {
    if (!prompt) return;

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update prompt status');
      }

      const updatedPrompt = await response.json();
      setPrompt(updatedPrompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      alert(`Status update failed: ${message}`);
      console.error('Error updating prompt status:', err);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'default';
      case 'DRAFT':
        return 'secondary';
      case 'ARCHIVED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatVariables = (variables: any): string => {
    if (!variables || !Array.isArray(variables)) return 'No variables defined';
    if (variables.length === 0) return 'No variables defined';
    
    return variables.map((v: any) => `{{${v.name}}} (${v.type})`).join(', ');
  };

  useEffect(() => {
    if (promptId) {
      fetchPrompt();
    }
  }, [promptId]);

  if (loading) {
    return <LoadingState message="Loading prompt details..." />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState 
          message={error} 
          onRetry={fetchPrompt}
        />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState 
          message="Prompt not found" 
          onRetry={() => router.push('/prompts')}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/prompts')}
            >
              ← Back to Prompts
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{prompt.name}</h1>
          {prompt.description && (
            <p className="text-muted-foreground text-lg">{prompt.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant={getStatusBadgeVariant(prompt.status)}>
              {prompt.status}
            </Badge>
            <span>{prompt._count.executions} executions</span>
            <span>Updated {formatDate(prompt.updatedAt)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status Actions */}
          {prompt.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('PUBLISHED')}
            >
              Publish
            </Button>
          )}
          {prompt.status === 'PUBLISHED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('ARCHIVED')}
            >
              Archive
            </Button>
          )}
          {prompt.status === 'ARCHIVED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('DRAFT')}
            >
              Restore to Draft
            </Button>
          )}
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="executions">Execute</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Template */}
            <Card>
              <CardHeader>
                <CardTitle>Template</CardTitle>
                <CardDescription>
                  The prompt template with variable placeholders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                    <code>{prompt.template}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Variables & Metadata */}
            <div className="space-y-6">
              {/* Variables */}
              <Card>
                <CardHeader>
                  <CardTitle>Variables</CardTitle>
                  <CardDescription>
                    Template variables and their types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {formatVariables(prompt.variables)}
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(prompt.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Updated:</span>
                    <span>{formatDate(prompt.updatedAt)}</span>
                  </div>
                  {prompt.publishedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Published:</span>
                      <span>{formatDate(prompt.publishedAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Executions:</span>
                    <span>{prompt._count.executions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Versions:</span>
                    <span>{prompt._count.versions}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle>Execute Prompt</CardTitle>
              <CardDescription>
                Run this prompt with custom inputs and model settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExecutionPanel 
                prompt={prompt} 
                onExecutionComplete={(result) => {
                  console.log('Execution completed:', result);
                  // Switch to history tab to see the new execution
                  setActiveTab('history');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>
                Past executions of this prompt with their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExecutionHistory 
                userId={prompt.userId}
                promptId={prompt.id}
                onExecutionSelect={(executionId) => {
                  console.log('Selected execution:', executionId);
                  // Could navigate to detailed execution view
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Settings</CardTitle>
              <CardDescription>
                Configuration and validation settings for this prompt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Prompt settings and validation configuration will be implemented in a future update.
                </div>
                
                {/* Status Control */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex gap-2">
                    <Button
                      variant={prompt.status === 'DRAFT' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange('DRAFT')}
                    >
                      Draft
                    </Button>
                    <Button
                      variant={prompt.status === 'PUBLISHED' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange('PUBLISHED')}
                    >
                      Published
                    </Button>
                    <Button
                      variant={prompt.status === 'ARCHIVED' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange('ARCHIVED')}
                    >
                      Archived
                    </Button>
                  </div>
                </div>

                {/* Validations */}
                {prompt.validations && prompt.validations.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Validations</label>
                    <div className="text-sm text-muted-foreground">
                      {prompt.validations.length} validation rules configured
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}