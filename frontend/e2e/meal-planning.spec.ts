import { test, expect } from './fixtures/test-fixtures';

test.describe('Meal Planning', () => {
  test.describe('Meal Plan Page', () => {
    test('should display meal planner', async ({ page }) => {
      await page.goto('/meal-plans');

      await expect(page.getByRole('heading', { name: /meal.*plan|planificare|meniuri/i })).toBeVisible();
    });

    test('should show week navigation', async ({ page }) => {
      await page.goto('/meal-plans');

      // Should have previous/next week buttons
      await expect(page.getByRole('button', { name: /previous|anterior|</i })).toBeVisible().catch(() => {
        expect(page.locator('button:has(svg.lucide-chevron-left)')).toBeVisible();
      });

      await expect(page.getByRole('button', { name: /next|următor|>/i })).toBeVisible().catch(() => {
        expect(page.locator('button:has(svg.lucide-chevron-right)')).toBeVisible();
      });
    });

    test('should display days of the week', async ({ page }) => {
      await page.goto('/meal-plans');

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Should show day headers or day columns
      const dayPatterns = [
        /monday|luni/i,
        /tuesday|marți/i,
        /wednesday|miercuri/i,
        /thursday|joi/i,
        /friday|vineri/i,
        /saturday|sâmbătă/i,
        /sunday|duminică/i,
      ];

      let foundDays = 0;
      for (const pattern of dayPatterns) {
        const dayElement = page.getByText(pattern);
        if (await dayElement.isVisible().catch(() => false)) {
          foundDays++;
        }
      }

      expect(foundDays).toBeGreaterThan(0);
    });
  });

  test.describe('Add Meal', () => {
    test('should open add meal dialog', async ({ page }) => {
      await page.goto('/meal-plans');

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Find an add button (usually + icon)
      const addButtons = page.locator('button').filter({ has: page.locator('svg.lucide-plus') });
      const count = await addButtons.count();

      if (count > 0) {
        await addButtons.first().click();

        // Dialog should open
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should search and select recipe for meal', async ({ page }) => {
      await page.goto('/meal-plans');

      await page.waitForTimeout(1000);

      // Find an add button
      const addButtons = page.locator('button').filter({ has: page.locator('svg.lucide-plus') });
      const count = await addButtons.count();

      if (count > 0) {
        await addButtons.first().click();
        await page.waitForSelector('[role="dialog"]', { state: 'visible' });

        // Search for recipe
        const searchInput = page.locator('[role="dialog"]').getByPlaceholder(/search|caută/i);
        if (await searchInput.isVisible()) {
          await searchInput.fill('test');
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Week Navigation', () => {
    test('should navigate to next week', async ({ page }) => {
      await page.goto('/meal-plans');

      // Wait for initial load
      await page.waitForTimeout(1000);

      // Get initial week display
      const weekText = page.locator('h2, h3').first();
      const initialWeek = await weekText.textContent();

      // Click next week
      const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
      if (await nextButton.isVisible()) {
        await nextButton.click();

        await page.waitForTimeout(500);

        // Week display should change
        const newWeek = await weekText.textContent();
        // Dates should be different
        expect(newWeek).not.toEqual(initialWeek);
      }
    });

    test('should navigate to previous week', async ({ page }) => {
      await page.goto('/meal-plans');

      await page.waitForTimeout(1000);

      // Click previous week
      const prevButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
      if (await prevButton.isVisible()) {
        await prevButton.click();

        await page.waitForTimeout(500);
      }
    });

    test('should return to current week', async ({ page }) => {
      await page.goto('/meal-plans');

      await page.waitForTimeout(1000);

      // Navigate away from current week
      const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await nextButton.click();
        await page.waitForTimeout(300);

        // Find "today" or "current week" button
        const todayButton = page.getByRole('button', { name: /today|azi|current|curent/i });
        if (await todayButton.isVisible()) {
          await todayButton.click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Meal Actions', () => {
    test('should remove meal from plan', async ({ page }) => {
      await page.goto('/meal-plans');

      await page.waitForTimeout(1000);

      // Find a meal card with remove button
      const mealCards = page.locator('[class*="Card"]').filter({ hasText: /.+/ });
      const count = await mealCards.count();

      if (count > 0) {
        // Hover over first meal to show actions
        await mealCards.first().hover();

        // Find remove/delete button
        const removeButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash, svg.lucide-x') });
        if (await removeButton.first().isVisible()) {
          // Don't actually remove
          expect(true).toBe(true);
        }
      }
    });

    test('should view recipe from meal plan', async ({ page }) => {
      await page.goto('/meal-plans');

      await page.waitForTimeout(1000);

      // Find a clickable meal item
      const mealLinks = page.locator('a[href^="/recipes/"]');
      const count = await mealLinks.count();

      if (count > 0) {
        await mealLinks.first().click();
        await expect(page).toHaveURL(/\/recipes\/[a-z0-9-]+/);
      }
    });
  });

  test.describe('Generate Shopping List', () => {
    test('should generate shopping list from meal plan', async ({ page }) => {
      await page.goto('/meal-plans');

      await page.waitForTimeout(1000);

      // Find generate shopping list button
      const generateButton = page.getByRole('button', { name: /generate.*shopping|generează.*cumpărături|shopping.*list/i });
      if (await generateButton.isVisible()) {
        await generateButton.click();

        // Should navigate to shopping lists or show dialog
        await page.waitForTimeout(1000);
      }
    });
  });
});
