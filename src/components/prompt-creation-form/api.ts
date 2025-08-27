// API integration for prompt creation
import type { CreatePromptRequest, CreatePromptResponse } from './types';

export const createPrompt = async (
  data: CreatePromptRequest
): Promise<CreatePromptResponse> => {
  const response = await fetch('/api/prompts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to create prompt');
  }

  return response.json();
};
