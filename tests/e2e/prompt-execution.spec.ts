import { test, expect } from '@playwright/test';

test.describe('Prompt Execution Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-user',
        JSON.stringify({
          id: 'test-user',
          email: 'test@example.com',
        })
      );
    });

    // Mock prompts API
    await page.route('/api/prompts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prompts: [
            {
              id: 'prompt-1',
              name: 'Greeting Generator',
              template:
                'Create a {{tone}} greeting for {{name}} who works at {{company}}.',
              variables: [
                { name: 'tone', type: 'string', required: true },
                { name: 'name', type: 'string', required: true },
                { name: 'company', type: 'string', required: true },
              ],
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');
  });

  test('should open execution modal', async ({ page }) => {
    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    await expect(page.getByText(/execute prompt/i)).toBeVisible();
    await expect(page.getByText('Greeting Generator')).toBeVisible();
  });

  test('should display input fields for variables', async ({ page }) => {
    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    // Should show input fields for all variables
    await expect(page.getByPlaceholder(/tone/i)).toBeVisible();
    await expect(page.getByPlaceholder(/name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/company/i)).toBeVisible();
  });

  test('should validate required inputs', async ({ page }) => {
    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    // Try to execute without filling inputs
    await page.getByRole('button', { name: /execute prompt/i }).click();

    await expect(page.getByText(/tone is required/i)).toBeVisible();
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/company is required/i)).toBeVisible();
  });

  test('should execute prompt successfully', async ({ page }) => {
    // Mock execution API
    await page.route('/api/executions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          execution: {
            id: 'exec-1',
            result:
              "Hello John! We're delighted to have you at TechCorp. Your friendly demeanor and expertise make you a valuable addition to our team.",
            tokenUsage: { input: 25, output: 35, total: 60 },
            costUsd: 0.0002,
            latencyMs: 1200,
          },
        }),
      });
    });

    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    // Fill inputs
    await page.getByPlaceholder(/tone/i).fill('friendly');
    await page.getByPlaceholder(/name/i).fill('John');
    await page.getByPlaceholder(/company/i).fill('TechCorp');

    // Execute
    await page.getByRole('button', { name: /execute prompt/i }).click();

    // Should show result
    await expect(page.getByText(/hello john/i)).toBeVisible();
    await expect(page.getByText(/tokens: 60/i)).toBeVisible();
    await expect(page.getByText(/cost: \$0\.0002/i)).toBeVisible();
    await expect(page.getByText(/latency: 1\.2s/i)).toBeVisible();
  });

  test('should show loading state during execution', async ({ page }) => {
    // Mock slow execution
    await page.route('/api/executions', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          execution: { result: 'Test result' },
        }),
      });
    });

    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    await page.getByPlaceholder(/tone/i).fill('friendly');
    await page.getByPlaceholder(/name/i).fill('John');
    await page.getByPlaceholder(/company/i).fill('TechCorp');
    await page.getByRole('button', { name: /execute prompt/i }).click();

    // Should show loading state
    await expect(page.getByText(/executing/i)).toBeVisible();
    await expect(page.getByRole('button')).toBeDisabled();
  });

  test('should handle execution errors', async ({ page }) => {
    // Mock API error
    await page.route('/api/executions', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'AI service unavailable',
        }),
      });
    });

    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    await page.getByPlaceholder(/tone/i).fill('friendly');
    await page.getByPlaceholder(/name/i).fill('John');
    await page.getByPlaceholder(/company/i).fill('TechCorp');
    await page.getByRole('button', { name: /execute prompt/i }).click();

    await expect(page.getByText(/ai service unavailable/i)).toBeVisible();
  });

  test('should allow model selection', async ({ page }) => {
    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    // Should have model selector
    await expect(page.getByRole('combobox', { name: /model/i })).toBeVisible();

    // Select different model
    await page.getByRole('combobox', { name: /model/i }).click();
    await page.getByRole('option', { name: /gpt-4/i }).click();

    await expect(page.getByRole('combobox', { name: /model/i })).toHaveValue(
      'gpt-4'
    );
  });

  test('should copy result to clipboard', async ({ page }) => {
    // Mock execution API
    await page.route('/api/executions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          execution: {
            result: 'Test result for copying',
          },
        }),
      });
    });

    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();
    await page.getByPlaceholder(/tone/i).fill('friendly');
    await page.getByPlaceholder(/name/i).fill('John');
    await page.getByPlaceholder(/company/i).fill('TechCorp');
    await page.getByRole('button', { name: /execute prompt/i }).click();

    // Wait for result
    await expect(page.getByText(/test result for copying/i)).toBeVisible();

    // Click copy button
    await page.getByRole('button', { name: /copy/i }).click();

    await expect(page.getByText(/copied to clipboard/i)).toBeVisible();
  });

  test('should show execution history', async ({ page }) => {
    // Mock executions API
    await page.route('/api/prompts/prompt-1/executions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          executions: [
            {
              id: 'exec-1',
              result: 'Previous execution result',
              createdAt: '2024-01-01T12:00:00.000Z',
              tokenUsage: { total: 50 },
              costUsd: 0.0001,
            },
          ],
        }),
      });
    });

    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();
    await page.getByRole('tab', { name: /history/i }).click();

    await expect(page.getByText(/previous execution result/i)).toBeVisible();
    await expect(page.getByText(/jan 1, 2024/i)).toBeVisible();
  });

  test('should handle rate limiting', async ({ page }) => {
    // Mock rate limit error
    await page.route('/api/executions', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error:
            'Rate limit exceeded. Please wait before making another request.',
        }),
      });
    });

    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();
    await page.getByPlaceholder(/tone/i).fill('friendly');
    await page.getByPlaceholder(/name/i).fill('John');
    await page.getByPlaceholder(/company/i).fill('TechCorp');
    await page.getByRole('button', { name: /execute prompt/i }).click();

    await expect(page.getByText(/rate limit exceeded/i)).toBeVisible();
  });

  test('should validate input types', async ({ page }) => {
    // Mock prompt with number variable
    await page.route('/api/prompts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prompts: [
            {
              id: 'prompt-1',
              name: 'Age Calculator',
              template: 'You are {{age}} years old',
              variables: [{ name: 'age', type: 'number', required: true }],
            },
          ],
        }),
      });
    });

    await page.reload();
    await page
      .getByRole('button', { name: /execute/i })
      .first()
      .click();

    // Enter non-numeric value for number field
    await page.getByPlaceholder(/age/i).fill('not a number');
    await page.getByRole('button', { name: /execute prompt/i }).click();

    await expect(page.getByText(/age must be a number/i)).toBeVisible();
  });
});
