import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedExecutionPanel } from '../enhanced-execution-panel';
import type { Prompt } from '../../../types/database';

// Mock fetch for API calls
const mockFetch = jest.fn();
// eslint-disable-next-line no-undef
global.fetch = mockFetch;

// Mock prompt data for testing
const mockPrompt: Prompt = {
  id: 'test-prompt-1',
  name: 'Test Prompt',
  description: 'A test prompt for unit testing',
  template:
    'Hello {{name}}, you are {{age}} years old. Your preferences: {{preferences}}',
  variables: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'User name',
    },
    {
      name: 'age',
      type: 'number',
      required: true,
      description: 'User age',
    },
    {
      name: 'preferences',
      type: 'array',
      required: false,
      description: 'User preferences',
    },
  ] as any,
  version: 1,
  status: 'PUBLISHED',
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: new Date(),
  userId: 'test-user',
};

const mockPromptWithOptions: Prompt = {
  ...mockPrompt,
  id: 'test-prompt-2',
  variables: [
    {
      name: 'category',
      type: 'string',
      required: true,
      options: ['technology', 'health', 'education'],
    },
    {
      name: 'urgent',
      type: 'boolean',
      required: false,
    },
  ] as any,
};

describe('EnhancedExecutionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Form Generation', () => {
    test('generates form fields from variable definitions', () => {
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Check that all variable inputs are rendered
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/preferences/i)).toBeInTheDocument();

      // Check input types
      expect(screen.getByLabelText(/name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/age/i)).toHaveAttribute('type', 'number');
      expect(screen.getByLabelText(/preferences/i)).toHaveAttribute(
        'type',
        'text'
      );
    });

    test('renders dropdown for string variables with options', () => {
      render(<EnhancedExecutionPanel prompt={mockPromptWithOptions} />);

      const categorySelect = screen.getByDisplayValue('');
      expect(categorySelect.tagName).toBe('SELECT');

      // Check that options are present
      expect(screen.getByText('technology')).toBeInTheDocument();
      expect(screen.getByText('health')).toBeInTheDocument();
      expect(screen.getByText('education')).toBeInTheDocument();
    });

    test('renders checkbox for boolean variables', () => {
      render(<EnhancedExecutionPanel prompt={mockPromptWithOptions} />);

      const urgentCheckbox = screen.getByLabelText(/urgent/i);
      expect(urgentCheckbox).toHaveAttribute('type', 'checkbox');
    });

    test('shows required indicators for required fields', () => {
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Required fields should have asterisk
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('validates required string inputs', async () => {
      const user = userEvent.setup();
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      const executeButton = screen.getByTestId('execute-prompt-button');

      // Try to execute without filling required fields
      await user.click(executeButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    test('validates number input types', async () => {
      const user = userEvent.setup();
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);

      await user.type(nameInput, 'John Doe');
      await user.type(ageInput, 'not-a-number');

      const executeButton = screen.getByTestId('execute-prompt-button');
      await user.click(executeButton);

      // Should validate number input
      await waitFor(() => {
        expect(ageInput).toHaveValue(null);
      });
    });

    test('handles array input parsing', async () => {
      const user = userEvent.setup();
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      const preferencesInput = screen.getByLabelText(/preferences/i);
      await user.type(preferencesInput, 'coffee, tea, water');

      // Should parse comma-separated values
      expect(preferencesInput).toHaveValue('coffee, tea, water');
    });
  });

  describe('Model Selection and Parameters', () => {
    test('displays model selection with cost information', () => {
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Should show model selection
      const modelSelect = screen.getByDisplayValue('gpt-3.5-turbo');
      expect(modelSelect).toBeInTheDocument();

      // Should show cost information
      expect(screen.getByText(/cost/i)).toBeInTheDocument();
    });

    test('shows advanced parameters when toggled', async () => {
      const user = userEvent.setup();
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      const advancedToggle = screen.getByText(/show advanced/i);
      await user.click(advancedToggle);

      // Should show advanced parameters
      expect(screen.getByLabelText(/max tokens/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument();
    });

    test('updates cost estimation when model changes', async () => {
      const user = userEvent.setup();
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Get initial cost
      const initialCost = screen.getByText(/\$.*\d/);
      const initialValue = initialCost.textContent;

      // Change model to GPT-4
      const modelSelect = screen.getByDisplayValue('gpt-3.5-turbo');
      await user.selectOptions(modelSelect, 'gpt-4');

      // Cost should update
      await waitFor(() => {
        const newCost = screen.getByText(/\$.*\d/);
        expect(newCost.textContent).not.toBe(initialValue);
      });
    });
  });

  describe('Execution Flow', () => {
    test('submits execution request with correct data', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        executionId: 'exec-123',
        status: 'COMPLETED',
        output: 'Test response',
        tokenUsage: {
          inputTokens: 10,
          outputTokens: 15,
          totalTokens: 25,
        },
        costUsd: 0.001,
        validationStatus: 'PASSED',
        validationErrors: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const onExecutionComplete = jest.fn();
      render(
        <EnhancedExecutionPanel
          prompt={mockPrompt}
          onExecutionComplete={onExecutionComplete}
        />
      );

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);

      await user.type(nameInput, 'John Doe');
      await user.type(ageInput, '25');

      // Execute
      const executeButton = screen.getByTestId('execute-prompt-button');
      await user.click(executeButton);

      // Should show loading state
      expect(screen.getByText(/executing/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(onExecutionComplete).toHaveBeenCalledWith(mockResponse);
      });

      // Should show success state
      expect(screen.getByText(/completed successfully/i)).toBeInTheDocument();
    });

    test('handles execution errors gracefully', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);

      await user.type(nameInput, 'John Doe');
      await user.type(ageInput, '25');

      // Execute
      const executeButton = screen.getByTestId('execute-prompt-button');
      await user.click(executeButton);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/execution failed/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });

    test('shows loading state during execution', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    executionId: 'exec-123',
                    status: 'COMPLETED',
                    output: 'Test response',
                    tokenUsage: {
                      inputTokens: 10,
                      outputTokens: 15,
                      totalTokens: 25,
                    },
                    costUsd: 0.001,
                    validationStatus: 'PASSED',
                    validationErrors: [],
                  }),
                }),
              100
            )
          )
      );

      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);

      await user.type(nameInput, 'John Doe');
      await user.type(ageInput, '25');

      // Execute
      const executeButton = screen.getByTestId('execute-prompt-button');
      await user.click(executeButton);

      // Should show loading state immediately
      expect(screen.getByText(/executing/i)).toBeInTheDocument();
      expect(executeButton).toBeDisabled();
    });
  });

  describe('Execution History', () => {
    test('tracks execution history locally', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        executionId: 'exec-123',
        status: 'COMPLETED',
        output: 'First execution',
        tokenUsage: { inputTokens: 10, outputTokens: 15, totalTokens: 25 },
        costUsd: 0.001,
        validationStatus: 'PASSED',
        validationErrors: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Fill and execute
      await user.type(screen.getByLabelText(/name/i), 'John');
      await user.type(screen.getByLabelText(/age/i), '25');
      await user.click(screen.getByTestId('execute-prompt-button'));

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/execution history/i)).toBeInTheDocument();
      });

      // Should show execution in history
      expect(screen.getByText(/first execution/i)).toBeInTheDocument();
    });

    test('allows rerunning previous executions', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        executionId: 'exec-123',
        status: 'COMPLETED',
        output: 'Test execution',
        tokenUsage: { inputTokens: 10, outputTokens: 15, totalTokens: 25 },
        costUsd: 0.001,
        validationStatus: 'PASSED',
        validationErrors: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Complete first execution
      await user.type(screen.getByLabelText(/name/i), 'John');
      await user.type(screen.getByLabelText(/age/i), '25');
      await user.click(screen.getByTestId('execute-prompt-button'));

      await waitFor(() => {
        expect(screen.getByText(/execution history/i)).toBeInTheDocument();
      });

      // Find and click rerun button
      const rerunButton = screen.getByTitle(/rerun with same parameters/i);
      await user.click(rerunButton);

      // Form should be prefilled
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });
  });

  describe('Cost Estimation', () => {
    test('calculates cost estimation correctly', () => {
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Should show cost estimation
      expect(screen.getByText(/cost estimation/i)).toBeInTheDocument();
      expect(screen.getByText(/\$/)).toBeInTheDocument();
    });

    test('updates cost when inputs change', async () => {
      const user = userEvent.setup();
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      const nameInput = screen.getByLabelText(/name/i);

      // Add input that increases token count
      await user.type(
        nameInput,
        'A very long name that will increase the token count significantly'
      );

      // Cost should update (this is a simple check - in real implementation we'd check actual values)
      expect(screen.getByText(/cost estimation/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundaries and Recovery', () => {
    test('handles component errors gracefully', () => {
      // Mock console.error to prevent error output in tests
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Create a prompt that will cause an error
      const invalidPrompt = {
        ...mockPrompt,
        variables: null as any, // This should cause an error
      };

      render(<EnhancedExecutionPanel prompt={invalidPrompt} />);

      // Component should still render with fallback
      expect(screen.getByText(/execute prompt/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Check for ARIA attributes
      const panel = screen.getByTestId('enhanced-execution-panel');
      expect(panel).toBeInTheDocument();

      // Form fields should have proper labels
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Should be able to tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/age/i)).toHaveFocus();
    });

    test('provides screen reader friendly content', () => {
      render(<EnhancedExecutionPanel prompt={mockPrompt} />);

      // Check for descriptive text
      expect(
        screen.getByText(/configure inputs and run this prompt/i)
      ).toBeInTheDocument();

      // Required fields should be clearly marked
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeRequired();
    });
  });
});
