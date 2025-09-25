'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIResultsViewer } from './ai-results-viewer';
import type { ExecutionResult } from './ai-results-viewer';

const demoExecutions: Record<string, ExecutionResult> = {
  successful: {
    executionId: 'exec-demo-success-123',
    status: 'COMPLETED',
    output: `# AI Analysis Report

## Summary
Successfully analyzed the customer feedback data and generated actionable insights.

## Key Findings
- **Sentiment Analysis**: 78% positive, 15% neutral, 7% negative
- **Top Themes**: Product quality (45%), Customer service (32%), Pricing (23%)
- **Improvement Areas**: Response time, documentation clarity

## Recommendations
1. Focus on reducing response times for customer inquiries
2. Improve documentation with more visual examples
3. Consider tiered pricing for different customer segments

## Technical Details
The analysis processed 2,847 feedback entries using advanced NLP techniques including:
- Sentiment classification with 94% accuracy
- Topic modeling using LDA
- Named entity recognition for product mentions

\`\`\`json
{
  "confidence_scores": {
    "sentiment": 0.94,
    "topic_classification": 0.89,
    "entity_extraction": 0.91
  },
  "processing_stats": {
    "total_entries": 2847,
    "valid_entries": 2839,
    "processing_time": "2.3s"
  }
}
\`\`\``,
    tokenUsage: {
      inputTokens: 1250,
      outputTokens: 820,
      totalTokens: 2070,
    },
    costUsd: 0.0621,
    validationStatus: 'PASSED',
    validationErrors: [],
    executionData: {
      inputs: {
        dataset_path: '/data/customer_feedback_q4_2024.csv',
        analysis_type: 'comprehensive',
        include_sentiment: true,
        include_topics: true,
        min_confidence: 0.8,
        output_format: 'markdown',
      },
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.3,
    },
    timestamp: new Date().toISOString(),
    executionTime: 4200,
  },

  failed: {
    executionId: 'exec-demo-failed-456',
    status: 'FAILED',
    output: '',
    tokenUsage: {
      inputTokens: 45,
      outputTokens: 0,
      totalTokens: 45,
    },
    costUsd: 0.00135,
    validationStatus: 'FAILED',
    validationErrors: [
      {
        path: 'inputs.dataset_path',
        message: 'Dataset file not found at specified path',
      },
      {
        path: 'inputs.api_key',
        message: 'API key is required for external data sources',
      },
    ],
    error: {
      type: 'VALIDATION_ERROR',
      message: 'Input validation failed: Missing required parameters',
      retryable: false,
      details: {
        missing_fields: ['api_key'],
        invalid_paths: ['/data/nonexistent.csv'],
        suggestions: [
          'Verify the dataset path exists',
          'Provide a valid API key',
          'Check file permissions',
        ],
      },
    },
    executionData: {
      inputs: {
        dataset_path: '/data/nonexistent.csv',
        analysis_type: 'comprehensive',
        include_sentiment: true,
        api_key: '',
      },
      model: 'gpt-3.5-turbo',
      maxTokens: 500,
      temperature: 0.5,
    },
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },

  retryable: {
    executionId: 'exec-demo-retry-789',
    status: 'FAILED',
    output: '',
    tokenUsage: {
      inputTokens: 234,
      outputTokens: 12,
      totalTokens: 246,
    },
    costUsd: 0.00738,
    validationStatus: 'PASSED',
    validationErrors: [],
    error: {
      type: 'RATE_LIMIT_ERROR',
      message: 'Rate limit exceeded for your API key',
      retryable: true,
      retryAfter: 30,
      details: {
        current_usage: '95%',
        reset_time: '2024-01-15T10:45:00Z',
        retry_suggestions: [
          'Wait 30 seconds before retrying',
          'Consider upgrading your API plan',
          'Implement exponential backoff',
        ],
      },
    },
    executionData: {
      inputs: {
        query: 'Analyze market trends for Q1 2024',
        depth: 'comprehensive',
        sources: ['financial_reports', 'news_articles', 'social_media'],
      },
      model: 'gpt-4',
      maxTokens: 800,
      temperature: 0.4,
    },
    timestamp: new Date(Date.now() - 150000).toISOString(),
    executionTime: 1200,
  },

  json_output: {
    executionId: 'exec-demo-json-321',
    status: 'COMPLETED',
    output: JSON.stringify(
      {
        analysis_results: {
          summary: 'Market analysis completed successfully',
          key_metrics: {
            growth_rate: 12.5,
            market_share: 34.2,
            customer_satisfaction: 8.7,
            revenue_projection: 2.4e6,
          },
          trends: [
            {
              category: 'Technology Adoption',
              trend: 'increasing',
              confidence: 0.92,
              impact: 'high',
            },
            {
              category: 'Customer Preferences',
              trend: 'stable',
              confidence: 0.85,
              impact: 'medium',
            },
          ],
          recommendations: [
            'Increase investment in AI/ML capabilities',
            'Focus on customer experience improvements',
            'Explore partnerships in emerging markets',
          ],
        },
        metadata: {
          processing_time: '3.2s',
          data_sources: 15,
          confidence_score: 0.88,
          last_updated: '2024-01-15T10:30:00Z',
        },
      },
      null,
      2
    ),
    tokenUsage: {
      inputTokens: 890,
      outputTokens: 445,
      totalTokens: 1335,
    },
    costUsd: 0.04005,
    validationStatus: 'PASSED',
    validationErrors: [],
    executionData: {
      inputs: {
        market_segment: 'enterprise_software',
        time_period: 'Q1_2024',
        analysis_depth: 'comprehensive',
        output_format: 'json',
      },
      model: 'gpt-4',
      maxTokens: 500,
      temperature: 0.2,
    },
    timestamp: new Date(Date.now() - 600000).toISOString(),
    executionTime: 3200,
  },

  code_output: {
    executionId: 'exec-demo-code-654',
    status: 'COMPLETED',
    output: `# Generated Python Analysis Script

\`\`\`python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

def analyze_customer_data(data_path):
    """
    Comprehensive customer data analysis pipeline

    Args:
        data_path (str): Path to the customer data CSV file

    Returns:
        dict: Analysis results and model metrics
    """
    # Load and preprocess data
    df = pd.read_csv(data_path)
    df = df.dropna()

    # Feature engineering
    df['customer_lifetime_value'] = df['purchase_amount'] * df['purchase_frequency']
    df['engagement_score'] = (df['email_opens'] + df['website_visits']) / 2

    # Prepare features and target
    features = ['age', 'income', 'purchase_frequency', 'engagement_score']
    X = df[features]
    y = df['customer_segment']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)

    # Generate predictions and metrics
    y_pred = model.predict(X_test)
    accuracy = model.score(X_test, y_test)

    # Feature importance analysis
    feature_importance = dict(zip(features, model.feature_importances_))

    return {
        'model_accuracy': accuracy,
        'feature_importance': feature_importance,
        'classification_report': classification_report(y_test, y_pred, output_dict=True),
        'total_customers_analyzed': len(df),
        'model_parameters': model.get_params()
    }

# Usage example
if __name__ == "__main__":
    results = analyze_customer_data('/data/customer_data.csv')
    print(f"Model Accuracy: {results['model_accuracy']:.3f}")
    print("Feature Importance:")
    for feature, importance in results['feature_importance'].items():
        print(f"  {feature}: {importance:.3f}")
\`\`\`

The generated script includes:
- **Data preprocessing** with null value handling
- **Feature engineering** for customer lifetime value
- **Machine learning pipeline** using Random Forest
- **Comprehensive evaluation metrics**
- **Feature importance analysis**

Key metrics from the analysis:
- Model accuracy: 87.3%
- Most important feature: engagement_score (0.342)
- Total customers analyzed: 15,847`,
    tokenUsage: {
      inputTokens: 567,
      outputTokens: 1240,
      totalTokens: 1807,
    },
    costUsd: 0.05421,
    validationStatus: 'PASSED',
    validationErrors: [],
    executionData: {
      inputs: {
        task_type: 'code_generation',
        language: 'python',
        framework: 'scikit-learn',
        complexity: 'intermediate',
        include_comments: true,
        include_example: true,
      },
      model: 'gpt-4',
      maxTokens: 1500,
      temperature: 0.1,
    },
    timestamp: new Date(Date.now() - 900000).toISOString(),
    executionTime: 5400,
  },
};

export function AIResultsDemo(): JSX.Element {
  const [selectedExecution, setSelectedExecution] =
    useState<string>('successful');
  const [savedExecutions, setSavedExecutions] = useState<string[]>([]);

  const handleRetry = (): void => {
    // Retry execution requested - handled by parent component
  };

  const handleSave = (execution: ExecutionResult): void => {
    if (!savedExecutions.includes(execution.executionId)) {
      setSavedExecutions(prev => [...prev, execution.executionId]);
    }
    // Execution saved successfully
  };

  const handleShare = (_execution: ExecutionResult): void => {
    // Share execution requested
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Results Viewer Demo</h1>
        <p className="text-muted-foreground">
          Explore different execution results and interaction patterns
        </p>
      </div>

      <Tabs value={selectedExecution} onValueChange={setSelectedExecution}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="successful" className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              SUCCESS
            </Badge>
            Comprehensive
          </TabsTrigger>
          <TabsTrigger value="failed" className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              FAILED
            </Badge>
            Validation Error
          </TabsTrigger>
          <TabsTrigger value="retryable" className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              RETRY
            </Badge>
            Rate Limited
          </TabsTrigger>
          <TabsTrigger value="json_output" className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              JSON
            </Badge>
            Structured Data
          </TabsTrigger>
          <TabsTrigger value="code_output" className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              CODE
            </Badge>
            Generated Script
          </TabsTrigger>
        </TabsList>

        {Object.entries(demoExecutions).map(([key, execution]) => (
          <TabsContent key={key} value={key} className="mt-6">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Execution: {execution.executionId}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        execution.status === 'COMPLETED'
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {execution.status}
                    </Badge>
                    {savedExecutions.includes(execution.executionId) && (
                      <Badge variant="secondary">Saved</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Model:</span>
                    <br />
                    {execution.executionData?.model || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Tokens:</span>
                    <br />
                    {execution.tokenUsage.totalTokens.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Cost:</span>
                    <br />${execution.costUsd.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <br />
                    {execution.executionTime
                      ? `${(execution.executionTime / 1000).toFixed(1)}s`
                      : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <AIResultsViewer
              execution={execution}
              onRetry={handleRetry}
              onSave={handleSave}
              onShare={handleShare}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Demo Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Content Types Showcased:</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  • <strong>Markdown</strong>: Rich formatted analysis reports
                </li>
                <li>
                  • <strong>JSON</strong>: Structured data with syntax
                  highlighting
                </li>
                <li>
                  • <strong>Code</strong>: Python scripts with language
                  detection
                </li>
                <li>
                  • <strong>Mixed</strong>: Combined formats in single output
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Error Scenarios:</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  • <strong>Validation Errors</strong>: Input parameter issues
                </li>
                <li>
                  • <strong>Rate Limiting</strong>: API quota exceeded
                  (retryable)
                </li>
                <li>
                  • <strong>Recovery Actions</strong>: Suggested next steps
                </li>
                <li>
                  • <strong>Error Details</strong>: Expandable technical info
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2">Output Display</h4>
              <ul className="text-sm space-y-1">
                <li>✓ Syntax highlighting</li>
                <li>✓ Content type detection</li>
                <li>✓ Collapsible long content</li>
                <li>✓ Line numbers toggle</li>
                <li>✓ Copy functionality</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Metrics Analysis</h4>
              <ul className="text-sm space-y-1">
                <li>✓ Token usage visualization</li>
                <li>✓ Cost breakdown</li>
                <li>✓ Performance metrics</li>
                <li>✓ Efficiency ratings</li>
                <li>✓ Model comparisons</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Actions & Export</h4>
              <ul className="text-sm space-y-1">
                <li>✓ Multiple download formats</li>
                <li>✓ Share functionality</li>
                <li>✓ Save to history</li>
                <li>✓ Retry mechanisms</li>
                <li>✓ Custom configurations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
