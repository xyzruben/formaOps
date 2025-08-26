# AI Results Viewer Feature Plan

## Executive Summary

### Feature Purpose
The AI Results Viewer provides a comprehensive interface for displaying, analyzing, and managing AI execution results. It transforms raw API responses into formatted, actionable information with detailed metrics, cost breakdowns, and user interaction capabilities.

### User Value
- **Rich Result Display**: Formatted AI output with syntax highlighting and structured presentation
- **Execution Analytics**: Detailed token usage, cost analysis, and performance metrics
- **Result Management**: Copy, download, share, and compare execution results
- **Error Visualization**: Clear error display with actionable troubleshooting information

### Architectural Role
Terminal component in the execution workflow that bridges AI API responses with user consumption. Integrates with Enhanced Execution Panel and feeds data to Execution History. Provides the final user touchpoint in the prompt execution lifecycle.

### Implementation Priority
**Position 5** in critical path - depends on Enhanced Execution Panel, enables complete execution workflow.

---

## Technical Specifications

### Component Architecture

```typescript
interface AIResultsViewerProps {
  execution: PromptExecution;
  onRetry?: () => void;
  onSave?: (execution: PromptExecution) => void;
  onShare?: (execution: PromptExecution) => void;
  className?: string;
}

interface PromptExecution {
  id: string;
  promptId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  input: Record<string, any>;
  output?: string;
  model: string;
  tokenUsage?: TokenUsage;
  cost?: number;
  executionTime?: number;
  error?: ExecutionError;
  createdAt: string;
  completedAt?: string;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ExecutionError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}
```

### Data Flow

```
Execution Complete → Format Response → Display Results → User Actions → Update State
```

1. **Reception Phase**: Receive execution results from Enhanced Execution Panel
2. **Processing Phase**: Format AI output, calculate metrics, prepare display data
3. **Display Phase**: Render formatted results with interactive components
4. **Action Phase**: Handle user actions (copy, download, retry, share)
5. **Storage Phase**: Save results to execution history if requested

### API Integration

**No Direct API**: Component receives data from execution flow
**Integration Points**: Results from `POST /api/prompts/[id]/execute`

### State Management

```typescript
interface ResultsViewerState {
  // Display states
  activeTab: 'output' | 'metrics' | 'raw';
  showCopySuccess: boolean;
  downloadInProgress: boolean;
  
  // Formatting states  
  outputFormat: 'text' | 'json' | 'html';
  syntaxHighlight: boolean;
  
  // Error states
  displayError: string | null;
  
  // Action states
  shareInProgress: boolean;
  saveInProgress: boolean;
}
```

---

## User Experience Design

### User Workflow

```
1. Execution completes (success or failure)
2. Results viewer appears with formatted output
3. User views AI response with syntax highlighting
4. User examines token usage and cost metrics
5. User performs actions:
   - Copy result to clipboard
   - Download as file (TXT, JSON, HTML)
   - Share result via link
   - Retry execution (if failed)
   - Save to execution history
6. User switches between output/metrics/raw data tabs
7. User can compare with previous executions
```

### UI Components

**Main Results Display**
```typescript
<Card className="results-viewer">
  <CardHeader>
    <ResultsHeader execution={execution} onRetry={onRetry} />
  </CardHeader>
  
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList>
      <TabsTrigger value="output">Output</TabsTrigger>
      <TabsTrigger value="metrics">Metrics</TabsTrigger>
      <TabsTrigger value="raw">Raw Data</TabsTrigger>
    </TabsList>
    
    <TabsContent value="output">
      <OutputDisplay />
    </TabsContent>
    
    <TabsContent value="metrics">
      <MetricsDisplay />
    </TabsContent>
    
    <TabsContent value="raw">
      <RawDataDisplay />
    </TabsContent>
  </Tabs>
  
  <CardFooter>
    <ResultsActions />
  </CardFooter>
</Card>
```

**Output Display Tab**
1. **Status Banner**
   - Success/failure indicator with color coding
   - Execution time and completion timestamp
   - Model used and configuration summary

2. **AI Output Section**
   ```typescript
   interface OutputDisplayProps {
     content: string;
     format: 'text' | 'json' | 'html';
     syntaxHighlight: boolean;
     maxHeight?: number;
   }
   ```
   - Formatted AI response with syntax highlighting
   - Auto-detect content type (text, JSON, HTML, code)
   - Expandable/collapsible for long outputs
   - Copy button for quick clipboard access

3. **Input Variables Section**
   - Display of input variables used in execution
   - Variable values formatted based on type
   - Template preview showing variable substitution

**Metrics Display Tab**
1. **Token Usage Visualization**
   ```typescript
   interface TokenMetricsProps {
     usage: TokenUsage;
     model: string;
     showBreakdown: boolean;
   }
   ```
   - Visual breakdown of prompt vs completion tokens
   - Token efficiency metrics
   - Cost per token analysis

2. **Cost Breakdown**
   ```typescript
   interface CostAnalysisProps {
     cost: number;
     model: string;
     tokenUsage: TokenUsage;
     executionTime: number;
   }
   ```
   - Total execution cost with currency formatting
   - Cost breakdown by token type
   - Cost comparison with previous executions
   - Budget impact indicators

3. **Performance Metrics**
   - Execution duration with breakdown
   - API response time analysis  
   - Throughput metrics (tokens per second)

**Raw Data Tab**
1. **Request/Response Inspector**
   - Full API request payload
   - Complete API response with headers
   - JSON formatting with collapsible sections
   - Technical debugging information

2. **Execution Metadata**
   - Unique execution ID and timestamps
   - Model configuration details
   - API version and endpoint information

**Results Actions Footer**
```typescript
interface ResultsActionsProps {
  execution: PromptExecution;
  onCopy: (content: string) => void;
  onDownload: (format: 'txt' | 'json' | 'html') => void;
  onShare: () => void;
  onRetry?: () => void;
  onSave?: () => void;
}
```
- Copy to clipboard with format options
- Download in multiple formats
- Share via generated link
- Retry execution button (contextual)
- Save to history button

### Error State Handling

**Failed Execution Display**
```typescript
interface ErrorDisplayProps {
  error: ExecutionError;
  execution: PromptExecution;
  onRetry: () => void;
  onSupport: () => void;
}
```

1. **Error Message Section**
   - Clear, user-friendly error description
   - Technical error code and details
   - Timestamp and execution context

2. **Troubleshooting Section**
   - Common causes and solutions
   - Links to documentation
   - Suggested fixes based on error type

3. **Recovery Actions**
   - Retry button with loading state
   - Modify and retry option
   - Contact support option
   - Report bug functionality

### Validation Rules

```typescript
const ResultsViewerSchema = z.object({
  execution: z.object({
    id: z.string().uuid(),
    status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
    output: z.string().optional(),
    tokenUsage: z.object({
      promptTokens: z.number().min(0),
      completionTokens: z.number().min(0),
      totalTokens: z.number().min(0)
    }).optional(),
    cost: z.number().min(0).optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean()
    }).optional()
  })
});
```

### Responsive Design

**Desktop (>1024px)**
- Side-by-side layout for input/output comparison
- Full metrics dashboard with charts
- Complete action toolbar
- Expandable raw data inspector

**Tablet (768-1024px)**
- Tabbed interface with full functionality
- Responsive metrics cards
- Touch-optimized action buttons
- Horizontal scrolling for wide content

**Mobile (<768px)**
- Stacked card layout
- Swipeable tabs for content sections
- Simplified metrics with key indicators
- Bottom sheet for actions menu

---

## Implementation Roadmap

### Phase 1: Basic Results Display (4 hours)

**Components to Build:**
- `AIResultsViewer` main component
- `OutputDisplay` for AI response formatting
- `StatusBanner` for execution status
- Basic tabbed interface structure

**Functionality:**
- Display AI output with basic formatting
- Show execution status and timestamp
- Basic copy to clipboard functionality
- Error state handling

**Acceptance Criteria:**
- [ ] AI output displays correctly with formatting
- [ ] Execution status clearly indicated
- [ ] Basic copy functionality works
- [ ] Error states show helpful messages

### Phase 2: Metrics & Analytics (3 hours)

**Components to Build:**
- `MetricsDisplay` component
- `TokenUsageChart` visualization
- `CostBreakdown` component
- Performance metrics display

**Functionality:**
- Token usage visualization
- Cost calculation and display
- Performance metrics tracking
- Comparison with historical data

**Acceptance Criteria:**
- [ ] Token metrics display accurately
- [ ] Cost calculations are correct
- [ ] Performance data shows clearly
- [ ] Visual charts render properly

### Phase 3: Advanced Actions (3 hours)

**Components to Build:**
- `ResultsActions` toolbar
- Download functionality with multiple formats
- Share functionality with link generation
- Integration with execution history

**Functionality:**
- Multi-format download (TXT, JSON, HTML)
- Share results via generated links
- Save to execution history
- Advanced copy options

**Acceptance Criteria:**
- [ ] Downloads work in all formats
- [ ] Share functionality generates valid links
- [ ] History integration saves correctly
- [ ] Advanced copy options functional

### Phase 4: Polish & Integration (2 hours)

**Tasks:**
- Raw data inspector implementation
- Responsive design optimization
- Accessibility improvements
- Integration testing with execution panel

**Acceptance Criteria:**
- [ ] Raw data inspector shows complete information
- [ ] Responsive on all device sizes
- [ ] Keyboard navigation works
- [ ] Integration with parent components seamless

### Dependencies
**Blocked by**: Enhanced Execution Panel (provides execution data)
**Blocks**: Execution History Interface (consumes saved results)

### Estimated Effort
**Total: 1 day (12 hours)**
- Development: 10 hours
- Testing: 2 hours

---

## Technical Requirements

### TypeScript Interfaces

```typescript
// Core result interfaces
interface AIResultsViewerProps {
  execution: PromptExecution;
  onRetry?: () => void;
  onSave?: (execution: PromptExecution) => void;
  onShare?: (execution: PromptExecution) => void;
  className?: string;
}

interface FormattedOutput {
  content: string;
  type: 'text' | 'json' | 'html' | 'code';
  language?: string;
  formatted: string;
}

// Display component interfaces
interface OutputDisplayProps {
  output: string;
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  showLineNumbers?: boolean;
}

interface MetricsDisplayProps {
  tokenUsage: TokenUsage;
  cost: number;
  executionTime: number;
  model: string;
}

// Action interfaces
interface DownloadOptions {
  format: 'txt' | 'json' | 'html';
  filename?: string;
  includeMetadata?: boolean;
}

interface ShareOptions {
  includeInput: boolean;
  includeMetrics: boolean;
  expirationHours: number;
}
```

### Content Formatting

```typescript
// Output formatting utilities
const formatAIOutput = (content: string, type: ContentType): FormattedOutput => {
  const detectedType = detectContentType(content);
  
  switch (detectedType) {
    case 'json':
      return {
        content,
        type: 'json',
        formatted: JSON.stringify(JSON.parse(content), null, 2),
        language: 'json'
      };
    
    case 'html':
      return {
        content,
        type: 'html',
        formatted: formatHTML(content),
        language: 'html'
      };
    
    case 'code':
      return {
        content,
        type: 'code',
        formatted: highlightCode(content),
        language: detectLanguage(content)
      };
      
    default:
      return {
        content,
        type: 'text',
        formatted: content
      };
  }
};

// Content type detection
const detectContentType = (content: string): ContentType => {
  // JSON detection
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {}
  }
  
  // HTML detection
  if (/<[^>]+>/.test(content)) {
    return 'html';
  }
  
  // Code detection (basic patterns)
  if (/^(function|class|const|let|var|import|export)/.test(content.trim())) {
    return 'code';
  }
  
  return 'text';
};
```

### Error Handling

```typescript
// Error display utilities
interface ErrorDisplayData {
  title: string;
  message: string;
  actions: ErrorAction[];
  technical?: TechnicalErrorDetails;
}

interface ErrorAction {
  label: string;
  action: () => void;
  variant: 'primary' | 'secondary' | 'destructive';
}

const formatExecutionError = (error: ExecutionError): ErrorDisplayData => {
  const baseActions: ErrorAction[] = [
    {
      label: 'Try Again',
      action: () => onRetry(),
      variant: 'primary'
    }
  ];

  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      return {
        title: 'Rate limit exceeded',
        message: 'Too many requests. Please wait a moment before trying again.',
        actions: baseActions
      };
    
    case 'INVALID_API_KEY':
      return {
        title: 'API Configuration Error',
        message: 'There\'s an issue with the API configuration. Please contact support.',
        actions: [
          ...baseActions,
          {
            label: 'Contact Support',
            action: () => openSupportDialog(),
            variant: 'secondary'
          }
        ]
      };
    
    case 'TOKEN_LIMIT_EXCEEDED':
      return {
        title: 'Content too long',
        message: 'The input exceeds the maximum token limit. Try shortening your prompt or input.',
        actions: [
          {
            label: 'Edit and Retry',
            action: () => openEditDialog(),
            variant: 'primary'
          }
        ]
      };
      
    default:
      return {
        title: 'Execution Failed',
        message: error.message || 'An unexpected error occurred during execution.',
        actions: error.retryable ? baseActions : [],
        technical: {
          code: error.code,
          details: error.details
        }
      };
  }
};
```

### Action Handlers

```typescript
// Copy functionality
const handleCopy = async (content: string, format: 'plain' | 'formatted') => {
  try {
    const textToCopy = format === 'formatted' 
      ? formatForClipboard(content)
      : content;
    
    await navigator.clipboard.writeText(textToCopy);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  } catch (error) {
    console.error('Copy failed:', error);
    // Fallback to document.execCommand or manual selection
  }
};

// Download functionality
const handleDownload = (execution: PromptExecution, options: DownloadOptions) => {
  const content = generateDownloadContent(execution, options);
  const blob = new Blob([content], { 
    type: getContentType(options.format) 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename || `execution-${execution.id}.${options.format}`;
  a.click();
  
  URL.revokeObjectURL(url);
};

// Share functionality
const handleShare = async (execution: PromptExecution, options: ShareOptions) => {
  try {
    const sharePayload = {
      executionId: execution.id,
      includeInput: options.includeInput,
      includeMetrics: options.includeMetrics,
      expirationHours: options.expirationHours
    };
    
    const response = await fetch('/api/executions/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharePayload)
    });
    
    const { shareUrl } = await response.json();
    await navigator.clipboard.writeText(shareUrl);
    
    // Show success notification
    toast.success('Share link copied to clipboard');
  } catch (error) {
    console.error('Share failed:', error);
    toast.error('Failed to create share link');
  }
};
```

### Testing Strategy

**Unit Tests:**
```typescript
describe('AIResultsViewer', () => {
  test('displays successful execution results', () => {
    const mockExecution = createMockSuccessfulExecution();
    const { getByText } = render(
      <AIResultsViewer execution={mockExecution} />
    );
    
    expect(getByText(mockExecution.output)).toBeInTheDocument();
    expect(getByText('Completed')).toBeInTheDocument();
  });

  test('handles failed execution display', () => {
    const mockExecution = createMockFailedExecution();
    const { getByText } = render(
      <AIResultsViewer execution={mockExecution} />
    );
    
    expect(getByText('Execution Failed')).toBeInTheDocument();
    expect(getByText('Try Again')).toBeInTheDocument();
  });

  test('formats JSON output correctly', () => {
    const jsonOutput = '{"message": "Hello, world!"}';
    const formatted = formatAIOutput(jsonOutput, 'json');
    
    expect(formatted.type).toBe('json');
    expect(formatted.formatted).toContain('"message"');
  });
});
```

**Integration Tests:**
- Test with Enhanced Execution Panel integration
- Test download functionality with various formats
- Test share functionality end-to-end
- Test error recovery workflows

---

## Integration Points

### Existing Components to Reuse

**UI Components:**
- `Card`, `CardHeader`, `CardContent`, `CardFooter` - Main container structure
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - Content organization
- `Button` - Actions and navigation
- `Badge` - Status indicators
- `Alert` - Error message display
- `Progress` - Loading states during actions

**Patterns to Follow:**
- Error handling from existing forms
- Loading states from execution panel
- Toast notifications for user feedback
- Modal patterns for share dialogs

### API Integration

```typescript
// Share endpoint integration
const createShareLink = async (
  executionId: string, 
  options: ShareOptions
): Promise<string> => {
  const response = await fetch('/api/executions/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ executionId, ...options })
  });

  if (!response.ok) {
    throw new Error('Failed to create share link');
  }

  const { shareUrl } = await response.json();
  return shareUrl;
};
```

### State Management Integration

```typescript
// Integration with execution workflow
const ExecutionWorkflow = () => {
  const [currentExecution, setCurrentExecution] = useState<PromptExecution | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleExecutionComplete = (execution: PromptExecution) => {
    setCurrentExecution(execution);
    setShowResults(true);
  };

  const handleRetry = () => {
    setShowResults(false);
    // Trigger re-execution through Enhanced Execution Panel
  };

  return (
    <>
      <EnhancedExecutionPanel
        onExecutionComplete={handleExecutionComplete}
      />
      
      {showResults && currentExecution && (
        <AIResultsViewer
          execution={currentExecution}
          onRetry={handleRetry}
          onSave={saveToHistory}
        />
      )}
    </>
  );
};
```

---

## Success Criteria

### Functional Requirements
- [ ] Displays AI execution results with proper formatting
- [ ] Shows comprehensive metrics (tokens, cost, performance)
- [ ] Handles all execution states (success, failure, timeout)
- [ ] Provides copy, download, and share functionality
- [ ] Integrates seamlessly with execution workflow

### Technical Requirements
- [ ] TypeScript strict mode compliant
- [ ] Content formatting handles multiple data types
- [ ] Error handling with user-friendly messages
- [ ] Performance: Renders large outputs smoothly
- [ ] Memory: No leaks with frequent result updates

### User Experience Requirements
- [ ] Intuitive tabbed interface for different views
- [ ] Clear visual hierarchy for information display
- [ ] Responsive design across all device sizes
- [ ] Accessible with keyboard navigation and screen readers
- [ ] Consistent styling with design system

### Integration Requirements
- [ ] Works with Enhanced Execution Panel seamlessly
- [ ] Feeds data to Execution History correctly
- [ ] Follows established component patterns
- [ ] Maintains state consistency with parent components

This AI Results Viewer will complete the execution workflow in FormaOps, providing users with a comprehensive and professional interface for consuming AI execution results while maintaining the platform's high standard of user experience and technical quality.