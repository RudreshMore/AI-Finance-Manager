import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { generateAccessToken } from '../utils/jwt';
import { Role } from '@prisma/client';

const runPhase4Tests = async () => {
  console.log('🧪 Starting Phase 4: Budgets, Goals & Analytics Integration Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, extra?: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${extra ? ` -> ${extra}` : ''}`);
      failed++;
    }
  };

  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;

  let expenseCategoryA: any;
  let incomeCategoryA: any;
  let accountA: any;
  let accountB: any;

  let createdBudgetId: string;
  let createdGoalId: string;

  const currentYear = new Date().getUTCFullYear();
  const currentMonth = new Date().getUTCMonth() + 1; // 1-12

  try {
    // 1. Setup test users
    userA = await prisma.user.create({
      data: {
        email: `p4test_a_${Date.now()}@example.com`,
        firstName: 'Alice',
        lastName: 'Finance',
        passwordHash: 'dummy',
        role: Role.USER,
        isVerified: true,
      },
    });
    tokenA = generateAccessToken({ userId: userA.id, email: userA.email, role: userA.role });

    userB = await prisma.user.create({
      data: {
        email: `p4test_b_${Date.now()}@example.com`,
        firstName: 'Bob',
        lastName: 'Budget',
        passwordHash: 'dummy',
        role: Role.USER,
        isVerified: true,
      },
    });
    tokenB = generateAccessToken({ userId: userB.id, email: userB.email, role: userB.role });

    // 2. Setup accounts
    accountA = await prisma.account.create({
      data: {
        userId: userA.id,
        name: `HDFC Checking ${Date.now()}`,
        type: 'BANK',
        balance: 100000.0,
        currency: 'INR',
      },
    });

    accountB = await prisma.account.create({
      data: {
        userId: userA.id,
        name: `Savings Reserve ${Date.now()}`,
        type: 'SAVINGS',
        balance: 50000.0,
        currency: 'INR',
      },
    });

    // 3. Setup categories
    expenseCategoryA = await prisma.category.create({
      data: {
        userId: userA.id,
        name: `Dining Out ${Date.now()}`,
        type: 'EXPENSE',
      },
    });

    incomeCategoryA = await prisma.category.create({
      data: {
        userId: userA.id,
        name: `Consulting ${Date.now()}`,
        type: 'INCOME',
      },
    });

    // ==========================================
    // 1. BUDGET MANAGEMENT TESTS
    // ==========================================
    console.log('--- Testing Budget Management ---');

    // Test 1: Create budget for expense category
    const createBudgetRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        categoryId: expenseCategoryA.id,
        amount: 10000.0,
        month: currentMonth,
        year: currentYear,
      });

    assert(
      createBudgetRes.status === 201 &&
        createBudgetRes.body.data.amount === '10000.00' &&
        createBudgetRes.body.data.spent === '0.00' &&
        createBudgetRes.body.data.remaining === '10000.00' &&
        createBudgetRes.body.data.status === 'ON_TRACK',
      'Create monthly category budget for EXPENSE category',
      JSON.stringify(createBudgetRes.body)
    );
    createdBudgetId = createBudgetRes.body.data.id;

    // Test 2: Reject creating budget for INCOME category
    const rejectIncomeBudget = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        categoryId: incomeCategoryA.id,
        amount: 5000.0,
        month: currentMonth,
        year: currentYear,
      });

    assert(
      rejectIncomeBudget.status === 400,
      'Reject creating budget for INCOME category with 400 Bad Request'
    );

    // Test 3: Reject duplicate budget for same user, category, month, year
    const rejectDuplicateBudget = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        categoryId: expenseCategoryA.id,
        amount: 12000.0,
        month: currentMonth,
        year: currentYear,
      });

    assert(
      rejectDuplicateBudget.status === 409,
      'Reject duplicate budget for same category/month/year with 409 Conflict'
    );

    // Test 4: Record expense and check dynamic spending and status
    const expenseTx = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        accountId: accountA.id,
        categoryId: expenseCategoryA.id,
        type: 'EXPENSE',
        amount: 8500.0,
        description: 'Team Dinner',
        transactionDate: new Date().toISOString(),
      });

    const expenseTxId = expenseTx.body.data.transaction.id;

    const budgetWithSpent = await request(app)
      .get(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(
      budgetWithSpent.status === 200 &&
        budgetWithSpent.body.data.spent === '8500.00' &&
        budgetWithSpent.body.data.remaining === '1500.00' &&
        budgetWithSpent.body.data.utilizationPercent === 85 &&
        budgetWithSpent.body.data.status === 'APPROACHING',
      'Calculate dynamic spending and status APPROACHING (>= 80% utilization)',
      JSON.stringify(budgetWithSpent.body)
    );

    // Test 5: Increase transaction amount to exceed budget (EXCEEDED)
    await request(app)
      .put(`/api/transactions/${expenseTxId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 11000.0 });

    const budgetExceeded = await request(app)
      .get(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(
      budgetExceeded.status === 200 &&
        budgetExceeded.body.data.spent === '11000.00' &&
        budgetExceeded.body.data.remaining === '-1000.00' &&
        budgetExceeded.body.data.status === 'EXCEEDED',
      'Detect budget EXCEEDED (> 100% utilization) and negative remaining amount',
      JSON.stringify(budgetExceeded.body)
    );

    // Test 6: Delete transaction and verify budget reverts dynamically
    await request(app)
      .delete(`/api/transactions/${expenseTxId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    const budgetReverted = await request(app)
      .get(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(
      budgetReverted.status === 200 &&
        budgetReverted.body.data.spent === '0.00' &&
        budgetReverted.body.data.remaining === '10000.00' &&
        budgetReverted.body.data.status === 'ON_TRACK',
      'Transaction deletion dynamically reverts budget spending without storing stale sums',
      JSON.stringify(budgetReverted.body)
    );

    // Test 7: Income and transfers excluded from budget spending
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        accountId: accountA.id,
        categoryId: incomeCategoryA.id,
        type: 'INCOME',
        amount: 25000.0,
      });

    await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fromAccountId: accountA.id,
        toAccountId: accountB.id,
        amount: 5000.0,
      });

    const budgetAfterIncome = await request(app)
      .get(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(
      budgetAfterIncome.body.data.spent === '0.00',
      'Income and Transfers are strictly excluded from budget spending totals'
    );

    // Test 8: Cross-user isolation on budgets
    const userBAccessBudget = await request(app)
      .get(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(
      userBAccessBudget.status === 404,
      'Cross-user data isolation: User B cannot view User A budget (404)'
    );

    // Test 9: Update budget amount
    const updateBudgetRes = await request(app)
      .put(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 15000.0 });

    assert(
      updateBudgetRes.status === 200 && updateBudgetRes.body.data.amount === '15000.00',
      'Update budget amount successfully'
    );

    // Test 10: Delete budget
    const deleteBudgetRes = await request(app)
      .delete(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(deleteBudgetRes.status === 200, 'Delete budget successfully with 200 OK');

    // ==========================================
    // 2. SAVINGS GOALS TESTS
    // ==========================================
    console.log('\n--- Testing Savings Goals ---');

    // Test 11: Create savings goal with future target date
    const targetDate = new Date(Date.UTC(currentYear, currentMonth + 5, 1));
    const createGoalRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'New Car Downpayment',
        targetAmount: 300000.0,
        currentAmount: 60000.0,
        targetDate: targetDate.toISOString().split('T')[0],
      });

    assert(
      createGoalRes.status === 201 &&
        createGoalRes.body.data.targetAmount === '300000.00' &&
        createGoalRes.body.data.currentAmount === '60000.00' &&
        createGoalRes.body.data.remainingAmount === '240000.00' &&
        createGoalRes.body.data.progressPercent === 20 &&
        createGoalRes.body.data.status === 'ACTIVE' &&
        createGoalRes.body.data.monthlySavingsNeeded !== null,
      'Create savings goal with target date and compute required monthly savings',
      JSON.stringify(createGoalRes.body)
    );
    createdGoalId = createGoalRes.body.data.id;

    // Test 12: Reject invalid goal amounts
    const rejectNegTarget = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Bad Goal', targetAmount: -500 });

    const rejectOverfundedCreation = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Bad Goal', targetAmount: 1000, currentAmount: 1500 });

    assert(
      rejectNegTarget.status === 400 && rejectOverfundedCreation.status === 400,
      'Reject negative target amounts and current amount exceeding target upon creation'
    );

    // Test 13: Update goal progress and verify complete separation from bank balance
    const bankBalanceBefore = (await prisma.account.findUnique({ where: { id: accountA.id } }))?.balance;

    const updateGoalRes = await request(app)
      .put(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ currentAmount: 150000.0 });

    const bankBalanceAfter = (await prisma.account.findUnique({ where: { id: accountA.id } }))?.balance;

    assert(
      updateGoalRes.status === 200 &&
        updateGoalRes.body.data.currentAmount === '150000.00' &&
        updateGoalRes.body.data.progressPercent === 50 &&
        bankBalanceBefore?.toString() === bankBalanceAfter?.toString(),
      'Update goal current savings without altering bank account balances',
      `Bank before: ${bankBalanceBefore}, after: ${bankBalanceAfter}`
    );

    // Test 14: Reaching target completes goal
    const completeGoalRes = await request(app)
      .put(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ currentAmount: 300000.0 });

    assert(
      completeGoalRes.status === 200 &&
        completeGoalRes.body.data.isCompleted === true &&
        completeGoalRes.body.data.status === 'COMPLETED' &&
        completeGoalRes.body.data.remainingAmount === '0.00' &&
        completeGoalRes.body.data.monthlySavingsNeeded === '0.00',
      'Reaching 100% of target automatically marks goal COMPLETED with zero monthly savings needed'
    );

    // Test 15: Overdue goal detection
    const pastDate = new Date(Date.UTC(2022, 5, 1));
    const overdueGoalRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Past Holiday 2022',
        targetAmount: 50000.0,
        currentAmount: 10000.0,
        targetDate: pastDate.toISOString().split('T')[0],
      });

    assert(
      overdueGoalRes.status === 201 && overdueGoalRes.body.data.status === 'OVERDUE',
      'Identify uncompleted goals past their target date as OVERDUE'
    );

    // Test 16: Cross-user isolation on goals
    const userBAccessGoal = await request(app)
      .get(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(userBAccessGoal.status === 404, 'Cross-user data isolation: User B cannot access User A goal');

    // ==========================================
    // 3. FINANCIAL ANALYTICS TESTS
    // ==========================================
    console.log('\n--- Testing Financial Analytics Engine ---');

    // Create fresh test transactions for analytics
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        accountId: accountA.id,
        categoryId: incomeCategoryA.id,
        type: 'INCOME',
        amount: 80000.0,
        description: 'Tech Consulting',
        transactionDate: new Date().toISOString(),
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        accountId: accountA.id,
        categoryId: expenseCategoryA.id,
        type: 'EXPENSE',
        amount: 20000.0,
        description: 'Fine Dining Event',
        transactionDate: new Date().toISOString(),
      });

    // Test 17: GET /api/analytics/summary
    const summaryRes = await request(app)
      .get('/api/analytics/summary?period=this_month')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(
      summaryRes.status === 200 &&
        parseFloat(summaryRes.body.data.totalIncome) >= 80000 &&
        parseFloat(summaryRes.body.data.totalExpenses) >= 20000 &&
        summaryRes.body.data.savingsRate > 0,
      'GET /api/analytics/summary calculates total income, expenses, net cash flow, and savings rate',
      JSON.stringify(summaryRes.body.data)
    );

    // Test 18: GET /api/analytics/category-breakdown
    const breakdownRes = await request(app)
      .get('/api/analytics/category-breakdown?period=this_month')
      .set('Authorization', `Bearer ${tokenA}`);

    const hasDining = breakdownRes.body.data.breakdown.some(
      (b: any) => b.categoryId === expenseCategoryA.id
    );

    assert(
      breakdownRes.status === 200 && hasDining && parseFloat(breakdownRes.body.data.totalExpenses) >= 20000,
      'GET /api/analytics/category-breakdown returns category spending with percentage breakdown'
    );

    // Test 19: GET /api/analytics/monthly-trends & MoM safe calculations
    const trendsRes = await request(app)
      .get('/api/analytics/monthly-trends?months=6')
      .set('Authorization', `Bearer ${tokenA}`);

    const allMoMValid = trendsRes.body.data.every(
      (m: any) =>
        (m.incomeMoMChangePercent === null || typeof m.incomeMoMChangePercent === 'number') &&
        !isNaN(m.incomeMoMChangePercent) &&
        isFinite(m.incomeMoMChangePercent ?? 0)
    );

    assert(
      trendsRes.status === 200 && trendsRes.body.data.length === 6 && allMoMValid,
      'GET /api/analytics/monthly-trends computes monthly trends and MoM changes without NaN or Infinity'
    );

    // Test 20: GET /api/analytics/account-balances grouped by currency
    const balancesRes = await request(app)
      .get('/api/analytics/account-balances')
      .set('Authorization', `Bearer ${tokenA}`);

    const inrCur = balancesRes.body.data.currencies.find((c: any) => c.currency === 'INR');

    assert(
      balancesRes.status === 200 && inrCur && inrCur.accountCount >= 2,
      'GET /api/analytics/account-balances aggregates balances strictly by currency without cross-currency summing'
    );

    // Test 21: GET /api/analytics/budget-summary
    // Re-create a budget for summary
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        categoryId: expenseCategoryA.id,
        amount: 25000.0,
        month: currentMonth,
        year: currentYear,
      });

    const budgetSummaryRes = await request(app)
      .get(`/api/analytics/budget-summary?month=${currentMonth}&year=${currentYear}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(
      budgetSummaryRes.status === 200 &&
        budgetSummaryRes.body.data.totalBudgets >= 1 &&
        parseFloat(budgetSummaryRes.body.data.totalBudgeted) >= 25000 &&
        parseFloat(budgetSummaryRes.body.data.totalSpent) >= 20000,
      'GET /api/analytics/budget-summary aggregates budget utilization and spending metrics'
    );

    // Test 22: GET /api/analytics/goals-summary
    const goalsSummaryRes = await request(app)
      .get('/api/analytics/goals-summary')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(
      goalsSummaryRes.status === 200 &&
        goalsSummaryRes.body.data.totalGoals >= 2 &&
        goalsSummaryRes.body.data.completedCount >= 1 &&
        goalsSummaryRes.body.data.overdueCount >= 1 &&
        typeof goalsSummaryRes.body.data.overallProgressPercent === 'number',
      'GET /api/analytics/goals-summary computes goal counts, targets, saved amounts, and overall completion rate'
    );

    // Test 23: Complete cross-user isolation on analytics
    const userBSummary = await request(app)
      .get('/api/analytics/summary?period=this_month')
      .set('Authorization', `Bearer ${tokenB}`);

    assert(
      userBSummary.status === 200 &&
        userBSummary.body.data.totalIncome === '0.00' &&
        userBSummary.body.data.totalExpenses === '0.00' &&
        userBSummary.body.data.transactionCounts.total === 0,
      'Cross-user isolation: User B has completely empty analytics independent of User A'
    );
  } catch (error) {
    console.error('Fatal test execution error:', error);
    failed++;
  } finally {
    // Cleanup test data
    if (userA || userB) {
      await prisma.transaction.deleteMany({ where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } } });
      await prisma.budget.deleteMany({ where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } } });
      await prisma.goal.deleteMany({ where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } } });
      await prisma.account.deleteMany({ where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } } });
      await prisma.category.deleteMany({ where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } } });
      await prisma.user.deleteMany({ where: { id: { in: [userA?.id, userB?.id].filter(Boolean) } } });
    }
  }

  console.log('\n================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runPhase4Tests().catch((err) => {
  console.error('Test execution crashed:', err);
  process.exit(1);
});
