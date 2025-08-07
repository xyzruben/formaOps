import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}

export async function executePrompt(
  template: string,
  inputs: Record<string, unknown>
): Promise<{
  output: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    model: string;
  };
}> {
  const openai = getOpenAIClient();
  
  // Simple template substitution for Phase 2
  let processedPrompt = template;
  
  Object.entries(inputs).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processedPrompt = processedPrompt.replace(placeholder, String(value));
  });

  const startTime = Date.now();
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: processedPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const output = completion.choices[0]?.message?.content || '';
  const usage = completion.usage;

  if (!usage) {
    throw new Error('No usage information returned from OpenAI');
  }

  return {
    output,
    tokenUsage: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens,
      model: completion.model,
    },
  };
}