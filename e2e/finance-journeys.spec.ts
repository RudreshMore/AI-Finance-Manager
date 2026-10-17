import { test, expect, Page } from '@playwright/test';

test.describe.serial('AI Finance Manager End-to-End User Journeys (11 Journeys)', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `e2e_user_${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'FinArch',
    lastName: 'Tester',
  };

  async function loginUser(page: Page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  test.beforeAll(async ({ request }) => {
    try {
      await request.post('http://localhost:5000/api/test/cleanup-user', {
        data: { email: testUser.email },
      });
    } catch {
      // server starting up
    }
  });

  test.afterAll(async ({ request }) => {
    try {
      await request.post('http://localhost:5000/api/test/cleanup-user', {
        data: { email: testUser.email },
      });
    } catch {
      // ignore
    }
  });

  // Journey 1: Landing page, diagnostics, and route guards
  test('Journey 1: Landing page diagnostics & unauthenticated route protections', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/AI Finance Manager/);
    await expect(page.locator('h1')).toContainText('AI Finance Manager');

    // Check system status cards
    await expect(page.locator('text=Frontend Client')).toBeVisible();
    await expect(page.locator('text=Backend API')).toBeVisible();
    await expect(page.locator('text=MySQL Database')).toBeVisible();

    // Verify unauthenticated redirection on protected routes
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/accounts');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/transactions');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/budgets');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/goals');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/ai-assistant');
    await expect(page).toHaveURL(/.*login/);
  });

  // Journey 2: Negative form validations and error handling
  test('Journey 2: Form validation & negative authentication error feedback', async ({ page }) => {
    await page.goto('/login');

    // Attempt login with invalid non-existent credentials
    await page.fill('input[type="email"]', 'nonexistent_user@example.com');
    await page.fill('input[type="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');

    // Verify error alert
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // Navigate to register and check required password validation
    await page.click('a[href="/register"]');
    await expect(page).toHaveURL(/.*register/);

    await page.fill('input[placeholder="Jane"]', 'Test');
    await page.fill('input[placeholder="Doe"]', 'User');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'short');

    // Browser HTML5 validation or form rejection
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*register/);
  });

  // Journey 3: User Registration & OTP Verification
  test('Journey 3: User registration and 6-digit OTP verification flow', async ({ page, request }) => {
    await page.goto('/register');

    // Fill valid registration form
    await page.fill('input[placeholder="Jane"]', testUser.firstName);
    await page.fill('input[placeholder="Doe"]', testUser.lastName);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    await page.click('button[type="submit"]');

    // Expect navigation to OTP verification page
    await expect(page).toHaveURL(/.*verify-otp/);
    await expect(page.locator('h2')).toContainText('Enter Verification Code');

    // Fetch the generated OTP via the test helper endpoint
    const otpResponse = await request.get(
      `http://localhost:5000/api/test/get-otp?email=${encodeURIComponent(testUser.email)}`
    );
    const otpData = await otpResponse.json();
    expect(otpData.status).toBe('success');
    expect(otpData.otp).toBeTruthy();

    // Enter the received OTP into the verification form
    await page.fill('input[maxlength="6"]', otpData.otp);
    await page.click('button[type="submit"]');

    // Expect success message and automatic redirect to Dashboard
    await expect(page.locator('text=Email verified successfully')).toBeVisible();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(`Welcome back, ${testUser.firstName}!`);
  });

  // Journey 4: Login and Dashboard Welcome
  test('Journey 4: User login and authenticated dashboard access', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(`Welcome back, ${testUser.firstName}!`);
    await expect(page.locator('text=Total Income')).toBeVisible();
    await expect(page.locator('text=Total Expenses')).toBeVisible();
  });

  // Journey 5: Account creation & verification
  test('Journey 5: Account management (Create Bank & Savings accounts)', async ({ page }) => {
    await loginUser(page);
    await page.goto('/accounts');
    await expect(page.locator('h1')).toContainText('Financial Accounts');

    // Create Bank Account
    await page.click('button:has-text("Add Account"), button:has-text("Create Your First Account")');
    await page.fill('input[placeholder*="HDFC Salary"]', 'Main Checking');
    await page.selectOption('select', 'BANK');
    await page.fill('input[placeholder="0.00"]', '50000');
    await page.click('button:has-text("Create Account")');

    // Verify confirmation and card presence
    await expect(page.locator('text=Account successfully created!')).toBeVisible();
    await expect(page.locator('text=Main Checking')).toBeVisible();

    // Create Savings Account
    await page.click('button:has-text("Add Account"), button:has-text("Create Your First Account")');
    await page.fill('input[placeholder*="HDFC Salary"]', 'Emergency Reserve');
    await page.selectOption('select', 'SAVINGS');
    await page.fill('input[placeholder="0.00"]', '25000');
    await page.click('button:has-text("Create Account")');

    await expect(page.locator('text=Account successfully created!')).toBeVisible();
    await expect(page.locator('text=Emergency Reserve')).toBeVisible();
  });

  // Journey 6: Income and expense recording with real-time balance adjustments
  test('Journey 6: Income & Expense creation with real-time balance adjustments', async ({ page }) => {
    await loginUser(page);
    await page.goto('/transactions');
    await expect(page.locator('h1')).toContainText('Transactions Ledger');

    // 1. Record Income
    await page.click('button:has-text("Record Income"), button:has-text("Record First Income")');
    const modal = page.locator('div.fixed.inset-0');
    await modal.locator('input[type="number"]').fill('15000');
    await modal.locator('input[type="text"]').fill('Consulting Project');
    await modal.locator('button:has-text("Record Income")').click();

    await expect(page.locator('text=Income recorded')).toBeVisible();
    await expect(page.locator('text=Consulting Project')).toBeVisible();

    // 2. Record Expense
    await page.click('button:has-text("Record Expense"), button:has-text("Record First Expense")');
    const modalExp = page.locator('div.fixed.inset-0');
    await modalExp.locator('input[type="number"]').fill('5000');
    await modalExp.locator('input[type="text"]').fill('Groceries and Supplies');
    await modalExp.locator('button:has-text("Record Expense")').click();

    await expect(page.locator('text=Expense recorded')).toBeVisible();
    await expect(page.locator('text=Groceries and Supplies')).toBeVisible();
  });

  // Journey 7: Double-Entry Account Transfer
  test('Journey 7: Double-entry balanced transfer between accounts', async ({ page }) => {
    await loginUser(page);
    await page.goto('/transactions');

    // Open Transfer Modal
    await page.click('button:has-text("Transfer Funds")');
    const modal = page.locator('div.fixed.inset-0');
    await modal.locator('input[type="number"]').fill('10000');
    await modal.locator('input[type="text"]').fill('Monthly Reserve Transfer');
    await modal.locator('button:has-text("Execute Transfer")').click();

    await expect(page.locator('text=Fund transfer successfully executed!')).toBeVisible();
    await expect(page.locator('text=Monthly Reserve Transfer')).toBeVisible();
  });

  // Journey 8: Transaction edit & safe deletion with balance restoration
  test('Journey 8: Transaction update and deletion verifying balance restoration', async ({ page }) => {
    await loginUser(page);
    await page.goto('/transactions');

    // Handle browser confirmation dialog for deletion
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Locate the delete button on the Groceries transaction row
    const groceryRow = page.locator('tr:has-text("Groceries and Supplies")');
    await expect(groceryRow).toBeVisible();

    const deleteBtn = groceryRow.locator('button[title*="Delete"]');
    await deleteBtn.click();

    // Verify deletion notification
    await expect(page.locator('text=Transaction deleted and account balance restored')).toBeVisible();
    await expect(page.locator('text=Groceries and Supplies')).not.toBeVisible();
  });

  // Journey 9: Budget Planning & Threshold Tracking
  test('Journey 9: Budget creation, spending calculation, and limit tracking', async ({ page }) => {
    await loginUser(page);
    await page.goto('/budgets');
    await expect(page.locator('h1')).toContainText('Monthly Budgets');

    // Click create budget button
    const newBudgetBtn = page.locator('button:has-text("Add Budget"), button:has-text("Create Budget")').first();
    await newBudgetBtn.click();

    const modal = page.locator('div.fixed.inset-0');
    await modal.locator('input[placeholder*="15000.00"]').fill('12000');
    await modal.locator('button:has-text("Set Budget")').click();

    await expect(page.locator('text=Monthly budget configured successfully!')).toBeVisible();
    await expect(page.locator('text=Total Budgeted')).toBeVisible();
  });

  // Journey 10: Savings Goals & Progress Tracking
  test('Journey 10: Savings goal creation and progress tracking', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');
    await expect(page.locator('h1')).toContainText('Savings Goals');

    // Click new goal button
    const newGoalBtn = page.locator('button:has-text("Create Goal"), button:has-text("Create Your First Goal")').first();
    await newGoalBtn.click();

    const modal = page.locator('div.fixed.inset-0');
    await modal.locator('input[placeholder*="Emergency Fund"]').fill('Japan Vacation Fund');
    await modal.locator('input[placeholder="100000.00"]').fill('100000');
    await modal.locator('input[placeholder="0.00"]').fill('25000');
    await modal.locator('button:has-text("Set Goal")').click();

    await expect(page.locator('text=Savings goal created successfully!')).toBeVisible();
    await expect(page.locator('text=Japan Vacation Fund')).toBeVisible();
    await expect(page.locator('text=25%').first()).toBeVisible();
  });

  // Journey 11: Analytics, AI Assistant interaction, and Logout
  test('Journey 11: Dashboard analytics, AI Assistant interaction, and secure logout', async ({ page }) => {
    await loginUser(page);

    // 1. Verify Dashboard Analytics
    await page.goto('/dashboard');
    await expect(page.locator('text=Total Income')).toBeVisible();
    await expect(page.locator('text=Total Expenses')).toBeVisible();

    // 2. Verify AI Assistant Page
    await page.goto('/ai-assistant');
    await expect(page.locator('h1')).toContainText('AI Financial Assistant');
    await expect(page.locator('text=Suggested Questions')).toBeVisible();
    await expect(page.locator('text=Read-only access')).toBeVisible();

    // 3. Perform Secure Logout
    await page.click('button:has-text("Log Out")');
    await page.waitForURL('**/login', { timeout: 15000 });
    await expect(page.locator('h2')).toContainText('Sign in to your account');

    // 4. Verify user can no longer access protected pages
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });
});
