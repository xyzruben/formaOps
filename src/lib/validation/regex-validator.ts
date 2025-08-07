export interface RegexValidationRule {
  pattern: string;
  flags?: string;
  description?: string;
  examples?: string[];
}

export interface RegexValidationResult {
  isValid: boolean;
  matches?: RegExpMatchArray | null;
  error?: string;
}

export class RegexValidator {
  public validate(text: string, rule: RegexValidationRule): RegexValidationResult {
    try {
      const regex = new RegExp(rule.pattern, rule.flags || '');
      const matches = text.match(regex);
      
      return {
        isValid: matches !== null,
        matches,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid regex pattern',
      };
    }
  }

  public findAllMatches(text: string, rule: RegexValidationRule): {
    isValid: boolean;
    matches: RegExpMatchArray[];
    error?: string;
  } {
    try {
      const flags = rule.flags?.includes('g') ? rule.flags : `${rule.flags || ''}g`;
      const regex = new RegExp(rule.pattern, flags);
      const matches: RegExpMatchArray[] = [];
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match);
        if (!flags.includes('g')) break; // Avoid infinite loop if 'g' flag not set
      }
      
      return {
        isValid: matches.length > 0,
        matches,
      };
    } catch (error) {
      return {
        isValid: false,
        matches: [],
        error: error instanceof Error ? error.message : 'Invalid regex pattern',
      };
    }
  }

  public extractNamedGroups(text: string, rule: RegexValidationRule): {
    isValid: boolean;
    groups: Record<string, string>;
    error?: string;
  } {
    try {
      const regex = new RegExp(rule.pattern, rule.flags || '');
      const match = text.match(regex);
      
      if (!match) {
        return {
          isValid: false,
          groups: {},
        };
      }
      
      return {
        isValid: true,
        groups: match.groups || {},
      };
    } catch (error) {
      return {
        isValid: false,
        groups: {},
        error: error instanceof Error ? error.message : 'Invalid regex pattern',
      };
    }
  }

  public testPattern(pattern: string, flags?: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      new RegExp(pattern, flags);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid regex pattern',
      };
    }
  }
}

// Predefined common regex patterns
export const commonPatterns = {
  email: {
    pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
    description: 'Valid email address format',
    examples: ['user@example.com', 'test.email@domain.co.uk'],
  },

  phoneUS: {
    pattern: '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$',
    description: 'US phone number format',
    examples: ['(555) 123-4567', '555-123-4567', '555.123.4567'],
  },

  url: {
    pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$',
    description: 'Valid HTTP/HTTPS URL',
    examples: ['https://example.com', 'http://www.site.org/path?param=value'],
  },

  creditCard: {
    pattern: '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$',
    description: 'Credit card number (Visa, MasterCard, Amex, Discover)',
    examples: ['4532015112830366', '5555555555554444'],
  },

  ipAddress: {
    pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    description: 'IPv4 address',
    examples: ['192.168.1.1', '10.0.0.1', '172.16.254.1'],
  },

  strongPassword: {
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    description: 'Strong password (min 8 chars, uppercase, lowercase, number, special char)',
    examples: ['MyP@ssw0rd', 'SecureP@ss1'],
  },

  hexColor: {
    pattern: '^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
    description: 'Hexadecimal color code',
    examples: ['#FF5733', '#f57', 'A1B2C3'],
  },

  uuid: {
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    flags: 'i',
    description: 'UUID format',
    examples: ['123e4567-e89b-12d3-a456-426614174000'],
  },

  // Content-specific patterns
  containsEmailFormat: {
    pattern: 'Subject:.*\\n.*Dear.*\\n.*\\n.*(Best regards|Sincerely|Best)',
    flags: 'is',
    description: 'Email structure with subject, greeting, body, and closing',
    examples: ['Subject: Meeting Request\n\nDear John,\n\nI would like to schedule a meeting.\n\nBest regards,\nJane'],
  },

  codeBlock: {
    pattern: '```(\\w+)?\\n([\\s\\S]*?)\\n```',
    flags: 'g',
    description: 'Code blocks with optional language specification',
    examples: ['```javascript\nconsole.log("Hello");\n```', '```\nsome code\n```'],
  },

  bulletPoints: {
    pattern: '^\\s*[-*•]\\s+.+$',
    flags: 'gm',
    description: 'Bullet points or list items',
    examples: ['- First item', '* Second item', '• Third item'],
  },

  numberedList: {
    pattern: '^\\s*\\d+\\.\\s+.+$',
    flags: 'gm',
    description: 'Numbered list items',
    examples: ['1. First step', '2. Second step', '10. Tenth step'],
  },
};