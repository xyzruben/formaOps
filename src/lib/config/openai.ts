import { z } from 'zod';

// Environment variable schema for validation
const OpenAIEnvironmentSchema = z.object({
  apiKey: z.string().min(1, 'OpenAI API key is required'),
  defaultModel: z.enum(['gpt-3.5-turbo', 'gpt-4'], {
    errorMap: () => ({ message: 'Model must be either gpt-3.5-turbo or gpt-4' })
  }),
  maxTokens: z.number().min(1).max(4000, 'Max tokens must be between 1 and 4000'),
  temperature: z.number().min(0).max(2, 'Temperature must be between 0 and 2'),
  costConfig: z.record(z.string(), z.object({
    input: z.number().min(0, 'Input cost must be non-negative'),
    output: z.number().min(0, 'Output cost must be non-negative'),
  })),
});

export interface OpenAIEnvironment {
  apiKey: string;
  defaultModel: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
  costConfig: Record<string, { input: number; output: number }>;
}

export interface OpenAIConfigValidationResult {
  isValid: boolean;
  config?: OpenAIEnvironment;
  errors: string[];
  warnings: string[];
}

class OpenAIConfigManager {
  private _config: OpenAIEnvironment | null = null;
  private _validationResult: OpenAIConfigValidationResult | null = null;

  /**
   * Load and validate OpenAI configuration from environment variables
   */
  public loadConfig(): OpenAIConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse environment variables
      const rawConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        costConfig: {
          'gpt-3.5-turbo': {
            input: parseFloat(process.env.GPT35_COST_PER_1K_INPUT || '0.0015'),
            output: parseFloat(process.env.GPT35_COST_PER_1K_OUTPUT || '0.002'),
          },
          'gpt-4': {
            input: parseFloat(process.env.GPT4_COST_PER_1K_INPUT || '0.03'),
            output: parseFloat(process.env.GPT4_COST_PER_1K_OUTPUT || '0.06'),
          },
        },
      };

      // Validate API key format
      if (rawConfig.apiKey && !rawConfig.apiKey.startsWith('sk-')) {
        errors.push('OpenAI API key must start with "sk-"');
      }

      // Check for missing API key
      if (!rawConfig.apiKey) {
        errors.push('OpenAI API key is required (OPENAI_API_KEY)');
      }

      // Validate numeric parsing
      if (isNaN(rawConfig.maxTokens)) {
        errors.push('OPENAI_MAX_TOKENS must be a valid number');
        rawConfig.maxTokens = 2000; // fallback
      }

      if (isNaN(rawConfig.temperature)) {
        errors.push('OPENAI_TEMPERATURE must be a valid number');
        rawConfig.temperature = 0.7; // fallback
      }

      // Validate cost configuration
      Object.entries(rawConfig.costConfig).forEach(([model, costs]) => {
        if (isNaN(costs.input)) {
          errors.push(`${model.toUpperCase()}_COST_PER_1K_INPUT must be a valid number`);
          costs.input = model === 'gpt-3.5-turbo' ? 0.0015 : 0.03; // fallback
        }
        if (isNaN(costs.output)) {
          errors.push(`${model.toUpperCase()}_COST_PER_1K_OUTPUT must be a valid number`);
          costs.output = model === 'gpt-3.5-turbo' ? 0.002 : 0.06; // fallback
        }
      });

      // Validate using Zod schema
      const validationResult = OpenAIEnvironmentSchema.safeParse(rawConfig);

      if (!validationResult.success) {
        validationResult.error.errors.forEach(error => {
          errors.push(`${error.path.join('.')}: ${error.message}`);
        });
      }

      // Generate warnings for default values
      if (!process.env.OPENAI_DEFAULT_MODEL) {
        warnings.push('Using default model: gpt-3.5-turbo (set OPENAI_DEFAULT_MODEL to customize)');
      }

      if (!process.env.OPENAI_MAX_TOKENS) {
        warnings.push('Using default max tokens: 2000 (set OPENAI_MAX_TOKENS to customize)');
      }

      if (!process.env.OPENAI_TEMPERATURE) {
        warnings.push('Using default temperature: 0.7 (set OPENAI_TEMPERATURE to customize)');
      }

      // Check for environment-specific warnings
      if (process.env.NODE_ENV === 'production' && rawConfig.apiKey.includes('your-key-here')) {
        errors.push('Production environment detected but API key appears to be placeholder');
      }

      const isValid = errors.length === 0;
      const result: OpenAIConfigValidationResult = {
        isValid,
        config: isValid ? rawConfig as OpenAIEnvironment : undefined,
        errors,
        warnings,
      };

      this._validationResult = result;
      if (isValid) {
        this._config = rawConfig as OpenAIEnvironment;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
      errors.push(`Configuration loading failed: ${errorMessage}`);
      
      const result: OpenAIConfigValidationResult = {
        isValid: false,
        errors,
        warnings,
      };

      this._validationResult = result;
      return result;
    }
  }

  /**
   * Get the validated configuration
   * Throws error if configuration is not valid
   */
  public getConfig(): OpenAIEnvironment {
    if (!this._config) {
      const result = this.loadConfig();
      if (!result.isValid) {
        throw new Error(`Invalid OpenAI configuration: ${result.errors.join(', ')}`);
      }
    }
    return this._config!;
  }

  /**
   * Get the latest validation result
   */
  public getValidationResult(): OpenAIConfigValidationResult | null {
    return this._validationResult;
  }

  /**
   * Check if the current configuration is valid
   */
  public isConfigValid(): boolean {
    if (!this._validationResult) {
      this.loadConfig();
    }
    return this._validationResult?.isValid ?? false;
  }

  /**
   * Get cost configuration for a specific model
   */
  public getModelCost(model: string): { input: number; output: number } {
    const config = this.getConfig();
    const cost = config.costConfig[model];
    
    if (!cost) {
      // Fallback to GPT-3.5 costs for unknown models
      return config.costConfig['gpt-3.5-turbo'] || { input: 0.0015, output: 0.002 };
    }
    
    return cost;
  }

  /**
   * Get all supported models and their costs
   */
  public getSupportedModels(): Record<string, { input: number; output: number }> {
    const config = this.getConfig();
    return config.costConfig;
  }

  /**
   * Validate API key format without loading full config
   */
  public static validateApiKeyFormat(apiKey: string): boolean {
    return typeof apiKey === 'string' && apiKey.startsWith('sk-') && apiKey.length > 10;
  }

  /**
   * Get default configuration values
   */
  public static getDefaults(): Omit<OpenAIEnvironment, 'apiKey'> {
    return {
      defaultModel: 'gpt-3.5-turbo',
      maxTokens: 2000,
      temperature: 0.7,
      costConfig: {
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4': { input: 0.03, output: 0.06 },
      },
    };
  }

  /**
   * Reset the configuration cache (useful for testing)
   */
  public reset(): void {
    this._config = null;
    this._validationResult = null;
  }
}

// Export singleton instance
export const openAIConfig = new OpenAIConfigManager();

// Export the class for testing
export { OpenAIConfigManager };

// Helper function for backward compatibility
export function getOpenAIConfig(): OpenAIEnvironment {
  return openAIConfig.getConfig();
}

// Helper function to validate configuration
export function validateOpenAIConfig(): OpenAIConfigValidationResult {
  return openAIConfig.loadConfig();
}