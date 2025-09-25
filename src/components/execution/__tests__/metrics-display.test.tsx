import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsDisplay } from '../metrics-display';
import type { TokenUsage } from '../metrics-display';

const mockTokenUsage: TokenUsage = {
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
};

describe('MetricsDisplay', () => {
  test('renders token usage correctly', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.0075}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByTestId('metrics-display')).toBeInTheDocument();
    expect(screen.getByText('Token Usage')).toBeInTheDocument();
    expect(screen.getAllByText('100')).toHaveLength(1); // Input tokens
    expect(screen.getAllByText('50')).toHaveLength(1); // Output tokens
    expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1); // Total tokens (may appear multiple times)
  });

  test('displays cost analysis correctly', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.0075}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByText('Cost Analysis')).toBeInTheDocument();
    expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-display')).toHaveTextContent(
      '$0.007500'
    );
  });

  test('shows performance metrics when execution time is provided', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.0075}
        executionTime={2500}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-display')).toHaveTextContent('2.5s');
    // Check for tokens per second pattern more flexibly
    expect(screen.getByTestId('metrics-display')).toHaveTextContent(
      /\d+\.\d+ t\/s/
    );
  });

  test('calculates efficiency rating correctly', () => {
    // Test with high input ratio (poor efficiency)
    const poorEfficiencyTokens = {
      inputTokens: 80,
      outputTokens: 20,
      totalTokens: 100,
    };

    render(
      <MetricsDisplay
        tokenUsage={poorEfficiencyTokens}
        cost={0.005}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByText('Poor')).toBeInTheDocument();

    // Test with good efficiency
    const goodEfficiencyTokens = {
      inputTokens: 20,
      outputTokens: 80,
      totalTokens: 100,
    };

    const { rerender } = render(
      <MetricsDisplay
        tokenUsage={goodEfficiencyTokens}
        cost={0.005}
        model="gpt-3.5-turbo"
      />
    );

    rerender(
      <MetricsDisplay
        tokenUsage={goodEfficiencyTokens}
        cost={0.005}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  test('displays summary statistics', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.0075}
        executionTime={2500}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();

    // Should show total tokens, cost, duration, and tokens/sec in summary
    const summarySection = screen.getByText('Summary').closest('.space-y-4');
    expect(summarySection).toBeInTheDocument();
  });

  test('handles different models correctly', () => {
    render(
      <MetricsDisplay tokenUsage={mockTokenUsage} cost={0.045} model="gpt-4" />
    );

    expect(screen.getByText('GPT-4')).toBeInTheDocument();
  });

  test('handles unknown model gracefully', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.005}
        model="unknown-model"
      />
    );

    expect(screen.getByText('unknown-model')).toBeInTheDocument();
  });

  test('formats numbers correctly', () => {
    const largeTokenUsage = {
      inputTokens: 10000,
      outputTokens: 5000,
      totalTokens: 15000,
    };

    render(
      <MetricsDisplay
        tokenUsage={largeTokenUsage}
        cost={0.75}
        model="gpt-3.5-turbo"
      />
    );

    // Should format large numbers with commas - check they exist in the document
    expect(screen.getByTestId('metrics-display')).toHaveTextContent('10,000');
    expect(screen.getByTestId('metrics-display')).toHaveTextContent('5,000');
    expect(screen.getByTestId('metrics-display')).toHaveTextContent('15,000');
  });

  test('shows performance insights', () => {
    // Test fast execution
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.0075}
        executionTime={500}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByText(/fast response time/i)).toBeInTheDocument();
  });

  test('calculates cost per token correctly', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.015}
        model="gpt-3.5-turbo"
      />
    );

    // Cost per token should be 0.015 / 150 = 0.0001
    expect(screen.getByText('Per Token')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-display')).toHaveTextContent(
      '$0.000100'
    );
  });

  test('shows progress bars for token usage', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.0075}
        model="gpt-3.5-turbo"
      />
    );

    // Progress bars should show percentages
    expect(screen.getByText('66.7% of total')).toBeInTheDocument(); // Input ratio
    expect(screen.getByText('33.3% of total')).toBeInTheDocument(); // Output ratio
  });

  test('handles zero execution time gracefully', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0.0075}
        executionTime={0}
        model="gpt-3.5-turbo"
      />
    );

    // Should not crash and should handle zero gracefully
    expect(screen.getByTestId('metrics-display')).toBeInTheDocument();
  });

  test('handles zero cost gracefully', () => {
    render(
      <MetricsDisplay
        tokenUsage={mockTokenUsage}
        cost={0}
        model="gpt-3.5-turbo"
      />
    );

    expect(screen.getByTestId('metrics-display')).toHaveTextContent(
      '$0.000000'
    );
  });
});
