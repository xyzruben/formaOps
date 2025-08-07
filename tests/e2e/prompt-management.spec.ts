import { test, expect } from '@playwright/test';

test.describe('Prompt Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({ 
        id: 'test-user', 
        email: 'test@example.com' 
      }));
    });

    // Mock API responses
    await page.route('/api/prompts', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            prompts: [
              {
                id: 'prompt-1',
                name: 'Welcome Message',
                template: 'Hello {{name}}, welcome to {{company}}!',
                variables: [
                  { name: 'name', type: 'string', required: true },
                  { name: 'company', type: 'string', required: true },
                ],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
            ],
          }),
        });
      }
    });

    await page.goto('/dashboard');
  });

  test('should display prompts list', async ({ page }) => {
    await expect(page.getByText('Welcome Message')).toBeVisible();
    await expect(page.getByText(/hello {{name}}/i)).toBeVisible();
  });

  test('should open create prompt modal', async ({ page }) => {
    await page.getByRole('button', { name: /create prompt/i }).click();
    
    await expect(page.getByText(/create new prompt/i)).toBeVisible();
    await expect(page.getByPlaceholder(/prompt name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your prompt template/i)).toBeVisible();
  });

  test('should create new prompt', async ({ page }) => {
    // Mock create prompt API
    await page.route('/api/prompts', async (route) => {
      if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            prompt: {
              id: 'prompt-2',
              name: body.name,
              template: body.template,
              variables: body.variables,
            },
          }),
        });
      }
    });

    await page.getByRole('button', { name: /create prompt/i }).click();
    
    // Fill form
    await page.getByPlaceholder(/prompt name/i).fill('Test Prompt');
    await page.getByPlaceholder(/enter your prompt template/i).fill('Hello {{username}}!');
    
    // Submit form
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should close modal and show success message
    await expect(page.getByText(/prompt created successfully/i)).toBeVisible();
  });

  test('should validate prompt creation form', async ({ page }) => {
    await page.getByRole('button', { name: /create prompt/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create/i }).click();
    
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/template is required/i)).toBeVisible();
  });

  test('should auto-detect variables in template', async ({ page }) => {
    await page.getByRole('button', { name: /create prompt/i }).click();
    
    await page.getByPlaceholder(/prompt name/i).fill('Variable Test');
    await page.getByPlaceholder(/enter your prompt template/i).fill('Hello {{name}}, you are {{age}} years old');
    
    // Variables should be detected automatically
    await expect(page.getByText('name')).toBeVisible();
    await expect(page.getByText('age')).toBeVisible();
  });

  test('should edit existing prompt', async ({ page }) => {
    // Mock update prompt API
    await page.route('/api/prompts/prompt-1', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            prompt: { id: 'prompt-1', name: 'Updated Welcome' },
          }),
        });
      }
    });

    // Click edit button
    await page.getByRole('button', { name: /edit/i }).first().click();
    
    // Update name
    await page.getByPlaceholder(/prompt name/i).clear();
    await page.getByPlaceholder(/prompt name/i).fill('Updated Welcome');
    
    // Submit
    await page.getByRole('button', { name: /update/i }).click();
    
    await expect(page.getByText(/prompt updated successfully/i)).toBeVisible();
  });

  test('should delete prompt', async ({ page }) => {
    // Mock delete prompt API
    await page.route('/api/prompts/prompt-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    // Click delete button
    await page.getByRole('button', { name: /delete/i }).first().click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();
    
    await expect(page.getByText(/prompt deleted successfully/i)).toBeVisible();
  });

  test('should search prompts', async ({ page }) => {
    // Mock search API
    await page.route('/api/prompts?search=welcome', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prompts: [
            {
              id: 'prompt-1',
              name: 'Welcome Message',
              template: 'Hello {{name}}, welcome to {{company}}!',
              variables: [],
            },
          ],
        }),
      });
    });

    await page.getByPlaceholder(/search prompts/i).fill('welcome');
    
    await expect(page.getByText('Welcome Message')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/prompts', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Server error',
          }),
        });
      }
    });

    await page.getByRole('button', { name: /create prompt/i }).click();
    await page.getByPlaceholder(/prompt name/i).fill('Test');
    await page.getByPlaceholder(/enter your prompt template/i).fill('Template');
    await page.getByRole('button', { name: /create/i }).click();
    
    await expect(page.getByText(/failed to create prompt/i)).toBeVisible();
  });

  test('should show loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/prompts', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, prompt: {} }),
        });
      }
    });

    await page.getByRole('button', { name: /create prompt/i }).click();
    await page.getByPlaceholder(/prompt name/i).fill('Test');
    await page.getByPlaceholder(/enter your prompt template/i).fill('Template');
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should show loading state
    await expect(page.getByText(/creating/i)).toBeVisible();
  });
});