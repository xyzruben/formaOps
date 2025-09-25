'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  Download,
  Share2,
  Save,
  RotateCcw,
  ChevronDown,
  FileText,
  Code,
  Globe,
  Link,
  Clock,
  Check,
} from 'lucide-react';
import type { ExecutionResult } from './ai-results-viewer';

export interface DownloadOptions {
  format: 'txt' | 'json' | 'html' | 'csv';
  filename?: string;
  includeMetadata?: boolean;
}

export interface ShareOptions {
  includeInput: boolean;
  includeMetrics: boolean;
  expirationHours: number;
}

export interface ResultsActionsProps {
  execution: ExecutionResult;
  onCopy?: (content: string, format: 'plain' | 'formatted') => void;
  onDownload?: (options: DownloadOptions) => void;
  onShare?: (options: ShareOptions) => void;
  onRetry?: () => void;
  onSave?: () => void;
  className?: string;
}

const DOWNLOAD_FORMATS = [
  {
    format: 'txt' as const,
    label: 'Text File',
    description: 'Plain text output',
    icon: FileText,
    mimeType: 'text/plain',
  },
  {
    format: 'json' as const,
    label: 'JSON File',
    description: 'Structured data with metadata',
    icon: Code,
    mimeType: 'application/json',
  },
  {
    format: 'html' as const,
    label: 'HTML File',
    description: 'Formatted web page',
    icon: Globe,
    mimeType: 'text/html',
  },
  {
    format: 'csv' as const,
    label: 'CSV File',
    description: 'Comma-separated values (metrics only)',
    icon: FileText,
    mimeType: 'text/csv',
  },
] as const;

// Content generation utilities
const generateDownloadContent = (
  execution: ExecutionResult,
  options: DownloadOptions
): string => {
  const { format, includeMetadata = true } = options;

  switch (format) {
    case 'txt': {
      let txtContent = execution.output || 'No output available';

      if (includeMetadata) {
        const metadata = [
          `Execution ID: ${execution.executionId}`,
          `Status: ${execution.status}`,
          `Model: ${execution.executionData?.model || 'Unknown'}`,
          `Tokens: ${execution.tokenUsage.totalTokens}`,
          `Cost: $${execution.costUsd.toFixed(6)}`,
          `Timestamp: ${execution.timestamp || new Date().toISOString()}`,
          '',
          '--- Output ---',
          '',
        ].join('\n');

        txtContent = metadata + txtContent;
      }

      return txtContent;
    }

    case 'json':
      return JSON.stringify(
        {
          execution: {
            id: execution.executionId,
            status: execution.status,
            timestamp: execution.timestamp || new Date().toISOString(),
            model: execution.executionData?.model,
          },
          output: execution.output,
          metrics: {
            tokenUsage: execution.tokenUsage,
            cost: execution.costUsd,
            executionTime: execution.executionTime,
          },
          ...(includeMetadata && {
            metadata: {
              inputs: execution.executionData?.inputs,
              parameters: {
                maxTokens: execution.executionData?.maxTokens,
                temperature: execution.executionData?.temperature,
              },
              validation: {
                status: execution.validationStatus,
                errors: execution.validationErrors,
              },
            },
          }),
        },
        null,
        2
      );

    case 'html':
      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Execution Result - ${execution.executionId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            background: rgba(255,255,255,0.2);
            font-size: 14px;
            margin-top: 10px;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .output {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            white-space: pre-wrap;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            line-height: 1.5;
            overflow-x: auto;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 14px;
            color: #64748b;
        }
        .inputs {
            background: #fefce8;
            border: 1px solid #fde047;
            border-radius: 6px;
            padding: 15px;
        }
        .input-item {
            margin-bottom: 10px;
            font-size: 14px;
        }
        .input-key {
            font-weight: 600;
            color: #374151;
        }
        .input-value {
            color: #6b7280;
            margin-left: 10px;
        }
        .footer {
            background: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI Execution Result</h1>
            <div class="status">${execution.status}</div>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
                ${execution.timestamp ? new Date(execution.timestamp).toLocaleString() : new Date().toLocaleString()}
            </p>
        </div>

        <div class="content">
            ${
              includeMetadata && execution.executionData
                ? `
            <div class="section">
                <h2>Input Variables</h2>
                <div class="inputs">
                    ${Object.entries(execution.executionData.inputs)
                      .map(
                        ([key, value]) =>
                          `<div class="input-item">
                            <span class="input-key">${key}:</span>
                            <span class="input-value">${String(value)}</span>
                        </div>`
                      )
                      .join('')}
                </div>
            </div>
            `
                : ''
            }

            <div class="section">
                <h2>Output</h2>
                <div class="output">${execution.output || 'No output available'}</div>
            </div>

            ${
              includeMetadata
                ? `
            <div class="section">
                <h2>Metrics</h2>
                <div class="metrics">
                    <div class="metric-card">
                        <div class="metric-value">${execution.tokenUsage.totalTokens.toLocaleString()}</div>
                        <div class="metric-label">Total Tokens</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">$${execution.costUsd.toFixed(6)}</div>
                        <div class="metric-label">Cost</div>
                    </div>
                    ${
                      execution.executionTime
                        ? `
                    <div class="metric-card">
                        <div class="metric-value">${execution.executionTime}ms</div>
                        <div class="metric-label">Duration</div>
                    </div>
                    `
                        : ''
                    }
                    <div class="metric-card">
                        <div class="metric-value">${execution.executionData?.model || 'Unknown'}</div>
                        <div class="metric-label">Model</div>
                    </div>
                </div>
            </div>
            `
                : ''
            }
        </div>

        <div class="footer">
            <p>Generated by FormaOps AI Results Viewer</p>
            <p>Execution ID: ${execution.executionId}</p>
        </div>
    </div>
</body>
</html>`;

    case 'csv': {
      // CSV format for metrics data
      const headers = ['Metric', 'Value', 'Unit'];
      const rows = [
        ['Execution ID', execution.executionId, ''],
        ['Status', execution.status, ''],
        ['Model', execution.executionData?.model || 'Unknown', ''],
        ['Input Tokens', execution.tokenUsage.inputTokens.toString(), 'tokens'],
        [
          'Output Tokens',
          execution.tokenUsage.outputTokens.toString(),
          'tokens',
        ],
        ['Total Tokens', execution.tokenUsage.totalTokens.toString(), 'tokens'],
        ['Cost', execution.costUsd.toString(), 'USD'],
        ...(execution.executionTime
          ? [['Execution Time', execution.executionTime.toString(), 'ms']]
          : []),
        ['Timestamp', execution.timestamp || new Date().toISOString(), ''],
      ];

      return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
    }

    default:
      return execution.output || '';
  }
};

const getFilename = (execution: ExecutionResult, format: string): string => {
  const timestamp = execution.timestamp
    ? new Date(execution.timestamp).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return `execution-${execution.executionId.slice(-8)}-${timestamp}.${format}`;
};

export function ResultsActions({
  execution,
  onCopy,
  onDownload,
  onShare,
  onRetry,
  onSave,
  className = '',
}: ResultsActionsProps): JSX.Element {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const isSuccess = execution.status === 'COMPLETED';
  const isFailed = execution.status === 'FAILED';
  const canRetry = isFailed && execution.error?.retryable;

  // Copy handlers
  const handleCopy = async (
    content: string,
    type: 'output' | 'json' | 'full'
  ): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);

      setCopyStates(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [type]: false }));
      }, 2000);

      if (onCopy) {
        onCopy(content, type === 'output' ? 'plain' : 'formatted');
      }

      toast({
        title: 'Copied to clipboard',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} content copied successfully`,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Download handler
  const handleDownload = (
    format: DownloadOptions['format'],
    includeMetadata = true
  ): void => {
    try {
      const content = generateDownloadContent(execution, {
        format,
        includeMetadata,
      });
      const formatConfig = DOWNLOAD_FORMATS.find(f => f.format === format);
      const filename = getFilename(execution, format);

      const blob = new Blob([content], {
        type: formatConfig?.mimeType || 'text/plain',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      if (onDownload) {
        onDownload({ format, filename, includeMetadata });
      }

      toast({
        title: 'Download started',
        description: `${formatConfig?.label || 'File'} downloaded successfully`,
      });
    } catch {
      toast({
        title: 'Download failed',
        description: 'Unable to download file',
        variant: 'destructive',
      });
    }
  };

  // Share handler
  const handleShare = async (options: ShareOptions): Promise<void> => {
    setShareLoading(true);

    try {
      if (onShare) {
        await onShare(options);
      }

      toast({
        title: 'Share link created',
        description: 'Link copied to clipboard',
      });

      setShareDialogOpen(false);
    } catch {
      toast({
        title: 'Share failed',
        description: 'Unable to create share link',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-2 ${className}`}
        data-testid="results-actions"
      >
        {/* Copy Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => handleCopy(execution.output || '', 'output')}
              disabled={!execution.output}
            >
              <FileText className="h-4 w-4 mr-2" />
              Copy Output
              {copyStates.output && (
                <Check className="h-4 w-4 ml-2 text-green-600" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleCopy(JSON.stringify(execution, null, 2), 'json')
              }
            >
              <Code className="h-4 w-4 mr-2" />
              Copy as JSON
              {copyStates.json && (
                <Check className="h-4 w-4 ml-2 text-green-600" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleCopy(
                  generateDownloadContent(execution, { format: 'txt' }),
                  'full'
                )
              }
            >
              <FileText className="h-4 w-4 mr-2" />
              Copy Full Report
              {copyStates.full && (
                <Check className="h-4 w-4 ml-2 text-green-600" />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Download Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {DOWNLOAD_FORMATS.map(format => {
              const Icon = format.icon;
              return (
                <DropdownMenuItem
                  key={format.format}
                  onClick={() => handleDownload(format.format)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{format.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {format.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Share Action */}
        {onShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}

        <DropdownMenuSeparator />

        {/* Retry Action */}
        {onRetry && canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
        )}

        {/* Save Action */}
        {onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save to History
          </Button>
        )}

        {/* Status Indicator */}
        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant={
              isSuccess ? 'default' : isFailed ? 'destructive' : 'secondary'
            }
            className="flex items-center gap-1"
          >
            {execution.status === 'COMPLETED' && <Check className="h-3 w-3" />}
            {execution.status === 'FAILED' && (
              <span className="text-xs">✕</span>
            )}
            {execution.status === 'PENDING' && <Clock className="h-3 w-3" />}
            {execution.status}
          </Badge>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Execution Result
            </DialogTitle>
            <DialogDescription>
              Create a shareable link for this execution result. Choose what to
              include.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Share Options</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="include-input"
                    defaultChecked={true}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="include-input" className="text-sm">
                    Include input variables
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="include-metrics"
                    defaultChecked={true}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="include-metrics" className="text-sm">
                    Include metrics and cost data
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="expiration" className="text-sm font-medium">
                Link Expiration
              </label>
              <select
                id="expiration"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                defaultValue="24"
              >
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(false)}
              disabled={shareLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                handleShare({
                  includeInput: true,
                  includeMetrics: true,
                  expirationHours: 24,
                })
              }
              disabled={shareLoading}
              className="flex items-center gap-2"
            >
              {shareLoading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4" />
                  Create Link
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
