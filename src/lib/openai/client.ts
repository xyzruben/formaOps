import OpenAI from 'openai';
import { costTracker } from '../monitoring/cost-tracker';
import { logger } from '../monitoring/logger';
import { openAIConfig } from '../config/openai';
import {
  ValidationError,
  ServiceUnavailableError,
  RateLimitError,
} from '../utils/error-handler';

export interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
}

export interface ExecutionResult {
  output: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  model: string;
}

export class OpenAIClient {
  private client: OpenAI;
  private defaultConfig: OpenAIConfig;

  constructor(apiKey?: string) {
    // Try to load configuration from config manager first
    let configFromManager: any = null;
    try {
      configFromManager = openAIConfig.getConfig();
    } catch (error) {
      // Fall back to environment variables if config manager fails
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to load OpenAI config, falling back to environment variables:',
        error
      );
    }

    // Determine API key
    const resolvedApiKey =
      apiKey || configFromManager?.apiKey || process.env.OPENAI_API_KEY;
    if (!resolvedApiKey) {
      throw new ValidationError('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: resolvedApiKey,
    });

    // Use config manager values if available, otherwise fall back to environment variables
    this.defaultConfig = {
      apiKey: resolvedApiKey,
      model:
        configFromManager?.defaultModel ||
        (process.env.OPENAI_DEFAULT_MODEL as 'gpt-3.5-turbo' | 'gpt-4') ||
        'gpt-3.5-turbo',
      maxTokens:
        configFromManager?.maxTokens ||
        parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature:
        configFromManager?.temperature ||
        parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    };

    this.validateConfig(this.defaultConfig);
  }

  private validateConfig(config: OpenAIConfig): void {
    // Validate API key format
    if (!config.apiKey.startsWith('sk-')) {
      throw new ValidationError('Invalid OpenAI API key format');
    }

    // Validate model
    const supportedModels = ['gpt-3.5-turbo', 'gpt-4'];
    if (!supportedModels.includes(config.model)) {
      throw new ValidationError(
        `Unsupported model: ${config.model}. Supported: ${supportedModels.join(', ')}`
      );
    }

    // Validate maxTokens
    if (config.maxTokens < 1 || config.maxTokens > 4000) {
      throw new ValidationError('maxTokens must be between 1 and 4000');
    }

    // Validate temperature
    if (config.temperature < 0 || config.temperature > 2) {
      throw new ValidationError('temperature must be between 0 and 2');
    }
  }

  public async executePrompt(
    prompt: string,
    config?: Partial<OpenAIConfig>,
    executionId?: string
  ): Promise<ExecutionResult> {
    const executionConfig = { ...this.defaultConfig, ...config };

    // Validate merged config
    this.validateConfig(executionConfig);

    const startTime = Date.now();

    try {
      // Log execution start
      if (executionId) {
        await logger.info(
          'Starting OpenAI API call',
          {
            model: executionConfig.model,
            maxTokens: executionConfig.maxTokens,
            temperature: executionConfig.temperature,
            promptLength: prompt.length,
          },
          executionId
        );
      }

      // Make the API call
      const completion = await this.client.chat.completions.create({
        model: executionConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: executionConfig.maxTokens,
        temperature: executionConfig.temperature,
      });

      const latencyMs = Date.now() - startTime;

      // Extract response data
      const output = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      if (!usage) {
        throw new ServiceUnavailableError(
          'OpenAI API did not return usage information'
        );
      }

      const tokenUsage = {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      };

      // Calculate cost using the new OpenAI-specific method
      const costUsd = costTracker.calculateOpenAICost(
        tokenUsage,
        executionConfig.model
      );

      // Track execution if executionId is provided
      if (executionId) {
        await costTracker.trackExecution(executionId, costUsd, tokenUsage);
      }

      // Log successful completion
      if (executionId) {
        await logger.info(
          'OpenAI API call completed successfully',
          {
            latencyMs,
            tokenUsage,
            costUsd,
            outputLength: output.length,
          },
          executionId
        );

        // Log performance metric
        await logger.logPerformance({
          name: 'openai_api_latency',
          value: latencyMs,
          unit: 'ms',
          metadata: {
            model: executionConfig.model,
            inputTokens: tokenUsage.inputTokens,
            outputTokens: tokenUsage.outputTokens,
          },
        });
      }

      return {
        output,
        tokenUsage,
        costUsd,
        model: executionConfig.model,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Handle specific OpenAI errors
      if (error && typeof error === 'object') {
        const openaiError = error as any;

        // Rate limit error
        if (openaiError.status === 429) {
          const retryAfter = openaiError.headers?.['retry-after']
            ? parseInt(openaiError.headers['retry-after'])
            : 60;

          if (executionId) {
            await logger.error(
              'OpenAI rate limit exceeded',
              error,
              {
                latencyMs,
                retryAfter,
              },
              executionId
            );
          }

          throw new RateLimitError(
            `OpenAI rate limit exceeded. Retry after ${retryAfter} seconds.`,
            retryAfter
          );
        }

        // API error
        if (openaiError.status >= 400 && openaiError.status < 500) {
          if (executionId) {
            await logger.error(
              'OpenAI API client error',
              error,
              {
                status: openaiError.status,
                latencyMs,
              },
              executionId
            );
          }

          throw new ValidationError(
            `OpenAI API error: ${openaiError.message || 'Invalid request'}`
          );
        }

        // Server error
        if (openaiError.status >= 500) {
          if (executionId) {
            await logger.error(
              'OpenAI API server error',
              error,
              {
                status: openaiError.status,
                latencyMs,
              },
              executionId
            );
          }

          throw new ServiceUnavailableError('OpenAI API');
        }
      }

      // Generic error handling
      if (executionId) {
        await logger.error(
          'OpenAI API call failed',
          error,
          {
            latencyMs,
          },
          executionId
        );
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new ServiceUnavailableError('OpenAI API');
    }
  }

  public estimateCost(
    inputLength: number,
    expectedOutputLength: number,
    model?: string
  ): {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: number;
  } {
    return costTracker.estimateExecutionCost(
      inputLength,
      expectedOutputLength,
      model || this.defaultConfig.model
    );
  }

  public getSupportedModels(): string[] {
    return ['gpt-3.5-turbo', 'gpt-4'];
  }

  public getDefaultConfig(): OpenAIConfig {
    return { ...this.defaultConfig };
  }

  public async validateConnection(): Promise<boolean> {
    try {
      // Test with a minimal prompt
      const result = await this.executePrompt('Hello', {
        maxTokens: 5,
        temperature: 0,
      });

      return Boolean(result.output && result.tokenUsage.totalTokens > 0);
    } catch (error) {
      await logger.error('OpenAI connection validation failed', error);
      return false;
    }
  }
}

// Create and export singleton instance
const openAIClient = new OpenAIClient();

export { openAIClient };
export default openAIClient;
