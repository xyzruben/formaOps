'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  ChevronDown,
  ChevronUp,
  Type,
  Code,
  Globe,
  FileText,
} from 'lucide-react';

export type ContentType = 'text' | 'json' | 'html' | 'code' | 'markdown';

export interface FormattedOutput {
  content: string;
  type: ContentType;
  language?: string;
  formatted: string;
  truncated?: boolean;
}

export interface OutputDisplayProps {
  output: string;
  maxHeight?: number;
  showLineNumbers?: boolean;
  collapsible?: boolean;
  className?: string;
  // Preference-based styling options
  fontSize?: string;
  enableSyntaxHighlight?: boolean;
  enableWordWrap?: boolean;
}

// Content type detection utilities
const detectContentType = (content: string): ContentType => {
  const trimmedContent = content.trim();

  // JSON detection
  if (
    (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) ||
    (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))
  ) {
    try {
      JSON.parse(trimmedContent);
      return 'json';
    } catch {
      // Not valid JSON, continue checking
    }
  }

  // HTML detection
  if (/<[^>]+>/.test(trimmedContent)) {
    return 'html';
  }

  // Markdown detection
  if (/^#|\*\*|__|\[.*\]\(.*\)|```/.test(trimmedContent)) {
    return 'markdown';
  }

  // Code detection (basic patterns)
  const codePatterns = [
    /^(function|const|let|var|class|import|export|def|class|from|if|for|while)/m,
    /^(public|private|protected)\s+(class|interface|function)/m,
    /{[\s\S]*}/,
    /\w+\s*\([^)]*\)\s*{/,
  ];

  if (codePatterns.some(pattern => pattern.test(trimmedContent))) {
    return 'code';
  }

  return 'text';
};

const detectLanguage = (content: string): string => {
  const _firstLine = content.split('\n')[0].toLowerCase();

  // Language-specific patterns
  if (
    /\bfunction\b|\bconst\b|\blet\b|\bvar\b/.test(content) &&
    /{/.test(content)
  ) {
    return 'javascript';
  }

  if (/\bdef\b|\bimport\b.*\bfrom\b|\bclass\b.*:/.test(content)) {
    return 'python';
  }

  if (/\bpublic\b|\bprivate\b|\bclass\b.*{|\binterface\b/.test(content)) {
    return 'typescript';
  }

  if (/<\?php/.test(content)) {
    return 'php';
  }

  if (/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(content)) {
    return 'sql';
  }

  return 'plaintext';
};

const formatContent = (content: string, type: ContentType): string => {
  switch (type) {
    case 'json':
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }

    case 'html':
      // Basic HTML formatting - in a real implementation, you might use a proper HTML formatter
      return content
        .replace(/></g, '>\n<')
        .replace(/(<[^>]+>)/g, match => match)
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join('\n');

    case 'code':
    case 'markdown':
    case 'text':
    default:
      return content;
  }
};

const getContentTypeIcon = (type: ContentType) => {
  switch (type) {
    case 'json':
    case 'code':
      return Code;
    case 'html':
      return Globe;
    case 'markdown':
      return FileText;
    case 'text':
    default:
      return Type;
  }
};

const getContentTypeColor = (type: ContentType): string => {
  switch (type) {
    case 'json':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'html':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'code':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'markdown':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'text':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export function OutputDisplay({
  output,
  maxHeight = 400,
  showLineNumbers = false,
  collapsible = true,
  className = '',
  fontSize = '14px',
  enableSyntaxHighlight = true,
  enableWordWrap = true,
}: OutputDisplayProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Format the output content
  const formattedOutput = useMemo((): FormattedOutput => {
    if (!output) {
      return {
        content: '',
        type: 'text',
        formatted: '',
      };
    }

    const type = detectContentType(output);
    const language = type === 'code' ? detectLanguage(output) : undefined;
    const formatted = formatContent(output, type);

    return {
      content: output,
      type,
      language,
      formatted,
      truncated: formatted.length > 10000, // Arbitrary truncation point
    };
  }, [output]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedOutput.content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Calculate if content should be collapsible
  const lines = formattedOutput.formatted.split('\n');
  const shouldShowCollapse = collapsible && lines.length > 10;

  // Get display content (truncated if not expanded)
  const displayContent = useMemo(() => {
    if (!shouldShowCollapse || isExpanded) {
      return formattedOutput.formatted;
    }

    return lines.slice(0, 10).join('\n') + '\n... (content truncated)';
  }, [formattedOutput.formatted, lines, shouldShowCollapse, isExpanded]);

  const ContentIcon = getContentTypeIcon(formattedOutput.type);

  if (!output) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No output available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`} data-testid="output-display">
      {/* Header with content type and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ContentIcon className="h-4 w-4" />
          <Badge className={getContentTypeColor(formattedOutput.type)}>
            {formattedOutput.type.toUpperCase()}
            {formattedOutput.language && ` (${formattedOutput.language})`}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          {copySuccess ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Content display area */}
      <div
        className="relative bg-muted rounded-lg border overflow-hidden"
        style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
      >
        <div className="overflow-auto p-4">
          <pre
            className={`font-mono ${
              enableWordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
            } ${showLineNumbers ? 'pl-12' : ''}`}
            style={{
              fontSize,
              tabSize: 2,
              lineHeight: '1.5',
              color: enableSyntaxHighlight ? 'inherit' : '#374151', // Default gray if no highlighting
            }}
          >
            {showLineNumbers && (
              <div className="absolute left-0 top-0 p-4 pr-2 bg-muted-foreground/10 text-muted-foreground text-xs font-mono select-none">
                {displayContent.split('\n').map((_, index) => (
                  <div key={index} className="h-6 leading-6">
                    {index + 1}
                  </div>
                ))}
              </div>
            )}
            <code
              className={`language-${formattedOutput.language || 'plaintext'}`}
            >
              {displayContent}
            </code>
          </pre>
        </div>

        {/* Gradient fade for truncated content */}
        {shouldShowCollapse && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand/collapse button */}
      {shouldShowCollapse && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show More ({lines.length - 10} more lines)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Content statistics */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Characters: {formattedOutput.content.length.toLocaleString()}
        </span>
        <span>
          Words: {formattedOutput.content.split(/\s+/).length.toLocaleString()}
        </span>
        <span>Lines: {lines.length.toLocaleString()}</span>
      </div>
    </div>
  );
}
