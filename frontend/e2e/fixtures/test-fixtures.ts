import { test as base, expect, Page } from '@playwright/test';

/**
 * Test fixture data for E2E tests
 */
export const testData = {
  // Test recipe data
  recipe: {
    title: 'Test Chocolate Chip Cookies',
    description: 'Delicious homemade cookies',
    ingredients: [
      { amount: '2', unit: 'cups', name: 'flour' },
      { amount: '1', unit: 'cup', name: 'sugar' },
      { amount: '1', unit: 'cup', name: 'chocolate chips' },
      { amount: '2', unit: '', name: 'eggs' },
    ],
    instructions: [
      'Preheat oven to 375°F',
      'Mix dry ingredients',
      'Add wet ingredients',
      'Fold in chocolate chips',
      'Bake for 10-12 minutes',
    ],
    prepTime: 15,
    cookTime: 12,
    servings: 24,
  },

  // Test store data
  store: {
    name: 'Test Grocery Store',
    location: '123 Main St',
    notes: 'Open 24 hours',
  },

  // Test pantry item data
  pantryItem: {
    name: 'Milk',
    amount: '1',
    unit: 'gallon',
    location: 'fridge',
  },

  // Test collection data
  collection: {
    name: 'Test Collection',
    description: 'A test collection for E2E tests',
  },

  // Test family data
  family: {
    name: 'Test Family',
  },

  // Import URLs for recipe import tests
  recipeUrls: {
    allrecipes: 'https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/',
  },
};

/**
 * Helper functions for common test operations
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for a toast message to appear
   */
  async waitForToast(text: string | RegExp) {
    const toast = this.page.locator('[data-sonner-toast]').filter({ hasText: text });
    await expect(toast).toBeVisible({ timeout: 10000 });
    return toast;
  }

  /**
   * Dismiss any visible toasts
   */
  async dismissToasts() {
    const toasts = this.page.locator('[data-sonner-toast]');
    const count = await toasts.count();
    for (let i = 0; i < count; i++) {
      await toasts.nth(i).click();
    }
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    await this.page.waitForSelector('[class*="animate-spin"]', { state: 'hidden', timeout: 30000 });
  }

  /**
   * Open a dialog by clicking a button
   */
  async openDialog(buttonText: string | RegExp) {
    await this.page.getByRole('button', { name: buttonText }).click();
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
  }

  /**
   * Close dialog
   */
  async closeDialog() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(triggerText: string, optionText: string) {
    await this.page.getByRole('combobox').filter({ hasText: triggerText }).click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  /**
   * Navigate to a page via the header menu
   */
  async navigateTo(pageName: string) {
    // Try desktop nav first
    const desktopLink = this.page.locator('nav').getByRole('link', { name: pageName });
    if (await desktopLink.isVisible()) {
      await desktopLink.click();
    } else {
      // Use mobile menu
      await this.page.getByRole('button', { name: /menu/i }).click();
      await this.page.getByRole('link', { name: pageName }).click();
    }
    await this.waitForLoadingComplete();
  }
}

/**
 * Extended test fixture with helpers
 */
export const test = base.extend<{ helpers: TestHelpers }>({
  helpers: async ({ page }, use) => {
    await use(new TestHelpers(page));
  },
});

export { expect };
