import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login modal when sign in clicked', async ({ page }) => {
    // Check sign in button on homepage
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Click to open modal
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Check modal content
    await expect(page.getByText('Sign In to FormaOps')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sign In' }).last()
    ).toBeVisible();
  });

  test('should validate required form fields', async ({ page }) => {
    // Open login modal
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for modal to open
    await expect(page.getByText('Sign In to FormaOps')).toBeVisible();

    // Try to submit empty form - use more specific selector for the modal submit button
    await page.getByRole('button', { name: 'Sign In' }).last().click();

    // Check validation messages
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Sign In to FormaOps')).toBeVisible();

    // Fill invalid email format
    await page.getByPlaceholder('Email').fill('invalid-email');
    await page.getByPlaceholder('Password').fill('password123');

    // Remove the type="email" attribute to bypass HTML5 validation
    await page.getByPlaceholder('Email').evaluate((input: any) => {
      input.setAttribute('type', 'text');
    });

    await page.getByRole('button', { name: 'Sign In' }).last().click();

    // React Hook Form validation should trigger
    await expect(page.getByText('Invalid email format')).toBeVisible();
  });

  test('should validate password length', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Sign In to FormaOps')).toBeVisible();

    // Fill short password
    await page.getByPlaceholder('Email').fill('test@example.com');
    await page.getByPlaceholder('Password').fill('123');
    await page.getByRole('button', { name: 'Sign In' }).last().click();

    await expect(
      page.getByText('Password must be at least 6 characters')
    ).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Sign In to FormaOps')).toBeVisible();

    await page.getByPlaceholder('Email').fill('test@example.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).last().click();

    // Wait for error in error box - use more specific selector
    await expect(page.locator('.bg-destructive\\/10')).toBeVisible();
    // Should show the correct invalid credentials error message
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Mock prompts API for dashboard after login
    await page.route('/api/prompts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prompts: [],
        }),
      });
    });

    // Mock execution API to prevent auth errors
    await page.route('/api/prompts/*/execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // In test mode, the AuthContext uses testAuthManager
    // Any credentials work EXCEPT test@example.com/wrongpassword
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Sign In to FormaOps')).toBeVisible();

    await page.getByPlaceholder('Email').fill('user@test.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).last().click();

    // Should redirect to dashboard and show both welcome messages
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Welcome to FormaOps')).toBeVisible();
    await expect(page.getByText('Welcome back, user@test.com!')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Set authenticated state in context
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-user',
        JSON.stringify({
          id: 'test-user',
          email: 'test@example.com',
        })
      );
    });

    // Mock APIs before navigation to prevent auth errors
    await page.route('/api/prompts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prompts: [],
        }),
      });
    });

    await page.route('/api/prompts/*/execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/dashboard');

    // Mock logout API
    await page.route('/api/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // More specific logout button selector to avoid modal interference from Enhanced Panel
    await page.getByRole('button', { name: 'Logout' }).first().click();

    // Should redirect to home (may include auth=required parameter)
    await expect(page).toHaveURL(
      /^http:\/\/localhost:3000\/(\?auth=required)?$/
    );
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should redirect unauthenticated users from dashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Should redirect to home with auth message
    await expect(page).toHaveURL('/?auth=required');
    await expect(
      page.getByText('Please sign in to access the dashboard')
    ).toBeVisible();
  });

  test('should persist login state across page reloads', async ({ page }) => {
    // Set authenticated state
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-user',
        JSON.stringify({
          id: 'test-user',
          email: 'test@example.com',
        })
      );
    });

    // Mock APIs to prevent auth errors
    await page.route('/api/prompts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prompts: [],
        }),
      });
    });

    await page.route('/api/prompts/*/execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/dashboard');
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Welcome to FormaOps')).toBeVisible();
    await expect(
      page.getByText('Welcome back, test@example.com!')
    ).toBeVisible();
  });
});
