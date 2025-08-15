import OpenAI from 'openai';
import type { Priority } from '@prisma/client';
import { priorityManager } from './priority-manager';
import type { ExecutionJob } from './priority-manager';

export interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  description: string;
}

export interface ExecutionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  priority?: Priority;
  timeout?: number;
}

export interface ExecutionResult {
  output: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    model: string;
  };
  costUsd: number;
  latencyMs: number;
  executionId: string;
}

export class AIExecutor {
  private openai: OpenAI;
  private readonly models: Map<string, ModelConfig> = new Map();

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.openai = new OpenAI({ apiKey });

    // Initialize available models
    this.initializeModels();
  }

  public async executeWithPriority(
    promptId: string,
    userId: string,
    template: string,
    inputs: Record<string, unknown>,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    // Create execution job
    const job: ExecutionJob = {
      id: executionId,
      promptId,
      userId,
      priority: options.priority || 'NORMAL',
      inputs,
      createdAt: new Date(),
      estimatedDuration: this.estimateExecutionTime(options.model),
    };

    // Schedule execution through priority manager
    const scheduling = await priorityManager.scheduleExecution(job);

    if (!scheduling.shouldExecuteNow) {
      throw new Error(
        `Execution queued. Position: ${scheduling.queuePosition}, Estimated wait: ${scheduling.estimatedWaitTime}ms`
      );
    }

    try {
      const result = await this.executePrompt(template, inputs, options);

      // Mark execution as complete
      priorityManager.completeExecution(executionId, true);

      return {
        ...result,
        executionId,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      // Mark execution as failed
      priorityManager.completeExecution(executionId, false);
      throw error;
    }
  }

  public async executePrompt(
    template: string,
    inputs: Record<string, unknown>,
    options: ExecutionOptions = {}
  ): Promise<Omit<ExecutionResult, 'executionId' | 'latencyMs'>> {
    const modelName = options.model || 'gpt-3.5-turbo';
    const modelConfig = this.models.get(modelName);

    if (!modelConfig) {
      throw new Error(`Unsupported model: ${modelName}`);
    }

    // Process template with advanced variable substitution
    const processedPrompt = this.processTemplate(template, inputs);

    try {
      const completion = await this.openai.chat.completions.create(
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: processedPrompt,
            },
          ],
          temperature: options.temperature || 0.7,
          max_tokens: Math.min(
            options.maxTokens || modelConfig.maxTokens,
            modelConfig.maxTokens
          ),
        },
        {
          timeout: options.timeout || 30000,
        }
      );

      const output = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      if (!usage) {
        throw new Error('No usage information returned from OpenAI');
      }

      // Calculate cost
      const costUsd = this.calculateCost(
        usage.prompt_tokens,
        usage.completion_tokens,
        modelConfig
      );

      return {
        output,
        tokenUsage: {
          input: usage.prompt_tokens,
          output: usage.completion_tokens,
          total: usage.total_tokens,
          model: completion.model,
        },
        costUsd,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
      throw error;
    }
  }

  public getAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  public getSystemLoad(): ReturnType<typeof priorityManager.getSystemLoad> {
    return priorityManager.getSystemLoad();
  }

  private initializeModels(): void {
    // GPT models with current pricing (as of 2024)
    this.models.set('gpt-3.5-turbo', {
      name: 'GPT-3.5 Turbo',
      maxTokens: 4096,
      costPer1kInput: 0.0015,
      costPer1kOutput: 0.002,
      description: 'Fast and efficient for most tasks',
    });

    this.models.set('gpt-4', {
      name: 'GPT-4',
      maxTokens: 8192,
      costPer1kInput: 0.03,
      costPer1kOutput: 0.06,
      description: 'More capable, better at complex tasks',
    });

    this.models.set('gpt-4-turbo-preview', {
      name: 'GPT-4 Turbo',
      maxTokens: 128000,
      costPer1kInput: 0.01,
      costPer1kOutput: 0.03,
      description: 'Latest GPT-4 with larger context window',
    });
  }

  private processTemplate(
    template: string,
    inputs: Record<string, unknown>
  ): string {
    let processed = template;

    // Handle array iteration (simple Handlebars-like syntax)
    processed = processed.replace(
      /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g,
      (match, arrayName, content) => {
        const array = inputs[arrayName];
        if (!Array.isArray(array)) {
          return '';
        }

        return array
          .map(item => {
            return content.replace(/{{this}}/g, String(item));
          })
          .join('\n');
      }
    );

    // Handle conditional blocks
    processed = processed.replace(
      /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
      (match, varName, content) => {
        const value = inputs[varName];
        return value ? content : '';
      }
    );

    // Handle simple variable substitution
    Object.entries(inputs).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(placeholder, String(value));
    });

    return processed;
  }

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: ModelConfig
  ): number {
    return (
      (inputTokens * model.costPer1kInput) / 1000 +
      (outputTokens * model.costPer1kOutput) / 1000
    );
  }

  private estimateExecutionTime(model?: string): number {
    // Rough estimates based on model complexity
    const baseTimes = {
      'gpt-3.5-turbo': 2000,
      'gpt-4': 8000,
      'gpt-4-turbo-preview': 5000,
    };

    return (
      baseTimes[model as keyof typeof baseTimes] || baseTimes['gpt-3.5-turbo']
    );
  }
}

// Singleton instance
export const aiExecutor = new AIExecutor();
