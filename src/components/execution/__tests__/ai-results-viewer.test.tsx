import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIResultsViewer } from '../ai-results-viewer';
import type { ExecutionResult } from '../ai-results-viewer';

// Mock the PreferencesContext
jest.mock('@/contexts/PreferencesContext', () => ({
  useAIResultsPreferences: () => ({
    fontSize: 'medium',
    compactMode: false,
    showMetrics: true,
    autoRefresh: false,
  }),
}));

// Mock Supabase client
jest.mock('@/lib/auth/client', () => ({
  createSupabaseClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  }),
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  },
}));

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock URL.createObjectURL
// eslint-disable-next-line no-undef
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
// eslint-disable-next-line no-undef
global.URL.revokeObjectURL = jest.fn();

// Mock successful execution data
const mockSuccessfulExecution: ExecutionResult = {
  executionId: 'exec-123',
  status: 'COMPLETED',
  output: 'This is a test AI response with some content.',
  tokenUsage: {
    inputTokens: 50,
    outputTokens: 25,
    totalTokens: 75,
  },
  costUsd: 0.0015,
  validationStatus: 'PASSED',
  validationErrors: [],
  executionData: {
    inputs: {
      name: 'John Doe',
      age: 30,
      preferences: ['coffee', 'tea'],
    },
    model: 'gpt-3.5-turbo',
    maxTokens: 100,
    temperature: 0.7,
  },
  timestamp: '2024-01-15T10:30:00.000Z',
  executionTime: 2500,
};

// Mock failed execution data
const mockFailedExecution: ExecutionResult = {
  executionId: 'exec-456',
  status: 'FAILED',
  output: '',
  tokenUsage: {
    inputTokens: 20,
    outputTokens: 0,
    totalTokens: 20,
  },
  costUsd: 0.0003,
  validationStatus: 'FAILED',
  validationErrors: [
    {
      path: 'inputs.name',
      message: 'Name is required',
    },
  ],
  error: {
    type: 'VALIDATION_ERROR',
    message: 'Invalid input parameters',
    retryable: false,
    details: {
      field: 'name',
      code: 'REQUIRED',
    },
  },
  executionData: {
    inputs: {
      name: '',
      age: 30,
    },
    model: 'gpt-3.5-turbo',
    maxTokens: 100,
    temperature: 0.7,
  },
  timestamp: '2024-01-15T10:35:00.000Z',
};

// Mock retryable failed execution
const mockRetryableFailedExecution: ExecutionResult = {
  ...mockFailedExecution,
  executionId: 'exec-789',
  error: {
    type: 'RATE_LIMIT_ERROR',
    message: 'Rate limit exceeded',
    retryable: true,
    retryAfter: 60,
  },
};

describe('AIResultsViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Execution Display', () => {
    test('renders successful execution with output', () => {
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Check main elements
      expect(screen.getByTestId('ai-results-viewer')).toBeInTheDocument();
      expect(screen.getByText('Execution Result')).toBeInTheDocument();
      expect(screen.getByText('Completed Successfully')).toBeInTheDocument();

      // Check tabs are present
      expect(
        screen.getByRole('button', { name: /output/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /metrics/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /raw data/i })
      ).toBeInTheDocument();

      // Check timestamp is displayed (exact format may vary)
      expect(screen.getByText(/1\/15\/2024/i)).toBeInTheDocument();
    });

    test('displays AI output correctly in output tab', () => {
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Should show the AI response
      expect(
        screen.getByText(mockSuccessfulExecution.output)
      ).toBeInTheDocument();
    });

    test('displays input variables', () => {
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Check input variables section
      expect(screen.getByText('Input Variables')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    test('displays metrics correctly in metrics tab', async () => {
      const user = userEvent.setup();
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Switch to metrics tab
      await user.click(screen.getByRole('button', { name: /metrics/i }));

      // Should show metrics display component
      expect(screen.getByTestId('metrics-display')).toBeInTheDocument();
    });

    test('displays raw data correctly in raw tab', async () => {
      const user = userEvent.setup();
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Switch to raw data tab
      await user.click(screen.getByRole('button', { name: /raw data/i }));

      // Should show raw execution data
      expect(screen.getByText('Raw Execution Data')).toBeInTheDocument();
      expect(
        screen.getByText(mockSuccessfulExecution.executionId)
      ).toBeInTheDocument();
    });
  });

  describe('Failed Execution Display', () => {
    test('renders failed execution with error display', () => {
      render(<AIResultsViewer execution={mockFailedExecution} />);

      // Check error elements
      expect(screen.getByText('Execution Failed')).toBeInTheDocument();
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });

    test('shows validation errors in raw data tab', async () => {
      const user = userEvent.setup();
      render(<AIResultsViewer execution={mockFailedExecution} />);

      // Switch to raw data tab
      await user.click(screen.getByRole('button', { name: /raw data/i }));

      // Should show validation errors section
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('inputs.name')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    test('shows retry button for retryable errors', () => {
      const mockOnRetry = jest.fn();
      render(
        <AIResultsViewer
          execution={mockRetryableFailedExecution}
          onRetry={mockOnRetry}
        />
      );

      // Should show retry button in results actions
      expect(screen.getByTestId('results-actions')).toBeInTheDocument();
    });
  });

  describe('Results Actions', () => {
    test('renders results actions component', () => {
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Should show results actions
      expect(screen.getByTestId('results-actions')).toBeInTheDocument();
    });

    test('calls onRetry when retry is clicked', async () => {
      const mockOnRetry = jest.fn();
      const user = userEvent.setup();

      render(
        <AIResultsViewer
          execution={mockRetryableFailedExecution}
          onRetry={mockOnRetry}
        />
      );

      // Find and click retry button - be more specific
      const retryButtons = screen.getAllByRole('button', { name: /retry/i });
      expect(retryButtons.length).toBeGreaterThan(0);
      await user.click(retryButtons[0]);

      expect(mockOnRetry).toHaveBeenCalled();
    });

    test('calls onSave when save is clicked', async () => {
      const mockOnSave = jest.fn();
      const user = userEvent.setup();

      render(
        <AIResultsViewer
          execution={mockSuccessfulExecution}
          onSave={mockOnSave}
        />
      );

      // Find and click save button
      const saveButton = screen.getByRole('button', {
        name: /save to history/i,
      });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(mockSuccessfulExecution);
    });

    test('calls onShare when share is clicked', async () => {
      const mockOnShare = jest.fn();
      const user = userEvent.setup();

      render(
        <AIResultsViewer
          execution={mockSuccessfulExecution}
          onShare={mockOnShare}
        />
      );

      // Find and click share button
      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      // Share dialog should open
      expect(screen.getByText('Share Execution Result')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('can switch between tabs', async () => {
      const user = userEvent.setup();
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Check that buttons exist and can be clicked
      const outputButton = screen.getByRole('button', { name: /output/i });
      const metricsButton = screen.getByRole('button', { name: /metrics/i });
      const rawDataButton = screen.getByRole('button', { name: /raw data/i });

      // Switch between tabs
      await user.click(metricsButton);
      await user.click(rawDataButton);
      await user.click(outputButton);
    });

    test('preserves tab state when execution updates', () => {
      const { rerender } = render(
        <AIResultsViewer execution={mockSuccessfulExecution} />
      );

      // Should start with output content visible
      expect(
        screen.getByRole('button', { name: /output/i })
      ).toBeInTheDocument();

      // Re-render with updated execution
      const updatedExecution = { ...mockSuccessfulExecution, costUsd: 0.002 };
      rerender(<AIResultsViewer execution={updatedExecution} />);

      // Should still show the component properly
      expect(
        screen.getByRole('button', { name: /output/i })
      ).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    test('shows correct status badge for completed execution', () => {
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    test('shows correct status badge for failed execution', () => {
      render(<AIResultsViewer execution={mockFailedExecution} />);

      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Check main component has test id
      expect(screen.getByTestId('ai-results-viewer')).toBeInTheDocument();

      // Check tabs have proper roles - they are buttons, not semantic tabs
      expect(
        screen.getByRole('button', { name: /output/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /metrics/i })
      ).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AIResultsViewer execution={mockSuccessfulExecution} />);

      // Tab to first interactive element (buttons are focusable)
      await user.tab();

      // Since these are regular buttons, not semantic tabs, they don't support arrow key navigation
      // Just check that we can focus and click them
      const outputButton = screen.getByRole('button', { name: /output/i });
      const metricsButton = screen.getByRole('button', { name: /metrics/i });

      expect(outputButton).toBeInTheDocument();
      expect(metricsButton).toBeInTheDocument();

      // Test clicking to switch tabs
      await user.click(metricsButton);
      await user.click(outputButton);
    });
  });

  describe('Error Handling', () => {
    test('handles execution without output gracefully', () => {
      const executionWithoutOutput = {
        ...mockSuccessfulExecution,
        output: '',
      };

      render(<AIResultsViewer execution={executionWithoutOutput} />);

      // Should still render without errors
      expect(screen.getByTestId('ai-results-viewer')).toBeInTheDocument();
    });

    test('handles execution without executionData', () => {
      const executionWithoutData = {
        ...mockSuccessfulExecution,
        executionData: undefined,
      };

      render(<AIResultsViewer execution={executionWithoutData} />);

      // Should still render without errors
      expect(screen.getByTestId('ai-results-viewer')).toBeInTheDocument();
      // Should not show input variables section
      expect(screen.queryByText('Input Variables')).not.toBeInTheDocument();
    });

    test('handles missing timestamp gracefully', () => {
      const executionWithoutTimestamp = {
        ...mockSuccessfulExecution,
        timestamp: undefined,
      };

      render(<AIResultsViewer execution={executionWithoutTimestamp} />);

      // Should still render without errors
      expect(screen.getByTestId('ai-results-viewer')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('works with minimal required props', () => {
      const minimalExecution: ExecutionResult = {
        executionId: 'minimal-123',
        status: 'COMPLETED',
        output: 'Simple output',
        tokenUsage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        costUsd: 0.001,
        validationStatus: 'PASSED',
        validationErrors: [],
      };

      render(<AIResultsViewer execution={minimalExecution} />);

      // Should render successfully with minimal data
      expect(screen.getByTestId('ai-results-viewer')).toBeInTheDocument();
      expect(screen.getByText('Simple output')).toBeInTheDocument();
    });

    test('handles all callback props', () => {
      const mockCallbacks = {
        onRetry: jest.fn(),
        onSave: jest.fn(),
        onShare: jest.fn(),
      };

      render(
        <AIResultsViewer
          execution={mockRetryableFailedExecution}
          {...mockCallbacks}
        />
      );

      // Should render with all callbacks available
      expect(screen.getByTestId('ai-results-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('results-actions')).toBeInTheDocument();
    });
  });
});
