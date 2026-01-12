import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login');

      // Check page elements
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /register/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByLabel('Email').fill('invalid@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error toast
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10000 });
    });

    test('should require email and password', async ({ page }) => {
      await page.goto('/auth/login');

      // Try to submit empty form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Form should not submit (HTML5 validation)
      await expect(page).toHaveURL('/auth/login');
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByRole('link', { name: /register/i }).click();

      await expect(page).toHaveURL('/auth/register');
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/auth/register');

      await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Confirm Password')).toBeVisible();
      await expect(page.getByText('English')).toBeVisible();
      await expect(page.getByText('Romana')).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByLabel('Email').fill('newuser@example.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('differentpassword');
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show error toast
      await expect(page.locator('[data-sonner-toast]')).toContainText(/match/i);
    });

    test('should show error for short password', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByLabel('Email').fill('newuser@example.com');
      await page.getByLabel('Password', { exact: true }).fill('short');
      await page.getByLabel('Confirm Password').fill('short');
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show error toast
      await expect(page.locator('[data-sonner-toast]')).toContainText(/8 characters/i);
    });

    test('should allow language selection', async ({ page }) => {
      await page.goto('/auth/register');

      // Select Romanian
      await page.getByLabel('Romana').check();
      await expect(page.getByLabel('Romana')).toBeChecked();

      // Select English
      await page.getByLabel('English').check();
      await expect(page.getByLabel('English')).toBeChecked();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByRole('link', { name: /sign in/i }).click();

      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // First login
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || 'testpassword123');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for redirect
      await page.waitForURL('/recipes', { timeout: 10000 });

      // Find and click logout
      // Open user menu or find logout button
      const logoutButton = page.getByRole('button', { name: /logout|sign out|deconectare/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        // Try dropdown menu
        await page.getByRole('button', { name: /settings|menu/i }).click();
        await page.getByRole('menuitem', { name: /logout|sign out|deconectare/i }).click();
      }

      // Should redirect to login
      await expect(page).toHaveURL(/auth\/login/);
    });
  });
});
