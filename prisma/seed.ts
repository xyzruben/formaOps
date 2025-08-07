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
  const dataAnalysisPrompt = await prisma.prompt.create({
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

  console.log('📝 Created sample prompts');

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

  // Create a failed execution example
  await prisma.execution.create({
    data: {
      inputs: {
        email_type: 'follow-up',
        recipient: 'John Doe',
        subject: 'Following up on our meeting',
        key_points: ['Discuss project timeline', 'Review budget'],
        tone: 'professional'
      },
      status: 'FAILED',
      validationStatus: 'FAILED',
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

  console.log('🚀 Created sample executions with logs');
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