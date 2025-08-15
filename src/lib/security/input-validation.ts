import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Input validation and sanitization utilities
export class InputValidator {
  // Sanitize HTML content
  static sanitizeHtml(
    input: string,
    options?: {
      allowedTags?: string[];
      allowedAttributes?: Record<string, string[]>;
    }
  ): string {
    const config = {
      ALLOWED_TAGS: options?.allowedTags || [
        'b',
        'i',
        'em',
        'strong',
        'p',
        'br',
      ],
      ALLOWED_ATTR: options?.allowedAttributes || {},
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'],
    };

    return DOMPurify.sanitize(input, config as any) as unknown as string;
  }

  // Validate and sanitize string input
  static validateString(
    input: unknown,
    options: {
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      allowEmpty?: boolean;
    } = {}
  ): string {
    const schema = z.string({
      required_error: 'String input is required',
      invalid_type_error: 'Input must be a string',
    });

    let validatedString = schema.parse(input);

    // Trim whitespace
    validatedString = validatedString.trim();

    // Check empty
    if (!options.allowEmpty && validatedString.length === 0) {
      throw new Error('String cannot be empty');
    }

    // Length validation
    if (options.minLength && validatedString.length < options.minLength) {
      throw new Error(
        `String must be at least ${options.minLength} characters long`
      );
    }

    if (options.maxLength && validatedString.length > options.maxLength) {
      throw new Error(
        `String must be no more than ${options.maxLength} characters long`
      );
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(validatedString)) {
      throw new Error('String does not match required pattern');
    }

    return validatedString;
  }

  // Validate email
  static validateEmail(email: unknown): string {
    const emailSchema = z.string().email('Invalid email format');
    const validatedEmail = emailSchema.parse(email);

    // Additional security: normalize email
    return validatedEmail.toLowerCase().trim();
  }

  // Validate URL
  static validateUrl(
    url: unknown,
    options: {
      allowedProtocols?: string[];
      allowedDomains?: string[];
    } = {}
  ): string {
    const urlSchema = z.string().url('Invalid URL format');
    const validatedUrl = urlSchema.parse(url);

    const parsedUrl = new URL(validatedUrl);

    // Protocol validation
    const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      throw new Error(`Protocol ${parsedUrl.protocol} is not allowed`);
    }

    // Domain validation
    if (options.allowedDomains) {
      const isAllowedDomain = options.allowedDomains.some(
        domain =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith('.' + domain)
      );

      if (!isAllowedDomain) {
        throw new Error(`Domain ${parsedUrl.hostname} is not allowed`);
      }
    }

    return validatedUrl;
  }

  // Validate JSON input
  static validateJson<T = any>(input: unknown): T {
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch {
        throw new Error('Invalid JSON string');
      }
    }

    if (typeof input === 'object' && input !== null) {
      return input as T;
    }

    throw new Error('Input must be valid JSON');
  }

  // Validate file upload
  static validateFile(
    file: File,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): void {
    // Size validation
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(
        `File size must not exceed ${Math.round(options.maxSize / 1024 / 1024)}MB`
      );
    }

    // MIME type validation
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Extension validation
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !options.allowedExtensions.includes(extension)) {
        throw new Error(`File extension .${extension} is not allowed`);
      }
    }

    // Additional security checks
    const suspiciousNames = [
      '.exe',
      '.bat',
      '.cmd',
      '.com',
      '.pif',
      '.scr',
      '.vbs',
      '.js',
      '.jar',
      '.php',
      '.asp',
      '.jsp',
      '.sh',
      '.py',
      '.rb',
      '.pl',
    ];

    const hasSuspiciousExtension = suspiciousNames.some(ext =>
      file.name.toLowerCase().includes(ext)
    );

    if (hasSuspiciousExtension) {
      throw new Error('File type is potentially dangerous');
    }
  }

  // SQL injection prevention
  static sanitizeSqlInput(input: string): string {
    // Remove or escape dangerous SQL keywords and characters
    const sqlKeywords = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'CREATE',
      'ALTER',
      'EXEC',
      'EXECUTE',
      'UNION',
      'SCRIPT',
      'JAVASCRIPT',
    ];

    let sanitized = input;

    sqlKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove dangerous characters
    sanitized = sanitized.replace(/[';\"\\]/g, '');

    return sanitized.trim();
  }

  // XSS prevention
  static preventXss(input: string): string {
    // Remove script tags and javascript: protocols
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized;
  }

  // Path traversal prevention
  static sanitizePath(path: string): string {
    // Remove path traversal attempts
    let sanitized = path
      .replace(/\.\./g, '')
      .replace(/\/+/g, '/')
      .replace(/\\/g, '/');

    // Ensure path doesn't start with /
    if (sanitized.startsWith('/')) {
      sanitized = sanitized.substring(1);
    }

    return sanitized;
  }

  // Command injection prevention
  static sanitizeCommand(input: string): string {
    // Remove shell metacharacters
    const dangerousChars = /[|&;$`<>'"\\]/g;
    return input.replace(dangerousChars, '');
  }

  // Validate API key format
  static validateApiKey(apiKey: unknown): string {
    const keySchema = z
      .string()
      .regex(
        /^[A-Za-z0-9_-]{20,}$/,
        'API key must be at least 20 characters and contain only letters, numbers, underscores, and hyphens'
      );

    return keySchema.parse(apiKey);
  }

  // Validate UUID
  static validateUuid(uuid: unknown): string {
    const uuidSchema = z.string().uuid('Invalid UUID format');
    return uuidSchema.parse(uuid);
  }

  // Rate limiting validation
  static validateRateLimit(
    requests: number,
    windowMs: number,
    limit: number
  ): void {
    if (requests > limit) {
      const retryAfter = Math.ceil(windowMs / 1000);
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }
  }

  // Prompt template validation for security
  static validatePromptTemplate(template: string): string {
    // Check for potential prompt injection attempts
    const dangerousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:/i,
      /assistant\s*:/i,
      /\bexec\b/i,
      /\beval\b/i,
      /<script/i,
      /javascript:/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(template)) {
        throw new Error('Template contains potentially dangerous content');
      }
    }

    // Sanitize the template
    return this.sanitizeHtml(template, {
      allowedTags: [], // No HTML tags allowed in prompt templates
      allowedAttributes: {},
    });
  }
}

// Pre-defined validation schemas
export const validationSchemas = {
  prompt: z.object({
    name: z.string().min(1).max(255),
    template: z.string().min(1).max(10000),
    variables: z
      .array(
        z.object({
          name: z.string().min(1).max(100),
          type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
          required: z.boolean().default(false),
          description: z.string().max(500).optional(),
        })
      )
      .max(50),
  }),

  execution: z.object({
    promptId: z.string().uuid(),
    inputs: z.record(z.any()),
    model: z.enum(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview']).optional(),
  }),

  user: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
};

// Middleware for automatic input validation
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): T => {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new Error(
          `Validation error: ${firstError.message} at ${firstError.path.join('.')}`
        );
      }
      throw error;
    }
  };
}
