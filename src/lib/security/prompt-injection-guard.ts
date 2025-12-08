/**
 * Enhanced Prompt Injection Detection
 *
 * Section 5.1: security_dog.md - Strengthen prompt injection protection
 *
 * This implementation addresses bypasses in the basic pattern matching:
 * - Unicode homoglyph detection
 * - Encoded payload detection (base64, URL encoding, etc.)
 * - Normalized pattern matching
 * - Output validation for leaked system prompts
 */

/**
 * Unicode homoglyphs that can be used to bypass simple pattern matching
 * Maps lookalike characters to their ASCII equivalents
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lookalikes
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  х: 'x',
  у: 'y',
  // Greek lookalikes
  α: 'a',
  β: 'b',
  ε: 'e',
  ι: 'i',
  ο: 'o',
  ρ: 'p',
  τ: 't',
  υ: 'y',
  // Fullwidth characters
  ａ: 'a',
  ｂ: 'b',
  ｃ: 'c',
  ｄ: 'd',
  ｅ: 'e',
  ｆ: 'f',
  ｇ: 'g',
  ｈ: 'h',
  ｉ: 'i',
  ｊ: 'j',
  ｋ: 'k',
  ｌ: 'l',
  ｍ: 'm',
  ｎ: 'n',
  ｏ: 'o',
  ｐ: 'p',
  ｑ: 'q',
  ｒ: 'r',
  ｓ: 's',
  ｔ: 't',
  ｕ: 'u',
  ｖ: 'v',
  ｗ: 'w',
  ｘ: 'x',
  ｙ: 'y',
  ｚ: 'z',
  // Zero-width characters
  '\u200B': '', // Zero-width space
  '\u200C': '', // Zero-width non-joiner
  '\u200D': '', // Zero-width joiner
  '\uFEFF': '', // Zero-width no-break space
};

/**
 * Normalize text by replacing homoglyphs and removing zero-width characters
 */
function normalizeText(text: string): string {
  let normalized = text;

  // Replace homoglyphs
  for (const [homoglyph, ascii] of Object.entries(HOMOGLYPH_MAP)) {
    normalized = normalized.replace(new RegExp(homoglyph, 'g'), ascii);
  }

  // Normalize whitespace (multiple spaces, newlines, tabs to single space)
  normalized = normalized.replace(/\s+/g, ' ');

  // Convert to lowercase for case-insensitive matching
  normalized = normalized.toLowerCase();

  return normalized;
}

/**
 * Check if text contains base64-encoded dangerous patterns
 */
function checkEncodedPayloads(text: string): boolean {
  // Look for base64-like strings (at least 20 chars, alphanumeric + /+=)
  const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
  const matches = text.match(base64Pattern);

  if (!matches) return false;

  for (const match of matches) {
    try {
      // Attempt to decode
      const decoded = Buffer.from(match, 'base64').toString('utf-8');
      const normalized = normalizeText(decoded);

      // Check if decoded content contains dangerous patterns
      if (containsDangerousPatterns(normalized)) {
        return true;
      }
    } catch {
      // Not valid base64, skip
      continue;
    }
  }

  return false;
}

/**
 * Check if text contains URL-encoded dangerous patterns
 */
function checkUrlEncodedPayloads(text: string): boolean {
  try {
    const decoded = decodeURIComponent(text);
    if (decoded !== text) {
      // Text was URL encoded
      const normalized = normalizeText(decoded);
      return containsDangerousPatterns(normalized);
    }
  } catch {
    // Invalid URL encoding, skip
  }
  return false;
}

/**
 * Dangerous patterns that indicate prompt injection attempts
 * Uses normalized text to catch obfuscated variants
 */
const DANGEROUS_PATTERNS = [
  // Direct instruction override
  /ignore\s+(previous|all|prior)\s+(instructions?|directives?|commands?)/,
  /disregard\s+(previous|all|prior)\s+(instructions?|directives?|commands?)/,
  /forget\s+(previous|all|prior)\s+(instructions?|directives?|commands?)/,
  /override\s+(previous|all|system)\s+(instructions?|directives?|commands?)/,

  // Role manipulation
  /(you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)\s+/,
  /system\s*:\s*/,
  /assistant\s*:\s*/,
  /user\s*:\s*/,
  /human\s*:\s*/,

  // System prompt leakage attempts
  /(show|display|print|output|reveal|tell\s+me)\s+(your|the|all)\s+(system\s+)?(prompt|instructions?|rules?|directives?)/,
  /what\s+(are|were)\s+your\s+(original|initial|system)\s+(instructions?|prompt|rules?)/,
  /repeat\s+your\s+(instructions?|prompt|rules?)/,

  // Code execution attempts
  /\b(exec|eval|system|shell|cmd|execute|run)\s*\(/,
  /\b(import|require|include)\s+os\b/,
  /subprocess\.(run|call|popen)/,

  // SQL injection patterns
  /union\s+(all\s+)?select/,
  /;\s*(drop|delete|truncate|insert|update)\s+/,

  // JavaScript injection
  /<script[^>]*>/,
  /javascript\s*:/,
  /onerror\s*=/,
  /onload\s*=/,

  // Prompt boundaries
  /\[system\]/,
  /\[\/system\]/,
  /\[user\]/,
  /\[assistant\]/,
  /<\|im_start\|>/,
  /<\|im_end\|>/,

  // Token manipulation
  /\{%.*%\}/,
  /\{\{.*\}\}/,
];

/**
 * Check if normalized text contains dangerous patterns
 */
function containsDangerousPatterns(normalizedText: string): boolean {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return true;
    }
  }
  return false;
}

/**
 * Result of prompt injection check
 */
export interface PromptInjectionResult {
  isInjection: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Check for prompt injection attempts with enhanced detection
 *
 * @param userInput - User-provided input to check
 * @returns Result indicating if injection was detected
 */
export function detectPromptInjection(
  userInput: string
): PromptInjectionResult {
  // Normalize text to catch obfuscated attempts
  const normalized = normalizeText(userInput);

  // Check for dangerous patterns in normalized text
  if (containsDangerousPatterns(normalized)) {
    return {
      isInjection: true,
      reason: 'Dangerous pattern detected in normalized text',
      confidence: 'high',
    };
  }

  // Check for base64-encoded payloads
  if (checkEncodedPayloads(userInput)) {
    return {
      isInjection: true,
      reason: 'Base64-encoded dangerous pattern detected',
      confidence: 'high',
    };
  }

  // Check for URL-encoded payloads
  if (checkUrlEncodedPayloads(userInput)) {
    return {
      isInjection: true,
      reason: 'URL-encoded dangerous pattern detected',
      confidence: 'high',
    };
  }

  // Check for excessive special characters (potential obfuscation)
  const specialCharCount = (userInput.match(/[^a-zA-Z0-9\s]/g) || []).length;
  const specialCharRatio = specialCharCount / userInput.length;

  if (specialCharRatio > 0.3 && userInput.length > 20) {
    return {
      isInjection: true,
      reason: 'Excessive special characters (potential obfuscation)',
      confidence: 'medium',
    };
  }

  // Check for excessively long input (potential buffer overflow or DoS)
  if (userInput.length > 50000) {
    return {
      isInjection: true,
      reason: 'Input exceeds maximum safe length',
      confidence: 'high',
    };
  }

  return {
    isInjection: false,
    confidence: 'low',
  };
}

/**
 * Validate AI output for leaked system prompts
 * This should be called on AI responses before returning to users
 *
 * @param output - AI-generated output to check
 * @returns true if output appears safe, false if it may contain leaked prompts
 */
export function validateAiOutput(output: string): boolean {
  const normalized = normalizeText(output);

  // Patterns that indicate system prompt leakage
  const leakagePatterns = [
    /my (instructions|system prompt|directives) (are|were)/,
    /i (am|was) (instructed|told|programmed) to/,
    /\[system\]/,
    /\[assistant\]/,
    /<\|im_start\|>/,
    /as an ai (language model|assistant)/,
  ];

  for (const pattern of leakagePatterns) {
    if (pattern.test(normalized)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize user input by removing potentially dangerous content
 * Use this as a fallback if you want to allow the request but strip dangerous parts
 *
 * @param input - User input to sanitize
 * @returns Sanitized input
 */
export function sanitizePromptInput(input: string): string {
  let sanitized = input;

  // Remove common injection markers
  sanitized = sanitized.replace(/\[system\]/gi, '');
  sanitized = sanitized.replace(/\[\/system\]/gi, '');
  sanitized = sanitized.replace(/\[user\]/gi, '');
  sanitized = sanitized.replace(/\[assistant\]/gi, '');
  sanitized = sanitized.replace(/<\|im_start\|>/gi, '');
  sanitized = sanitized.replace(/<\|im_end\|>/gi, '');

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}
