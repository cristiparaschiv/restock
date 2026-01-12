import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Authentication setup - runs before all tests that require authentication.
 * Creates a test user if needed and saves the authentication state.
 */
setup('authenticate', async ({ page }) => {
  // Test credentials - use environment variables in CI
  const testEmail = process.env.TEST_USER_EMAIL || 'cristianv.paraschiv@gmail.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'P6c3.v00';

  // Go to login page
  await page.goto('/auth/login');

  // Try to login first
  await page.getByLabel('Email').fill(testEmail);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Check if login succeeded or if we need to register
  const response = await Promise.race([
    page.waitForURL('/recipes', { timeout: 5000 }).then(() => 'success'),
    page.waitForSelector('text=Invalid credentials', { timeout: 5000 }).then(() => 'invalid'),
  ]).catch(() => 'timeout');

  if (response !== 'success') {
    // Need to register a new account
    await page.goto('/auth/register');

    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByLabel('Confirm Password').fill(testPassword);
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for registration to complete
    await page.waitForURL('/recipes', { timeout: 10000 });
  }

  // Verify we're logged in
  await expect(page).toHaveURL('/recipes');

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
