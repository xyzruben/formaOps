'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PromptsResponse, CreatePromptRequest, UpdatePromptRequest } from '@/types';

interface UsePromptsOptions {
  page?: number;
  limit?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  search?: string;
}

export function usePrompts(options: UsePromptsOptions = {}) {
  const [data, setData] = useState<PromptsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.page) params.set('page', options.page.toString());
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.status) params.set('status', options.status);
      if (options.search) params.set('search', options.search);

      const response = await fetch(`/api/prompts?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prompts');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.page, options.limit, options.status, options.search]);

  const createPrompt = useCallback(async (promptData: CreatePromptRequest) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promptData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create prompt');
      }

      const newPrompt = await response.json();
      
      // Refresh the list
      await fetchPrompts();
      
      return newPrompt;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [fetchPrompts]);

  const updatePrompt = useCallback(async (id: string, promptData: UpdatePromptRequest) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promptData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update prompt');
      }

      const updatedPrompt = await response.json();
      
      // Refresh the list
      await fetchPrompts();
      
      return updatedPrompt;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [fetchPrompts]);

  const deletePrompt = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete prompt');
      }

      // Refresh the list
      await fetchPrompts();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [fetchPrompts]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return {
    prompts: data?.prompts || [],
    pagination: data?.pagination,
    loading,
    error,
    refetch: fetchPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
  };
}