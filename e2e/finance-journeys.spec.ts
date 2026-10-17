import { test, expect } from '@playwright/test';

test.describe('AI Finance Manager End-to-End User Journeys', () => {
  test('Landing page loads system diagnostics and module status', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/AI Finance Manager/);
    await expect(page.locator('h1')).toContainText('AI Finance Manager');

    // Check module cards
    await expect(page.locator('text=Frontend Client')).toBeVisible();
    await expect(page.locator('text=Backend API')).toBeVisible();
    await expect(page.locator('text=MySQL Database')).toBeVisible();
  });

  test('Guest navigation routes to login and register', async ({ page }) => {
    await page.goto('/');

    // Click register button
    const registerBtn = page.locator('a[href="/register"]').first();
    await registerBtn.click();
    await expect(page).toHaveURL(/.*register/);
    await expect(page.locator('h2')).toContainText('Create your account');

    // Click sign in link
    const signInLink = page.locator('a[href="/login"]').first();
    await signInLink.click();
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('Unauthenticated user is redirected from protected financial routes', async ({ page }) => {
    // Attempt to access dashboard without auth
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);

    // Attempt to access budgets without auth
    await page.goto('/budgets');
    await expect(page).toHaveURL(/.*login/);

    // Attempt to access goals without auth
    await page.goto('/goals');
    await expect(page).toHaveURL(/.*login/);

    // Attempt to access accounts without auth
    await page.goto('/accounts');
    await expect(page).toHaveURL(/.*login/);
  });
});
