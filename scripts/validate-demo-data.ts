#!/usr/bin/env ts-node
/* eslint-disable no-console */

/**
 * Validation script for demo data - ensures templates work with template engine
 * This script validates that all demo prompts in the seed work correctly
 */

import { templateEngine } from '../src/lib/prompts/template-engine';
import type { VariableDefinition } from '../src/types/database';

// Demo prompts data structure matching seed file
const demoPrompts = [
  {
    name: 'AI Code Reviewer',
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
        type: 'string' as const,
        required: true,
        defaultValue: 'typescript',
        options: ['typescript', 'javascript', 'python', 'go', 'rust'],
      },
      {
        name: 'code',
        type: 'string' as const,
        required: true,
        description: 'Code to review',
      },
      {
        name: 'focus_areas',
        type: 'string' as const,
        required: false,
        defaultValue: 'security, performance',
        description: 'Specific areas to focus on',
      },
    ] as VariableDefinition[],
    testInputs: {
      language: 'typescript',
      code: 'const user = { password: "123456" }; // TODO: hash passwords\nconsole.log("User:", user);',
      focus_areas: 'security, best practices',
    },
  },
  {
    name: 'Content Generator',
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
        type: 'string' as const,
        required: true,
        options: [
          'blog_post',
          'social_media',
          'email_campaign',
          'landing_page',
          'product_description',
        ],
      },
      {
        name: 'audience',
        type: 'string' as const,
        required: true,
        options: [
          'executives',
          'developers',
          'marketers',
          'general_public',
          'customers',
        ],
      },
      {
        name: 'topic',
        type: 'string' as const,
        required: true,
      },
      {
        name: 'key_messages',
        type: 'string' as const,
        required: true,
      },
      {
        name: 'tone',
        type: 'string' as const,
        required: true,
        options: [
          'professional',
          'conversational',
          'authoritative',
          'friendly',
          'technical',
        ],
        defaultValue: 'professional',
      },
      {
        name: 'word_count',
        type: 'number' as const,
        required: true,
        defaultValue: 300,
      },
      {
        name: 'brand_name',
        type: 'string' as const,
        required: true,
      },
      {
        name: 'primary_goal',
        type: 'string' as const,
        required: true,
        options: [
          'awareness',
          'engagement',
          'conversion',
          'education',
          'retention',
        ],
      },
      {
        name: 'call_to_action',
        type: 'string' as const,
        required: true,
      },
      {
        name: 'additional_context',
        type: 'string' as const,
        required: false,
      },
    ] as VariableDefinition[],
    testInputs: {
      content_type: 'blog_post',
      audience: 'developers',
      topic: 'Introduction to AI-powered development tools',
      key_messages:
        'AI tools increase productivity, reduce errors, enhance code quality',
      tone: 'conversational',
      word_count: 500,
      brand_name: 'FormaOps',
      primary_goal: 'education',
      call_to_action: 'Try FormaOps today',
      additional_context: 'Focus on practical benefits and real-world examples',
    },
  },
  {
    name: 'API Documentation Generator',
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
        type: 'string' as const,
        required: true,
        options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
      {
        name: 'endpoint_path',
        type: 'string' as const,
        required: true,
      },
      {
        name: 'description',
        type: 'string' as const,
        required: true,
      },
      {
        name: 'parameters',
        type: 'string' as const,
        required: false,
      },
      {
        name: 'request_schema',
        type: 'string' as const,
        required: false,
      },
      {
        name: 'response_schema',
        type: 'string' as const,
        required: true,
      },
      {
        name: 'error_codes',
        type: 'string' as const,
        required: true,
        defaultValue: '400, 401, 404, 500',
      },
      {
        name: 'auth_type',
        type: 'string' as const,
        required: true,
        options: ['Bearer', 'API Key', 'Basic Auth', 'OAuth', 'None'],
        defaultValue: 'Bearer',
      },
      {
        name: 'language',
        type: 'string' as const,
        required: true,
        options: ['javascript', 'python', 'curl', 'go', 'php'],
        defaultValue: 'javascript',
      },
      {
        name: 'doc_style',
        type: 'string' as const,
        required: true,
        options: ['openapi', 'markdown', 'rest', 'graphql'],
        defaultValue: 'openapi',
      },
    ] as VariableDefinition[],
    testInputs: {
      method: 'POST',
      endpoint_path: '/api/users',
      description: 'Create a new user account',
      parameters: 'None',
      request_schema:
        '{"name": "string", "email": "string", "password": "string"}',
      response_schema:
        '{"id": "string", "name": "string", "email": "string", "createdAt": "datetime"}',
      error_codes: '400, 409, 500',
      auth_type: 'Bearer',
      language: 'javascript',
      doc_style: 'openapi',
    },
  },
];

async function validateDemoData(): Promise<void> {
  console.log('🧪 Validating demo data with template engine...\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const prompt of demoPrompts) {
    console.log(`📝 Testing prompt: "${prompt.name}"`);

    try {
      // Test template processing
      const result = templateEngine.processTemplate(
        prompt.template,
        prompt.testInputs,
        prompt.variables
      );

      totalTests++;

      if (result.isValid) {
        console.log(`  ✅ Template processing: PASSED`);
        console.log(
          `  📄 Processed template length: ${result.processedTemplate.length} characters`
        );

        // Check that all variables were replaced
        const remainingVariables =
          result.processedTemplate.match(/\{\{[^}]+\}\}/g);
        if (remainingVariables) {
          console.log(
            `  ⚠️  Warning: Unreplaced variables found: ${remainingVariables.join(', ')}`
          );
        } else {
          console.log(`  🎯 All variables successfully replaced`);
        }

        passedTests++;
      } else {
        console.log(`  ❌ Template processing: FAILED`);
        console.log(
          `  🚫 Missing variables: ${result.missingVariables.join(', ')}`
        );
        failedTests++;
      }

      // Test variable validation
      console.log(`  📊 Variables defined: ${prompt.variables.length}`);
      console.log(
        `  🔧 Required variables: ${prompt.variables.filter(v => v.required).length}`
      );
      console.log(
        `  🎛️  Optional variables: ${prompt.variables.filter(v => !v.required).length}`
      );
    } catch (error) {
      console.log(
        `  💥 Error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      totalTests++;
      failedTests++;
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Validation Summary:');
  console.log(`  Total tests: ${totalTests}`);
  console.log(`  Passed: ${passedTests} ✅`);
  console.log(`  Failed: ${failedTests} ❌`);
  console.log(
    `  Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );

  if (failedTests === 0) {
    console.log('\n🎉 All demo data validation tests passed!');
    console.log('✅ Demo prompts are ready for use');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some validation tests failed');
    console.log('❌ Please review the demo data before using');
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateDemoData().catch(error => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });
}

export { validateDemoData, demoPrompts };
