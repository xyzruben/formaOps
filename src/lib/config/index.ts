// Import for internal use
import { validateOpenAIConfig } from './openai';

// Export OpenAI configuration management
export { 
  openAIConfig, 
  OpenAIConfigManager,
  getOpenAIConfig,
  validateOpenAIConfig,
  type OpenAIEnvironment,
  type OpenAIConfigValidationResult 
} from './openai';

// Helper to validate all configurations
export function validateAllConfigurations(): {
  openai: any;
  // Add other config validations here as they're implemented
} {
  return {
    openai: validateOpenAIConfig(),
  };
}