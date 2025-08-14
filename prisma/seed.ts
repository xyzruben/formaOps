import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@formaops.com' },
    update: {},
    create: {
      email: 'demo@formaops.com',
      name: 'Demo User',
      plan: 'PRO',
    },
  });

  console.log('👤 Created demo user:', demoUser.email);

  // Create sample prompts
  const codeReviewPrompt = await prisma.prompt.create({
    data: {
      name: 'AI Code Reviewer',
      description: 'Reviews code for best practices, security, and performance',
      template: `Review the following {{language}} code for:
- Code quality and best practices
- Security vulnerabilities
- Performance optimizations
- Maintainability improvements

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\`

Focus areas: {{focus_areas}}
Provide detailed feedback with specific suggestions.`,
      variables: [
        {
          name: 'language',
          type: 'string',
          required: true,
          defaultValue: 'typescript',
          options: ['typescript', 'javascript', 'python', 'go', 'rust']
        },
        {
          name: 'code',
          type: 'string',
          required: true,
          description: 'Code to review'
        },
        {
          name: 'focus_areas',
          type: 'string',
          defaultValue: 'security, performance',
          description: 'Specific areas to focus on'
        }
      ],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['development', 'code-review', 'quality'],
      userId: demoUser.id,
    },
  });

  // Create email template prompt
  const emailPrompt = await prisma.prompt.create({
    data: {
      name: 'Professional Email Generator',
      description: 'Creates professional emails for various business scenarios',
      template: `Write a professional {{email_type}} email with the following details:

To: {{recipient}}
Subject: {{subject}}

Key points to include:
{{#each key_points}}
- {{this}}
{{/each}}

Tone: {{tone}}
Length: {{length}}

Please ensure the email is {{tone}} and includes all key points in a {{length}} format.`,
      variables: [
        {
          name: 'email_type',
          type: 'string',
          required: true,
          options: ['follow-up', 'introduction', 'request', 'apology', 'announcement'],
          description: 'Type of email to generate'
        },
        {
          name: 'recipient',
          type: 'string',
          required: true,
          description: 'Email recipient name'
        },
        {
          name: 'subject',
          type: 'string',
          required: true,
          description: 'Email subject line'
        },
        {
          name: 'key_points',
          type: 'array',
          required: true,
          description: 'Key points to include in the email'
        },
        {
          name: 'tone',
          type: 'string',
          defaultValue: 'professional',
          options: ['formal', 'professional', 'friendly', 'casual'],
          description: 'Email tone'
        },
        {
          name: 'length',
          type: 'string',
          defaultValue: 'medium',
          options: ['brief', 'medium', 'detailed'],
          description: 'Email length'
        }
      ],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['communication', 'business', 'email'],
      userId: demoUser.id,
    },
  });

  // Create data analysis prompt
  await prisma.prompt.create({
    data: {
      name: 'Data Insights Generator',
      description: 'Analyzes datasets and generates executive summaries',
      template: `Analyze the following dataset and provide insights:

Dataset: {{dataset_name}}
Type: {{data_type}}
Size: {{record_count}} records

Data sample:
{{data_sample}}

Generate:
1. Key trends and patterns
2. Statistical insights
3. Business recommendations
4. Data quality observations

Analysis focus: {{analysis_focus}}
Present findings in a clear, executive-friendly format.`,
      variables: [
        {
          name: 'dataset_name',
          type: 'string',
          required: true,
          description: 'Name of the dataset'
        },
        {
          name: 'data_type',
          type: 'string',
          required: true,
          options: ['sales', 'user_behavior', 'financial', 'operational', 'marketing'],
          description: 'Type of data being analyzed'
        },
        {
          name: 'record_count',
          type: 'number',
          required: true,
          description: 'Number of records in the dataset'
        },
        {
          name: 'data_sample',
          type: 'string',
          required: true,
          description: 'Sample of the data (first few rows or summary)'
        },
        {
          name: 'analysis_focus',
          type: 'string',
          defaultValue: 'trends and recommendations',
          description: 'Specific focus for the analysis'
        }
      ],
      status: 'DRAFT',
      tags: ['analytics', 'data', 'insights'],
      userId: demoUser.id,
    },
  });

  // Create additional demo prompts as specified in Task 18
  const contentGeneratorPrompt = await prisma.prompt.create({
    data: {
      name: 'Content Generator',
      description: 'Generates various types of content for marketing and communication',
      template: `Create {{content_type}} content for {{audience}} audience.

Topic: {{topic}}
Key messages: {{key_messages}}
Tone: {{tone}}
Length: {{word_count}} words

Requirements:
- Include {{brand_name}} as the brand
- Focus on {{primary_goal}}
- Include call-to-action: {{call_to_action}}

Additional context: {{additional_context}}

Please ensure the content is engaging, on-brand, and achieves the specified goal.`,
      variables: [
        {
          name: 'content_type',
          type: 'string',
          required: true,
          options: ['blog_post', 'social_media', 'email_campaign', 'landing_page', 'product_description'],
          description: 'Type of content to generate'
        },
        {
          name: 'audience',
          type: 'string',
          required: true,
          options: ['executives', 'developers', 'marketers', 'general_public', 'customers'],
          description: 'Target audience'
        },
        {
          name: 'topic',
          type: 'string',
          required: true,
          description: 'Main topic or subject'
        },
        {
          name: 'key_messages',
          type: 'string',
          required: true,
          description: 'Key messages to include'
        },
        {
          name: 'tone',
          type: 'string',
          required: true,
          options: ['professional', 'conversational', 'authoritative', 'friendly', 'technical'],
          defaultValue: 'professional'
        },
        {
          name: 'word_count',
          type: 'number',
          required: true,
          defaultValue: 300,
          description: 'Target word count'
        },
        {
          name: 'brand_name',
          type: 'string',
          required: true,
          description: 'Brand or company name'
        },
        {
          name: 'primary_goal',
          type: 'string',
          required: true,
          options: ['awareness', 'engagement', 'conversion', 'education', 'retention'],
          description: 'Primary content goal'
        },
        {
          name: 'call_to_action',
          type: 'string',
          required: true,
          description: 'Desired call-to-action'
        },
        {
          name: 'additional_context',
          type: 'string',
          required: false,
          description: 'Any additional context or requirements'
        }
      ],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['content', 'marketing', 'copywriting'],
      userId: demoUser.id,
    },
  });

  const apiDocumentationPrompt = await prisma.prompt.create({
    data: {
      name: 'API Documentation Generator',
      description: 'Generates comprehensive API documentation from code or specifications',
      template: `Generate comprehensive API documentation for the following endpoint:

Endpoint: {{method}} {{endpoint_path}}
Description: {{description}}

Parameters:
{{parameters}}

Request Body Schema:
{{request_schema}}

Response Schema:
{{response_schema}}

Error Codes:
{{error_codes}}

Authentication: {{auth_type}}

Generate documentation that includes:
1. Overview and purpose
2. Request/response examples
3. Parameter descriptions
4. Error handling
5. Code examples in {{language}}

Style: {{doc_style}}`,
      variables: [
        {
          name: 'method',
          type: 'string',
          required: true,
          options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'HTTP method'
        },
        {
          name: 'endpoint_path',
          type: 'string',
          required: true,
          description: 'API endpoint path'
        },
        {
          name: 'description',
          type: 'string',
          required: true,
          description: 'Brief description of the endpoint'
        },
        {
          name: 'parameters',
          type: 'string',
          required: false,
          description: 'Query parameters or path parameters'
        },
        {
          name: 'request_schema',
          type: 'string',
          required: false,
          description: 'Request body schema (JSON)'
        },
        {
          name: 'response_schema',
          type: 'string',
          required: true,
          description: 'Response schema (JSON)'
        },
        {
          name: 'error_codes',
          type: 'string',
          required: true,
          defaultValue: '400, 401, 404, 500',
          description: 'Possible error codes'
        },
        {
          name: 'auth_type',
          type: 'string',
          required: true,
          options: ['Bearer', 'API Key', 'Basic Auth', 'OAuth', 'None'],
          defaultValue: 'Bearer',
          description: 'Authentication method'
        },
        {
          name: 'language',
          type: 'string',
          required: true,
          options: ['javascript', 'python', 'curl', 'go', 'php'],
          defaultValue: 'javascript',
          description: 'Language for code examples'
        },
        {
          name: 'doc_style',
          type: 'string',
          required: true,
          options: ['openapi', 'markdown', 'rest', 'graphql'],
          defaultValue: 'openapi',
          description: 'Documentation style'
        }
      ],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['api', 'documentation', 'technical'],
      userId: demoUser.id,
    },
  });

  const testCaseGeneratorPrompt = await prisma.prompt.create({
    data: {
      name: 'Test Case Generator',
      description: 'Generates comprehensive test cases for software testing',
      template: `Generate comprehensive test cases for the following feature:

Feature: {{feature_name}}
Description: {{feature_description}}
User Story: {{user_story}}

Requirements:
{{requirements}}

Test Environment: {{test_environment}}
Test Level: {{test_level}}
Test Type: {{test_type}}

Generate test cases that cover:
1. Happy path scenarios
2. Edge cases
3. Error conditions
4. Boundary testing
5. {{focus_area}} testing

Include:
- Test case ID
- Test steps
- Expected results
- Test data
- Preconditions
- Priority level

Format: {{output_format}}`,
      variables: [
        {
          name: 'feature_name',
          type: 'string',
          required: true,
          description: 'Name of the feature to test'
        },
        {
          name: 'feature_description',
          type: 'string',
          required: true,
          description: 'Detailed description of the feature'
        },
        {
          name: 'user_story',
          type: 'string',
          required: true,
          description: 'User story or acceptance criteria'
        },
        {
          name: 'requirements',
          type: 'string',
          required: true,
          description: 'Functional and non-functional requirements'
        },
        {
          name: 'test_environment',
          type: 'string',
          required: true,
          options: ['web', 'mobile', 'api', 'desktop', 'embedded'],
          description: 'Testing environment'
        },
        {
          name: 'test_level',
          type: 'string',
          required: true,
          options: ['unit', 'integration', 'system', 'acceptance'],
          description: 'Level of testing'
        },
        {
          name: 'test_type',
          type: 'string',
          required: true,
          options: ['functional', 'performance', 'security', 'usability', 'compatibility'],
          description: 'Type of testing'
        },
        {
          name: 'focus_area',
          type: 'string',
          required: false,
          defaultValue: 'functional',
          description: 'Special focus area for testing'
        },
        {
          name: 'output_format',
          type: 'string',
          required: true,
          options: ['table', 'gherkin', 'checklist', 'structured'],
          defaultValue: 'structured',
          description: 'Preferred output format'
        }
      ],
      status: 'DRAFT',
      tags: ['testing', 'qa', 'software-development'],
      userId: demoUser.id,
    },
  });

  console.log('📝 Created sample prompts with comprehensive demo data');

  // Create validation rules for code review prompt
  await prisma.validation.create({
    data: {
      name: 'Code Review Schema Validation',
      type: 'SCHEMA',
      config: {
        type: 'object',
        required: ['issues', 'overall_rating', 'summary'],
        properties: {
          issues: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'severity', 'description'],
              properties: {
                type: { 
                  type: 'string',
                  enum: ['security', 'performance', 'style', 'bug', 'maintainability'] 
                },
                severity: { 
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'] 
                },
                description: { type: 'string' },
                suggestion: { type: 'string' },
                line_number: { type: 'number' }
              }
            }
          },
          overall_rating: {
            type: 'number',
            minimum: 1,
            maximum: 10
          },
          summary: {
            type: 'string',
            minLength: 50
          }
        }
      },
      promptId: codeReviewPrompt.id,
    },
  });

  // Create validation rules for content generator prompt
  await prisma.validation.create({
    data: {
      name: 'Content Structure Validation',
      type: 'SCHEMA',
      config: {
        type: 'object',
        required: ['content', 'word_count', 'call_to_action_included'],
        properties: {
          content: {
            type: 'string',
            minLength: 100
          },
          word_count: {
            type: 'number',
            minimum: 50
          },
          call_to_action_included: {
            type: 'boolean'
          },
          brand_mentions: {
            type: 'number',
            minimum: 1
          },
          tone_analysis: {
            type: 'string',
            enum: ['professional', 'conversational', 'authoritative', 'friendly', 'technical']
          }
        }
      },
      promptId: contentGeneratorPrompt.id,
    },
  });

  // Create validation rules for API documentation prompt
  await prisma.validation.create({
    data: {
      name: 'API Documentation Completeness',
      type: 'SCHEMA', 
      config: {
        type: 'object',
        required: ['overview', 'parameters', 'examples', 'error_codes'],
        properties: {
          overview: {
            type: 'string',
            minLength: 50
          },
          parameters: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'type', 'description'],
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
                required: { type: 'boolean' }
              }
            }
          },
          examples: {
            type: 'object',
            required: ['request', 'response'],
            properties: {
              request: { type: 'string' },
              response: { type: 'string' }
            }
          },
          error_codes: {
            type: 'array',
            minItems: 1
          }
        }
      },
      promptId: apiDocumentationPrompt.id,
    },
  });

  // Create validation rules for test case generator
  await prisma.validation.create({
    data: {
      name: 'Test Case Quality Check',
      type: 'SCHEMA',
      config: {
        type: 'object',
        required: ['test_cases', 'coverage_areas'],
        properties: {
          test_cases: {
            type: 'array',
            minItems: 3,
            items: {
              type: 'object',
              required: ['test_id', 'description', 'steps', 'expected_result'],
              properties: {
                test_id: { type: 'string' },
                description: { type: 'string', minLength: 20 },
                steps: { 
                  type: 'array',
                  minItems: 1
                },
                expected_result: { type: 'string', minLength: 10 },
                priority: { 
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical']
                }
              }
            }
          },
          coverage_areas: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['happy_path', 'edge_cases', 'error_conditions', 'boundary_testing']
            },
            minItems: 2
          }
        }
      },
      promptId: testCaseGeneratorPrompt.id,
    },
  });

  // Create sample executions with realistic data
  const execution1 = await prisma.execution.create({
    data: {
      inputs: {
        language: 'typescript',
        code: 'const user = { password: "123456" }; // TODO: hash passwords\nconsole.log("User:", user);',
        focus_areas: 'security, best practices'
      },
      output: JSON.stringify({
        issues: [
          {
            type: 'security',
            severity: 'high',
            description: 'Hardcoded password in plain text',
            suggestion: 'Use environment variables and hash passwords',
            line_number: 1
          },
          {
            type: 'style',
            severity: 'low',
            description: 'Console.log should be removed in production',
            suggestion: 'Use proper logging library',
            line_number: 2
          }
        ],
        overall_rating: 4,
        summary: 'Code has a critical security issue with hardcoded password. Consider implementing proper password hashing and removing debug statements.'
      }),
      validatedOutput: {
        issues: [
          {
            type: 'security',
            severity: 'high',
            description: 'Hardcoded password in plain text',
            suggestion: 'Use environment variables and hash passwords',
            line_number: 1
          }
        ],
        overall_rating: 4,
        summary: 'Code has a critical security issue with hardcoded password.'
      },
      status: 'COMPLETED',
      validationStatus: 'PASSED',
      latencyMs: 2340,
      costUsd: 0.045,
      tokenUsage: {
        input: 156,
        output: 89,
        total: 245,
        model: 'gpt-4'
      },
      startedAt: new Date(Date.now() - 5000),
      completedAt: new Date(),
      userId: demoUser.id,
      promptId: codeReviewPrompt.id,
    },
  });

  // Create execution log
  await prisma.executionLog.create({
    data: {
      level: 'INFO',
      message: 'Code review completed successfully',
      metadata: {
        issues_found: 2,
        execution_time: 2340,
        model_used: 'gpt-4'
      },
      executionId: execution1.id,
    },
  });

  // Create content generation execution
  const execution2 = await prisma.execution.create({
    data: {
      inputs: {
        content_type: 'blog_post',
        audience: 'developers',
        topic: 'Introduction to AI-powered development tools',
        key_messages: 'AI tools increase productivity, reduce errors, enhance code quality',
        tone: 'conversational',
        word_count: 500,
        brand_name: 'FormaOps',
        primary_goal: 'education',
        call_to_action: 'Try FormaOps today',
        additional_context: 'Focus on practical benefits and real-world examples'
      },
      output: JSON.stringify({
        content: 'Modern software development is evolving rapidly with the integration of AI-powered tools...',
        word_count: 487,
        call_to_action_included: true,
        brand_mentions: 3,
        tone_analysis: 'conversational'
      }),
      validatedOutput: {
        content: 'AI-powered development tools are transforming how we write code...',
        word_count: 487,
        call_to_action_included: true,
        brand_mentions: 3,
        tone_analysis: 'conversational'
      },
      status: 'COMPLETED',
      validationStatus: 'PASSED',
      latencyMs: 3200,
      costUsd: 0.078,
      tokenUsage: {
        input: 245,
        output: 156,
        total: 401,
        model: 'gpt-3.5-turbo'
      },
      startedAt: new Date(Date.now() - 20000),
      completedAt: new Date(Date.now() - 16000),
      userId: demoUser.id,
      promptId: contentGeneratorPrompt.id,
    },
  });

  // Create API documentation execution
  const execution3 = await prisma.execution.create({
    data: {
      inputs: {
        method: 'POST',
        endpoint_path: '/api/users',
        description: 'Create a new user account',
        parameters: 'None',
        request_schema: '{"name": "string", "email": "string", "password": "string"}',
        response_schema: '{"id": "string", "name": "string", "email": "string", "createdAt": "datetime"}',
        error_codes: '400, 409, 500',
        auth_type: 'Bearer',
        language: 'javascript',
        doc_style: 'openapi'
      },
      output: JSON.stringify({
        overview: 'Creates a new user account in the system with validation...',
        parameters: [
          { name: 'name', type: 'string', description: 'User full name', required: true },
          { name: 'email', type: 'string', description: 'User email address', required: true },
          { name: 'password', type: 'string', description: 'User password', required: true }
        ],
        examples: {
          request: 'POST /api/users\n{"name": "John Doe", "email": "john@example.com", "password": "securePass123"}',
          response: '{"id": "123", "name": "John Doe", "email": "john@example.com", "createdAt": "2024-01-01T00:00:00Z"}'
        },
        error_codes: [400, 409, 500]
      }),
      validatedOutput: {
        overview: 'Creates a new user account in the system...',
        parameters: [
          { name: 'name', type: 'string', description: 'User full name', required: true }
        ],
        examples: {
          request: 'POST /api/users',
          response: '{"id": "123"}'
        },
        error_codes: [400, 409, 500]
      },
      status: 'COMPLETED',
      validationStatus: 'PASSED',
      latencyMs: 2800,
      costUsd: 0.095,
      tokenUsage: {
        input: 198,
        output: 234,
        total: 432,
        model: 'gpt-4'
      },
      startedAt: new Date(Date.now() - 30000),
      completedAt: new Date(Date.now() - 27000),
      userId: demoUser.id,
      promptId: apiDocumentationPrompt.id,
    },
  });

  // Create a failed execution with retry example
  const execution4 = await prisma.execution.create({
    data: {
      inputs: {
        email_type: 'follow-up',
        recipient: 'John Doe',
        subject: 'Following up on our meeting',
        key_points: ['Discuss project timeline', 'Review budget'],
        tone: 'professional'
      },
      status: 'FAILED',
      errorType: 'RATE_LIMIT',
      errorMessage: 'Rate limit exceeded. Please try again later.',
      retryCount: 2,
      validationStatus: 'SKIPPED',
      latencyMs: 1200,
      costUsd: 0.012,
      tokenUsage: {
        input: 89,
        output: 0,
        total: 89,
        model: 'gpt-4'
      },
      startedAt: new Date(Date.now() - 10000),
      completedAt: new Date(Date.now() - 8000),
      userId: demoUser.id,
      promptId: emailPrompt.id,
    },
  });

  // Create test case generation execution
  const execution5 = await prisma.execution.create({
    data: {
      inputs: {
        feature_name: 'User Login',
        feature_description: 'Users can log in with email and password',
        user_story: 'As a user, I want to log in to access my account',
        requirements: 'Email validation, password security, rate limiting',
        test_environment: 'web',
        test_level: 'integration',
        test_type: 'functional',
        focus_area: 'security',
        output_format: 'structured'
      },
      output: JSON.stringify({
        test_cases: [
          {
            test_id: 'TC001',
            description: 'Verify successful login with valid credentials',
            steps: ['Navigate to login page', 'Enter valid email', 'Enter valid password', 'Click login'],
            expected_result: 'User is redirected to dashboard',
            priority: 'high'
          },
          {
            test_id: 'TC002',
            description: 'Verify login fails with invalid email',
            steps: ['Navigate to login page', 'Enter invalid email format', 'Enter valid password', 'Click login'],
            expected_result: 'Error message displayed',
            priority: 'medium'
          },
          {
            test_id: 'TC003',
            description: 'Verify account lockout after multiple failed attempts',
            steps: ['Attempt login 5 times with wrong password'],
            expected_result: 'Account temporarily locked',
            priority: 'critical'
          }
        ],
        coverage_areas: ['happy_path', 'edge_cases', 'error_conditions', 'boundary_testing']
      }),
      validatedOutput: {
        test_cases: [
          {
            test_id: 'TC001',
            description: 'Verify successful login with valid credentials',
            steps: ['Navigate to login page'],
            expected_result: 'User is redirected to dashboard',
            priority: 'high'
          }
        ],
        coverage_areas: ['happy_path', 'edge_cases']
      },
      status: 'COMPLETED',
      validationStatus: 'PASSED',
      latencyMs: 4100,
      costUsd: 0.123,
      tokenUsage: {
        input: 312,
        output: 287,
        total: 599,
        model: 'gpt-4'
      },
      startedAt: new Date(Date.now() - 40000),
      completedAt: new Date(Date.now() - 36000),
      userId: demoUser.id,
      promptId: testCaseGeneratorPrompt.id,
    },
  });

  // Create execution logs for the new executions
  await prisma.executionLog.create({
    data: {
      level: 'INFO',
      message: 'Content generation completed successfully',
      metadata: {
        word_count: 487,
        content_type: 'blog_post',
        execution_time: 3200,
        model_used: 'gpt-3.5-turbo'
      },
      executionId: execution2.id,
    },
  });

  await prisma.executionLog.create({
    data: {
      level: 'INFO',
      message: 'API documentation generated successfully',
      metadata: {
        endpoint: 'POST /api/users',
        doc_style: 'openapi',
        execution_time: 2800,
        model_used: 'gpt-4'
      },
      executionId: execution3.id,
    },
  });

  await prisma.executionLog.create({
    data: {
      level: 'ERROR',
      message: 'Execution failed due to rate limiting',
      metadata: {
        error_type: 'RATE_LIMIT',
        retry_count: 2,
        execution_time: 1200,
        retry_suggestion: 'Wait before retrying'
      },
      executionId: execution4.id,
    },
  });

  await prisma.executionLog.create({
    data: {
      level: 'INFO',
      message: 'Test case generation completed with comprehensive coverage',
      metadata: {
        test_cases_generated: 3,
        coverage_areas: 4,
        test_type: 'functional',
        execution_time: 4100,
        model_used: 'gpt-4'
      },
      executionId: execution5.id,
    },
  });

  console.log('🚀 Created comprehensive sample executions with logs');
  console.log('📊 Demo data includes:');
  console.log('   - 6 diverse prompts with variables and validation rules');
  console.log('   - 5 sample executions showcasing different scenarios');
  console.log('   - Error handling examples with retry logic');
  console.log('   - Comprehensive validation schemas for all prompt types');
  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });