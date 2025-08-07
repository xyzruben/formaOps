import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should validate login form fields', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Mock successful login
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'test-user', email: 'test@example.com' },
        }),
      });
    });

    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Mock login state
    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({ 
        id: 'test-user', 
        email: 'test@example.com' 
      }));
    });

    await page.goto('/dashboard');
    
    // Mock logout
    await page.route('/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByRole('button', { name: /logout/i }).click();
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/please sign in/i)).toBeVisible();
  });

  test('should persist login state across page reloads', async ({ page }) => {
    // Mock authenticated state
    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({ 
        id: 'test-user', 
        email: 'test@example.com' 
      }));
    });

    await page.goto('/dashboard');
    await page.reload();
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });
});