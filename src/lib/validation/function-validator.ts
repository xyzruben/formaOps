export interface FunctionValidationRule {
  code: string;
  timeout?: number;
  description?: string;
  examples?: Array<{
    input: unknown;
    expectedResult: boolean;
    description: string;
  }>;
}

export interface FunctionValidationResult {
  isValid: boolean;
  result?: unknown;
  error?: string;
  executionTime?: number;
}

export interface ValidationContext {
  output: string;
  inputs: Record<string, unknown>;
  metadata: {
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    model?: string;
    latencyMs?: number;
  };
}

export class FunctionValidator {
  private readonly maxExecutionTime: number = 5000; // 5 seconds max
  private readonly allowedGlobals = new Set([
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON',
    'RegExp', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'
  ]);

  public async validate(
    data: unknown, 
    rule: FunctionValidationRule,
    context?: Partial<ValidationContext>
  ): Promise<FunctionValidationResult> {
    const startTime = Date.now();
    const timeout = Math.min(rule.timeout || 3000, this.maxExecutionTime);

    try {
      // Validate the function code before execution
      const validationError = this.validateFunctionCode(rule.code);
      if (validationError) {
        return {
          isValid: false,
          error: validationError,
        };
      }

      // Create execution context
      const executionContext = this.createExecutionContext(data, context);

      // Execute function with timeout
      const result = await this.executeWithTimeout(rule.code, executionContext, timeout);
      
      return {
        isValid: Boolean(result),
        result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Function execution error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  public testFunction(code: string, testCases: Array<{
    input: unknown;
    context?: Partial<ValidationContext>;
    expectedResult: boolean;
    description: string;
  }>): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      description: string;
      expected: boolean;
      actual: boolean;
      passed: boolean;
      error?: string;
    }>;
  }> {
    return Promise.all(
      testCases.map(async testCase => {
        const result = await this.validate(testCase.input, { code }, testCase.context);
        
        return {
          description: testCase.description,
          expected: testCase.expectedResult,
          actual: Boolean(result.result),
          passed: Boolean(result.result) === testCase.expectedResult && !result.error,
          error: result.error,
        };
      })
    ).then(results => ({
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    }));
  }

  private validateFunctionCode(code: string): string | null {
    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /process\./,
      /global\./,
      /__proto__/,
      /constructor/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return `Dangerous pattern detected: ${pattern.source}`;
      }
    }

    // Check if it's a valid function
    try {
      new Function('data', 'context', code);
    } catch (error) {
      return `Invalid JavaScript: ${error instanceof Error ? error.message : 'Syntax error'}`;
    }

    return null;
  }

  private createExecutionContext(data: unknown, context?: Partial<ValidationContext>): ValidationContext {
    return {
      output: typeof data === 'string' ? data : JSON.stringify(data),
      inputs: context?.inputs || {},
      metadata: {
        tokenUsage: context?.metadata?.tokenUsage,
        model: context?.metadata?.model,
        latencyMs: context?.metadata?.latencyMs,
      },
    };
  }

  private executeWithTimeout(
    code: string, 
    context: ValidationContext, 
    timeout: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Function execution timeout (${timeout}ms)`));
      }, timeout);

      try {
        // Create restricted execution environment
        const func = new Function(
          'data', 
          'context',
          `
            "use strict";
            // Restricted globals
            const allowedGlobals = ${JSON.stringify([...this.allowedGlobals])};
            const originalGlobal = global;
            
            // Helper functions
            const parseJSON = (str) => {
              try { return JSON.parse(str); } catch { return null; }
            };
            
            const extractNumbers = (str) => {
              return str.match(/\\d+(\\.\\d+)?/g)?.map(Number) || [];
            };
            
            const containsWords = (str, words) => {
              const lower = str.toLowerCase();
              return words.some(word => lower.includes(word.toLowerCase()));
            };
            
            const countWords = (str) => {
              return str.trim().split(/\\s+/).length;
            };
            
            const validateEmail = (email) => {
              return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
            };
            
            // Execute user code
            ${code}
          `
        );

        const result = func(context.output, context);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
}

// Predefined common validation functions
export const commonFunctions = {
  hasMinimumLength: {
    code: `
      return data.length >= context.inputs.minLength;
    `,
    description: 'Check if output has minimum length',
    examples: [
      {
        input: 'Hello world',
        expectedResult: true,
        description: 'Text with sufficient length (minLength: 10)',
      }
    ],
  },

  containsRequiredWords: {
    code: `
      const requiredWords = context.inputs.requiredWords || [];
      const text = data.toLowerCase();
      return requiredWords.every(word => text.includes(word.toLowerCase()));
    `,
    description: 'Check if output contains all required words',
    examples: [
      {
        input: 'This is a test message',
        expectedResult: true,
        description: 'Contains required words: ["test", "message"]',
      }
    ],
  },

  isValidJSON: {
    code: `
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    `,
    description: 'Validate if output is valid JSON',
    examples: [
      {
        input: '{"key": "value"}',
        expectedResult: true,
        description: 'Valid JSON object',
      }
    ],
  },

  hasCodeBlock: {
    code: `
      return /\`\`\`[\\w]*[\\s\\S]*?\`\`\`/.test(data);
    `,
    description: 'Check if output contains code blocks',
    examples: [
      {
        input: 'Here is code: ```javascript\\nconsole.log("hi");\\n```',
        expectedResult: true,
        description: 'Contains code block',
      }
    ],
  },

  isReasonableLength: {
    code: `
      const wordCount = data.trim().split(/\\s+/).length;
      const minWords = context.inputs.minWords || 10;
      const maxWords = context.inputs.maxWords || 1000;
      return wordCount >= minWords && wordCount <= maxWords;
    `,
    description: 'Check if output has reasonable word count',
    examples: [
      {
        input: 'This is a reasonably sized response with enough content to be useful.',
        expectedResult: true,
        description: 'Word count within reasonable range',
      }
    ],
  },

  followsEmailFormat: {
    code: `
      const hasSubject = /Subject:\\s*.+/i.test(data);
      const hasGreeting = /(Dear|Hello|Hi)\\s+/i.test(data);
      const hasClosing = /(Sincerely|Best regards|Best|Thank you)/i.test(data);
      return hasSubject && hasGreeting && hasClosing;
    `,
    description: 'Check if output follows email format',
    examples: [
      {
        input: 'Subject: Meeting\\n\\nDear John,\\n\\nLet\'s meet.\\n\\nBest regards,\\nJane',
        expectedResult: true,
        description: 'Properly formatted email',
      }
    ],
  },
};