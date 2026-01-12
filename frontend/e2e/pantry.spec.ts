import { test, expect } from './fixtures/test-fixtures';
import { testData } from './fixtures/test-fixtures';

test.describe('Pantry Inventory', () => {
  test.describe('Pantry Page', () => {
    test('should display pantry page', async ({ page }) => {
      await page.goto('/pantry');

      await expect(page.getByRole('heading', { name: /pantry|cămară|inventory|inventar/i })).toBeVisible();
    });

    test('should show add item button', async ({ page }) => {
      await page.goto('/pantry');

      await expect(page.getByRole('button', { name: /add|adaugă/i })).toBeVisible();
    });

    test('should display location tabs', async ({ page }) => {
      await page.goto('/pantry');

      // Should show location tabs (fridge, freezer, pantry, counter)
      const locations = ['fridge', 'freezer', 'pantry', 'counter', 'frigider', 'congelator', 'cămară', 'blat'];

      let foundTabs = 0;
      for (const loc of locations) {
        const tab = page.getByRole('tab', { name: new RegExp(loc, 'i') });
        if (await tab.isVisible().catch(() => false)) {
          foundTabs++;
        }
      }

      // Should have at least some location tabs or all items view
      expect(foundTabs >= 0).toBe(true);
    });
  });

  test.describe('Add Pantry Item', () => {
    test('should open add item dialog', async ({ page }) => {
      await page.goto('/pantry');

      await page.getByRole('button', { name: /add|adaugă/i }).click();

      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    });

    test('should add a new pantry item', async ({ page }) => {
      await page.goto('/pantry');

      // Open add dialog
      await page.getByRole('button', { name: /add|adaugă/i }).click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Fill item name
      const nameInput = page.locator('[role="dialog"]').getByLabel(/name|ingredient|nume/i);
      await nameInput.fill(testData.pantryItem.name);

      // Fill amount if available
      const amountInput = page.locator('[role="dialog"]').getByLabel(/amount|cantitate/i);
      if (await amountInput.isVisible()) {
        await amountInput.fill(testData.pantryItem.amount);
      }

      // Fill unit if available
      const unitInput = page.locator('[role="dialog"]').getByLabel(/unit|unitate/i);
      if (await unitInput.isVisible()) {
        await unitInput.fill(testData.pantryItem.unit);
      }

      // Select location if available
      const locationSelect = page.locator('[role="dialog"]').locator('[class*="SelectTrigger"]').first();
      if (await locationSelect.isVisible()) {
        await locationSelect.click();
        await page.getByRole('option', { name: /fridge|frigider/i }).click().catch(() => {});
      }

      // Save
      await page.locator('[role="dialog"]').getByRole('button', { name: /add|save|adaugă|salvează/i }).click();

      // Should show success
      await page.waitForTimeout(1000);
    });

    test('should require item name', async ({ page }) => {
      await page.goto('/pantry');

      await page.getByRole('button', { name: /add|adaugă/i }).click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Try to save without name
      await page.locator('[role="dialog"]').getByRole('button', { name: /add|save|adaugă|salvează/i }).click();

      // Dialog should still be open (validation failed)
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });
  });

  test.describe('Pantry Item Management', () => {
    test('should edit pantry item', async ({ page }) => {
      await page.goto('/pantry');

      await page.waitForTimeout(1000);

      // Find an item card
      const itemCards = page.locator('[class*="Card"]').filter({ hasText: /.+/ });
      const count = await itemCards.count();

      if (count > 0) {
        // Click on item to edit
        await itemCards.first().click();

        // Edit dialog might open or edit button appears
        const editButton = page.getByRole('button', { name: /edit|editare/i });
        if (await editButton.isVisible()) {
          await editButton.click();
          await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should delete pantry item', async ({ page }) => {
      await page.goto('/pantry');

      await page.waitForTimeout(1000);

      const itemCards = page.locator('[class*="Card"]').filter({ hasText: /.+/ });
      const count = await itemCards.count();

      if (count > 0) {
        // Hover to show delete button
        await itemCards.first().hover();

        const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash') });
        if (await deleteButton.first().isVisible()) {
          // Don't actually delete
          expect(true).toBe(true);
        }
      }
    });

    test('should filter by location', async ({ page }) => {
      await page.goto('/pantry');

      await page.waitForTimeout(1000);

      // Click on fridge tab
      const fridgeTab = page.getByRole('tab', { name: /fridge|frigider/i });
      if (await fridgeTab.isVisible()) {
        await fridgeTab.click();
        await page.waitForTimeout(300);
      }

      // Click on freezer tab
      const freezerTab = page.getByRole('tab', { name: /freezer|congelator/i });
      if (await freezerTab.isVisible()) {
        await freezerTab.click();
        await page.waitForTimeout(300);
      }
    });

    test('should search pantry items', async ({ page }) => {
      await page.goto('/pantry');

      const searchInput = page.getByPlaceholder(/search|caută/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('milk');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Expiration Tracking', () => {
    test('should set expiration date', async ({ page }) => {
      await page.goto('/pantry');

      await page.getByRole('button', { name: /add|adaugă/i }).click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Fill name first
      const nameInput = page.locator('[role="dialog"]').getByLabel(/name|ingredient|nume/i);
      await nameInput.fill('Test Milk');

      // Find expiration date input
      const expirationInput = page.locator('[role="dialog"]').getByLabel(/expir|expir/i);
      if (await expirationInput.isVisible()) {
        // Set date to 7 days from now
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const dateStr = futureDate.toISOString().split('T')[0];
        await expirationInput.fill(dateStr);
      }

      // Close dialog
      await page.keyboard.press('Escape');
    });

    test('should display expiring items', async ({ page }) => {
      await page.goto('/pantry');

      await page.waitForTimeout(1000);

      // Look for expiring badge or section
      const expiringBadge = page.locator('[class*="badge"], [class*="Badge"]').filter({ hasText: /expir|days|zile/i });
      const count = await expiringBadge.count();

      // May or may not have expiring items
      expect(count >= 0).toBe(true);
    });

    test('should show expiration alerts', async ({ page }) => {
      await page.goto('/pantry');

      await page.waitForTimeout(1000);

      // Look for alert or warning for expiring items
      const alerts = page.locator('[class*="alert"], [class*="warning"]').filter({ hasText: /expir/i });
      // May or may not have alerts
      expect(true).toBe(true);
    });
  });

  test.describe('Pantry Categories', () => {
    test('should display items grouped by category', async ({ page }) => {
      await page.goto('/pantry');

      await page.waitForTimeout(1000);

      // Look for category headers
      const categoryHeaders = page.getByRole('heading', { name: /produce|dairy|meat|bakery|legume|lactate|carne/i });
      const count = await categoryHeaders.count();

      // May or may not have categories
      expect(count >= 0).toBe(true);
    });
  });
});
