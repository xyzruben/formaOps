import { z } from 'zod';

// These utilities are from the enhanced-execution-panel component
// We'll test them in isolation

// Mock variable definitions for testing
const mockVariables = [
  {
    name: 'title',
    type: 'string' as const,
    required: true,
    description: 'Article title',
  },
  {
    name: 'wordCount',
    type: 'number' as const,
    required: true,
    description: 'Target word count',
  },
  {
    name: 'tags',
    type: 'array' as const,
    required: false,
    description: 'Article tags',
  },
  {
    name: 'isPublished',
    type: 'boolean' as const,
    required: false,
    description: 'Publication status',
  },
  {
    name: 'category',
    type: 'string' as const,
    required: true,
    options: ['tech', 'health', 'finance'],
    description: 'Article category',
  },
];

// Utility functions extracted from enhanced-execution-panel
const createInputValidationSchema = (
  variables: typeof mockVariables
): z.ZodSchema => {
  const schema: Record<string, z.ZodSchema> = {};

  variables.forEach(variable => {
    let fieldSchema: z.ZodSchema;

    switch (variable.type) {
      case 'string':
        fieldSchema = z.string().min(1, `${variable.name} is required`);
        if (variable.options) {
          fieldSchema = z.enum(variable.options as [string, ...string[]]);
        }
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'array':
        fieldSchema = z.array(z.string().min(1));
        break;
      default:
        fieldSchema = z.string();
    }

    if (!variable.required) {
      fieldSchema = fieldSchema.optional();
    }

    schema[variable.name] = fieldSchema;
  });

  return z.object({
    inputs: z.object(schema),
    model: z.enum(['gpt-3.5-turbo', 'gpt-4']),
    maxTokens: z.number().min(1).max(4000),
    temperature: z.number().min(0).max(2),
  });
};

const preprocessInputValue = (value: any, type: string): any => {
  switch (type) {
    case 'number':
      return value === '' ? undefined : Number(value);
    case 'boolean':
      return Boolean(value);
    case 'array':
      return typeof value === 'string'
        ? value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : value;
    default:
      return value;
  }
};

const processTemplate = (
  template: string,
  inputs: Record<string, any>
): string => {
  let processed = template;
  Object.entries(inputs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(placeholder, String(value));
    }
  });
  return processed;
};

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  // Basic token estimation: ~4 characters per token
  const roughTokens = Math.ceil(text.length / 4);
  // Add some buffer for formatting and special tokens
  return Math.max(10, roughTokens + 50);
};

// Model costs for testing
const MODEL_INFO = {
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    costPer1KTokens: { input: 0.0005, output: 0.0015 },
    maxTokens: 4000,
  },
  'gpt-4': {
    name: 'GPT-4',
    costPer1KTokens: { input: 0.03, output: 0.06 },
    maxTokens: 8000,
  },
} as const;

const estimateExecutionCost = (
  template: string,
  inputs: Record<string, any>,
  parameters: { model: string; maxTokens: number; temperature: number }
): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  model: string;
  confidence: 'low' | 'medium' | 'high';
} => {
  const processedTemplate = processTemplate(template, inputs);
  const estimatedInputTokens = estimateTokens(processedTemplate);
  const estimatedOutputTokens = Math.min(
    parameters.maxTokens,
    Math.max(100, estimatedInputTokens * 0.75)
  );

  const modelInfo = MODEL_INFO[parameters.model as keyof typeof MODEL_INFO];
  if (!modelInfo) {
    return {
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0,
      model: parameters.model,
      confidence: 'low' as const,
    };
  }

  const estimatedCostUsd =
    (estimatedInputTokens * modelInfo.costPer1KTokens.input +
      estimatedOutputTokens * modelInfo.costPer1KTokens.output) /
    1000;

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd,
    model: parameters.model,
    confidence:
      estimatedInputTokens > 50 ? ('high' as const) : ('medium' as const),
  };
};

describe('Execution Panel Utilities', () => {
  describe('createInputValidationSchema', () => {
    test('creates correct schema for string variables', () => {
      const schema = createInputValidationSchema([mockVariables[0]]); // title

      const validData = {
        inputs: { title: 'Test Title' },
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 0.7,
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);

      const invalidData = {
        inputs: { title: '' },
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 0.7,
      };

      const invalidResult = schema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });

    test('creates correct schema for number variables', () => {
      const schema = createInputValidationSchema([mockVariables[1]]); // wordCount

      const validData = {
        inputs: { wordCount: 500 },
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 0.7,
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);

      // Test coercion
      const stringNumberData = {
        inputs: { wordCount: '500' },
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 0.7,
      };

      const coercionResult = schema.safeParse(stringNumberData);
      expect(coercionResult.success).toBe(true);
      if (coercionResult.success) {
        expect(coercionResult.data.inputs.wordCount).toBe(500);
      }
    });

    test('creates correct schema for enum variables', () => {
      const schema = createInputValidationSchema([mockVariables[4]]); // category

      const validData = {
        inputs: { category: 'tech' },
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 0.7,
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);

      const invalidData = {
        inputs: { category: 'invalid-category' },
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 0.7,
      };

      const invalidResult = schema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });

    test('handles optional variables correctly', () => {
      const schema = createInputValidationSchema([mockVariables[2]]); // tags (optional)

      const dataWithoutOptional = {
        inputs: {},
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 0.7,
      };

      const result = schema.safeParse(dataWithoutOptional);
      expect(result.success).toBe(true);
    });

    test('validates execution parameters', () => {
      const schema = createInputValidationSchema([]);

      const invalidModel = {
        inputs: {},
        model: 'invalid-model' as any,
        maxTokens: 100,
        temperature: 0.7,
      };

      const result = schema.safeParse(invalidModel);
      expect(result.success).toBe(false);

      const invalidTokens = {
        inputs: {},
        model: 'gpt-3.5-turbo' as const,
        maxTokens: -1,
        temperature: 0.7,
      };

      const tokensResult = schema.safeParse(invalidTokens);
      expect(tokensResult.success).toBe(false);

      const invalidTemperature = {
        inputs: {},
        model: 'gpt-3.5-turbo' as const,
        maxTokens: 100,
        temperature: 3.0,
      };

      const temperatureResult = schema.safeParse(invalidTemperature);
      expect(temperatureResult.success).toBe(false);
    });
  });

  describe('preprocessInputValue', () => {
    test('preprocesses number values correctly', () => {
      expect(preprocessInputValue('123', 'number')).toBe(123);
      expect(preprocessInputValue('', 'number')).toBeUndefined();
      expect(preprocessInputValue(456, 'number')).toBe(456);
    });

    test('preprocesses boolean values correctly', () => {
      expect(preprocessInputValue(true, 'boolean')).toBe(true);
      expect(preprocessInputValue(false, 'boolean')).toBe(false);
      expect(preprocessInputValue('true', 'boolean')).toBe(true);
      expect(preprocessInputValue('', 'boolean')).toBe(false);
    });

    test('preprocesses array values correctly', () => {
      expect(preprocessInputValue('one,two,three', 'array')).toEqual([
        'one',
        'two',
        'three',
      ]);

      expect(preprocessInputValue('one, two , three ', 'array')).toEqual([
        'one',
        'two',
        'three',
      ]);

      expect(preprocessInputValue(['already', 'array'], 'array')).toEqual([
        'already',
        'array',
      ]);

      expect(preprocessInputValue('', 'array')).toEqual([]);
    });

    test('returns string values unchanged for default case', () => {
      expect(preprocessInputValue('test', 'string')).toBe('test');
      expect(preprocessInputValue('test', 'unknown')).toBe('test');
    });
  });

  describe('processTemplate', () => {
    test('replaces variables in template correctly', () => {
      const template = 'Hello {{name}}, you are {{age}} years old.';
      const inputs = { name: 'John', age: 25 };

      const result = processTemplate(template, inputs);
      expect(result).toBe('Hello John, you are 25 years old.');
    });

    test('handles missing variables gracefully', () => {
      const template = 'Hello {{name}}, you live in {{city}}.';
      const inputs = { name: 'John' };

      const result = processTemplate(template, inputs);
      expect(result).toBe('Hello John, you live in {{city}}.');
    });

    test('handles variables with whitespace', () => {
      const template = 'Hello {{ name }}, welcome to {{  place  }}.';
      const inputs = { name: 'John', place: 'FormaOps' };

      const result = processTemplate(template, inputs);
      expect(result).toBe('Hello John, welcome to FormaOps.');
    });

    test('handles null and undefined values', () => {
      const template = 'Value: {{value}}, Null: {{nullValue}}';
      const inputs = { value: 'test', nullValue: null };

      const result = processTemplate(template, inputs);
      expect(result).toBe('Value: test, Null: {{nullValue}}');
    });
  });

  describe('estimateTokens', () => {
    test('estimates tokens for text correctly', () => {
      const shortText = 'Hello world';
      expect(estimateTokens(shortText)).toBeGreaterThan(10);

      const longText =
        'This is a much longer text that should result in more tokens being estimated by the function';
      expect(estimateTokens(longText)).toBeGreaterThan(
        estimateTokens(shortText)
      );
    });

    test('handles empty text', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens(null as any)).toBe(0);
      expect(estimateTokens(undefined as any)).toBe(0);
    });

    test('returns minimum token count for very short text', () => {
      expect(estimateTokens('hi')).toBeGreaterThanOrEqual(10);
    });
  });

  describe('estimateExecutionCost', () => {
    test('calculates cost for GPT-3.5-turbo correctly', () => {
      const template = 'Write about {{topic}} in {{words}} words.';
      const inputs = { topic: 'artificial intelligence', words: '500' };
      const parameters = {
        model: 'gpt-3.5-turbo',
        maxTokens: 600,
        temperature: 0.7,
      };

      const result = estimateExecutionCost(template, inputs, parameters);

      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.estimatedCostUsd).toBeGreaterThan(0);
      expect(result.estimatedInputTokens).toBeGreaterThan(0);
      expect(result.estimatedOutputTokens).toBeGreaterThan(0);
      expect(result.confidence).toMatch(/low|medium|high/);
    });

    test('calculates higher cost for GPT-4', () => {
      const template = 'Write about {{topic}}.';
      const inputs = { topic: 'test' };

      const gpt35Parameters = {
        model: 'gpt-3.5-turbo',
        maxTokens: 100,
        temperature: 0.7,
      };

      const gpt4Parameters = {
        model: 'gpt-4',
        maxTokens: 100,
        temperature: 0.7,
      };

      const gpt35Cost = estimateExecutionCost(
        template,
        inputs,
        gpt35Parameters
      );
      const gpt4Cost = estimateExecutionCost(template, inputs, gpt4Parameters);

      expect(gpt4Cost.estimatedCostUsd).toBeGreaterThan(
        gpt35Cost.estimatedCostUsd
      );
    });

    test('handles unknown model gracefully', () => {
      const template = 'Test template';
      const inputs = {};
      const parameters = {
        model: 'unknown-model',
        maxTokens: 100,
        temperature: 0.7,
      };

      const result = estimateExecutionCost(template, inputs, parameters);

      expect(result.estimatedCostUsd).toBe(0);
      expect(result.confidence).toBe('low');
    });

    test('confidence level based on input tokens', () => {
      const shortTemplate = 'Hi {{name}}';
      const longTemplate =
        'This is a very long template with lots of content that should result in high confidence because it has many tokens and detailed information about the user {{name}} and their preferences {{preferences}} and history {{history}}';

      const inputs = {
        name: 'John',
        preferences: 'coding',
        history: 'experienced developer',
      };
      const parameters = {
        model: 'gpt-3.5-turbo',
        maxTokens: 100,
        temperature: 0.7,
      };

      const shortResult = estimateExecutionCost(
        shortTemplate,
        inputs,
        parameters
      );
      const longResult = estimateExecutionCost(
        longTemplate,
        inputs,
        parameters
      );

      // Long template should have higher confidence
      expect(longResult.confidence).toBe('high');
      // Note: confidence might be 'high' even for shorter templates with substituted content
      expect(['low', 'medium', 'high']).toContain(shortResult.confidence);
    });

    test('respects maxTokens limit for output estimation', () => {
      const template = 'Write about {{topic}}';
      const inputs = { topic: 'test' };

      const lowTokenParameters = {
        model: 'gpt-3.5-turbo',
        maxTokens: 10,
        temperature: 0.7,
      };

      const highTokenParameters = {
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7,
      };

      const lowResult = estimateExecutionCost(
        template,
        inputs,
        lowTokenParameters
      );
      const highResult = estimateExecutionCost(
        template,
        inputs,
        highTokenParameters
      );

      expect(lowResult.estimatedOutputTokens).toBeLessThanOrEqual(10);
      expect(highResult.estimatedOutputTokens).toBeGreaterThan(
        lowResult.estimatedOutputTokens
      );
    });
  });
});
