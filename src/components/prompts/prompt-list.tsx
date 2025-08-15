'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { usePrompts } from '@/hooks/use-prompts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface PromptListProps {
  onCreatePrompt?: () => void;
  onEditPrompt?: (id: string) => void;
}

export function PromptList({
  onCreatePrompt,
  onEditPrompt,
}: PromptListProps): JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<
    'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined
  >(undefined);

  const { prompts, loading, error, deletePrompt } = usePrompts({
    search: search || undefined,
    status,
  });

  const handleDelete = async (id: string): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await deletePrompt(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete prompt');
      }
    }
  };

  const handleViewPrompt = (id: string): void => {
    router.push(`/prompts/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading prompts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Prompts</h2>
        <Button onClick={onCreatePrompt}>Create Prompt</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={status === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(undefined)}
          >
            All
          </Button>
          <Button
            variant={status === 'DRAFT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('DRAFT')}
          >
            Draft
          </Button>
          <Button
            variant={status === 'PUBLISHED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('PUBLISHED')}
          >
            Published
          </Button>
          <Button
            variant={status === 'ARCHIVED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('ARCHIVED')}
          >
            Archived
          </Button>
        </div>
      </div>

      {/* Prompt List */}
      {prompts.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No prompts found</p>
              <Button onClick={onCreatePrompt}>Create your first prompt</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map(prompt => (
            <Card
              key={prompt.id}
              className="group hover:shadow-md transition-shadow cursor-pointer"
            >
              <div onClick={() => handleViewPrompt(prompt.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {prompt.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            prompt.status === 'PUBLISHED'
                              ? 'default'
                              : prompt.status === 'DRAFT'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {prompt.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {prompt._count.executions} runs
                        </span>
                      </div>
                    </div>
                  </div>
                  {prompt.description && (
                    <CardDescription className="line-clamp-2">
                      {prompt.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>Updated {formatDate(prompt.updatedAt)}</span>
                  </div>
                </CardContent>
              </div>

              <CardContent className="pt-0">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={e => {
                      e.stopPropagation();
                      handleViewPrompt(prompt.id);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={e => {
                      e.stopPropagation();
                      onEditPrompt?.(prompt.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(prompt.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
