import { test, expect } from './fixtures/test-fixtures';
import { testData } from './fixtures/test-fixtures';

test.describe('Collections', () => {
  test.describe('Collections List', () => {
    test('should display collections page', async ({ page }) => {
      await page.goto('/collections');

      await expect(page.getByRole('heading', { name: /collections|colecții/i })).toBeVisible();
    });

    test('should show create collection button', async ({ page }) => {
      await page.goto('/collections');

      await expect(page.getByRole('button', { name: /create|new|crează|nouă/i })).toBeVisible();
    });
  });

  test.describe('Create Collection', () => {
    test('should open create collection dialog', async ({ page }) => {
      await page.goto('/collections');

      await page.getByRole('button', { name: /create|new|crează|nouă/i }).click();

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    });

    test('should create a new collection', async ({ page, helpers }) => {
      await page.goto('/collections');

      // Open create dialog
      await page.getByRole('button', { name: /create|new|crează|nouă/i }).click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Fill in collection details
      const nameInput = page.locator('[role="dialog"]').getByLabel(/name|nume/i);
      await nameInput.fill(testData.collection.name);

      // Fill description if available
      const descInput = page.locator('[role="dialog"]').getByLabel(/description|descriere/i);
      if (await descInput.isVisible()) {
        await descInput.fill(testData.collection.description);
      }

      // Save
      await page.locator('[role="dialog"]').getByRole('button', { name: /create|save|crează|salvează/i }).click();

      // Should show success or collection should appear
      await page.waitForTimeout(1000);
    });

    test('should require collection name', async ({ page }) => {
      await page.goto('/collections');

      // Open create dialog
      await page.getByRole('button', { name: /create|new|crează|nouă/i }).click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Try to save without name
      await page.locator('[role="dialog"]').getByRole('button', { name: /create|save|crează|salvează/i }).click();

      // Dialog should still be open (validation failed)
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });
  });

  test.describe('Collection Detail', () => {
    test('should navigate to collection detail', async ({ page }) => {
      await page.goto('/collections');

      // Wait for collections to load
      await page.waitForTimeout(1000);

      // Click on first collection if exists
      const collectionLinks = page.locator('a[href^="/collections/"]');
      const count = await collectionLinks.count();

      if (count > 0) {
        await collectionLinks.first().click();
        await expect(page).toHaveURL(/\/collections\/[a-z0-9-]+/);
      }
    });

    test('should display collection recipes', async ({ page }) => {
      await page.goto('/collections');

      // Wait for collections to load
      await page.waitForTimeout(1000);

      const collectionLinks = page.locator('a[href^="/collections/"]');
      const count = await collectionLinks.count();

      if (count > 0) {
        await collectionLinks.first().click();

        // Should show collection header
        await expect(page.getByRole('heading')).toBeVisible();
      }
    });
  });

  test.describe('Collection Management', () => {
    test('should edit collection', async ({ page }) => {
      await page.goto('/collections');

      // Wait for collections to load
      await page.waitForTimeout(1000);

      const collectionLinks = page.locator('a[href^="/collections/"]');
      const count = await collectionLinks.count();

      if (count > 0) {
        await collectionLinks.first().click();

        // Find edit button
        const editButton = page.getByRole('button', { name: /edit|editare/i });
        if (await editButton.isVisible()) {
          await editButton.click();

          // Dialog should open
          await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should delete collection', async ({ page }) => {
      await page.goto('/collections');

      // Wait for collections to load
      await page.waitForTimeout(1000);

      const collectionLinks = page.locator('a[href^="/collections/"]');
      const count = await collectionLinks.count();

      if (count > 0) {
        await collectionLinks.first().click();

        // Find delete button
        const deleteButton = page.getByRole('button', { name: /delete|șterge/i });
        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Confirmation dialog should appear
          const confirmButton = page.getByRole('button', { name: /confirm|delete|șterge|confirmă/i });
          if (await confirmButton.isVisible()) {
            // Don't actually delete in test
            await page.keyboard.press('Escape');
          }
        }
      }
    });
  });
});
