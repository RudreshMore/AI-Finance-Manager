import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { Role, AccountType, CategoryType, TransactionType, Prisma } from '@prisma/client';
import { AnalyticsService } from '../services/analytics.service';
import { TransactionService } from '../services/transaction.service';
import { AuthService } from '../services/auth.service';
import { executeFinanceTool, FINANCE_TOOL_DECLARATIONS } from '../services/ai/tools/finance.tools';

const runPhase6Tests = async () => {
  console.log('🧪 Starting Phase 6: Financial Integrity, Concurrency & Security Audit Suite...\n');
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

  let testUser: any;
  let authToken: string;
  let bankAccount: any;
  let walletAccount: any;
  let salaryCat: any;
  let shoppingCat: any;

  try {
    // Setup clean test environment
    testUser = await prisma.user.create({
      data: {
        email: `p6audit_${Date.now()}@example.com`,
        firstName: 'Ada',
        lastName: 'Lovelace',
        passwordHash: 'dummy_hash',
        role: Role.USER,
        isVerified: true,
      },
    });
    authToken = generateAccessToken({ userId: testUser.id, email: testUser.email, role: testUser.role });

    bankAccount = await prisma.account.create({
      data: {
        userId: testUser.id,
        name: 'Primary Bank Account',
        type: AccountType.BANK,
        balance: 100000.0,
        currency: 'INR',
      },
    });

    walletAccount = await prisma.account.create({
      data: {
        userId: testUser.id,
        name: 'Digital Wallet',
        type: AccountType.WALLET,
        balance: 5000.0,
        currency: 'INR',
      },
    });

    salaryCat = await prisma.category.create({
      data: {
        userId: testUser.id,
        name: 'Consulting Salary',
        type: CategoryType.INCOME,
      },
    });

    shoppingCat = await prisma.category.create({
      data: {
        userId: testUser.id,
        name: 'Electronics & Gadgets',
        type: CategoryType.EXPENSE,
      },
    });

    console.log('--- 1. Financial Integrity: Decimal Precision & Rounding ---');

    // 1.1 Precision test with fractional cents
    const preciseAmount = 1234.56;
    const txPrecise = await TransactionService.createTransaction(testUser.id, {
      accountId: bankAccount.id,
      categoryId: salaryCat.id,
      type: TransactionType.INCOME,
      amount: preciseAmount,
      description: 'Precision test income',
    });

    const accountAfterIncome = await prisma.account.findUniqueOrThrow({ where: { id: bankAccount.id } });
    assert(
      new Prisma.Decimal(accountAfterIncome.balance).equals(new Prisma.Decimal('101234.56')),
      'Exact Decimal(14,2) precision maintained on income credit (101234.56)'
    );

    // 1.2 Sub-cent inputs normalized via validator
    const expenseWithDecimals = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        accountId: bankAccount.id,
        categoryId: shoppingCat.id,
        type: 'EXPENSE',
        amount: 234.567, // should round to 234.57
        description: 'Sub-cent purchase',
      });

    assert(expenseWithDecimals.status === 201, 'Transaction validator accepts decimal numbers');
    assert(
      expenseWithDecimals.body.data.transaction?.amount === '234.57',
      'Transaction amount rounded to exactly two decimal places (234.57)'
    );

    console.log('\n--- 2. Concurrency & Atomicity Audit ---');

    // 2.1 Concurrent balance updates: 5 concurrent expenses of 1000 each on bankAccount
    const initialBankBal = (await prisma.account.findUniqueOrThrow({ where: { id: bankAccount.id } })).balance;
    const concurrentAmounts = [1000, 1000, 1000, 1000, 1000];

    await Promise.all(
      concurrentAmounts.map((amt) =>
        TransactionService.createTransaction(testUser.id, {
          accountId: bankAccount.id,
          categoryId: shoppingCat.id,
          type: TransactionType.EXPENSE,
          amount: amt,
          description: `Concurrent debit ${amt}`,
        })
      )
    );

    const bankAfterConcurrent = await prisma.account.findUniqueOrThrow({ where: { id: bankAccount.id } });
    const expectedBankBal = new Prisma.Decimal(initialBankBal).minus(5000);
    assert(
      new Prisma.Decimal(bankAfterConcurrent.balance).equals(expectedBankBal),
      `Concurrent balance updates acquire row locks without lost updates (Expected: ${expectedBankBal}, Got: ${bankAfterConcurrent.balance})`
    );

    // 2.2 Transaction Rollback: Overdraft failure rolls back completely
    const lowBalWallet = await prisma.account.findUniqueOrThrow({ where: { id: walletAccount.id } });
    let rollbackThrew = false;

    try {
      await TransactionService.createTransaction(testUser.id, {
        accountId: walletAccount.id,
        categoryId: shoppingCat.id,
        type: TransactionType.EXPENSE,
        amount: 999999.0, // Exceeds wallet balance
        description: 'Impossible expense',
      });
    } catch (err: any) {
      rollbackThrew = true;
    }

    const walletAfterFailed = await prisma.account.findUniqueOrThrow({ where: { id: walletAccount.id } });
    assert(rollbackThrew, 'Overdraft transaction throws bad request error');
    assert(
      new Prisma.Decimal(walletAfterFailed.balance).equals(new Prisma.Decimal(lowBalWallet.balance)),
      'Failed transaction rolls back atomically without modifying account balance'
    );

    console.log('\n--- 3. Ledger Purity: Transfers Excluded from Cash Flow ---');

    // 3.1 Execute double-entry transfer of 3000 from Bank to Wallet
    const transferTx = await TransactionService.createTransaction(testUser.id, {
      accountId: bankAccount.id,
      destinationAccountId: walletAccount.id,
      type: TransactionType.TRANSFER,
      amount: 3000.0,
      description: 'Internal transfer to wallet',
    });

    assert(transferTx.transaction.type === TransactionType.TRANSFER, 'Transfer created successfully');

    // 3.2 Verify Analytics cash flow: Transfers MUST NOT appear as income or expense
    const cashFlow = await AnalyticsService.getSummary(testUser.id, { period: 'all' });
    const categoryBreakdown = await AnalyticsService.getCategoryBreakdown(testUser.id, { period: 'all' });

    // Verify transfer is not in income or expense sums
    const allExpenses = await prisma.transaction.findMany({
      where: { userId: testUser.id, type: TransactionType.EXPENSE },
    });
    const expectedTotalExpense = allExpenses.reduce(
      (sum, t) => sum.plus(t.amount),
      new Prisma.Decimal(0)
    );

    assert(
      new Prisma.Decimal(cashFlow.totalExpenses).equals(expectedTotalExpense),
      'Transfers are strictly excluded from total expenses in cash flow analytics'
    );
    assert(
      categoryBreakdown.breakdown.every((c) => c.categoryName !== 'Transfer'),
      'Transfers never pollute category breakdown'
    );

    console.log('\n--- 4. Multi-Currency Segregation Audit ---');

    // Create a USD account for the same user
    const usdAccount = await prisma.account.create({
      data: {
        userId: testUser.id,
        name: 'US Stock Brokerage',
        type: AccountType.INVESTMENT,
        balance: 15000.0,
        currency: 'USD',
      },
    });

    const balances = await AnalyticsService.getAccountBalances(testUser.id);
    assert(balances.currencies.length === 2, 'Accounts grouped into 2 distinct currency buckets');

    const inrGroup = balances.currencies.find((c) => c.currency === 'INR');
    const usdGroup = balances.currencies.find((c) => c.currency === 'USD');

    assert(inrGroup !== undefined, 'INR currency group exists');
    assert(usdGroup !== undefined, 'USD currency group exists');
    assert(
      usdGroup?.totalBalance === '15000.00',
      'USD accounts are strictly isolated and never added to INR totals without exchange rate'
    );

    console.log('\n--- 5. Empty Period & Boundary Tests ---');

    // Query analytics for a future year with 0 transactions
    const futureSummary = await AnalyticsService.getSummary(testUser.id, {
      period: 'custom',
      month: 1,
      year: 2099,
    });
    assert(futureSummary.totalIncome === '0.00', 'Empty period income is 0.00');
    assert(futureSummary.totalExpenses === '0.00', 'Empty period expenses is 0.00');
    assert(futureSummary.netCashFlow === '0.00', 'Empty period net flow is 0.00');
    assert(futureSummary.savingsRate === 0, 'Empty period savings rate safely evaluates to 0 without NaN/Infinity');

    console.log('\n--- 6. Security & Token Lifecycle Audit ---');

    // 6.1 Access token expiry simulation
    const expiredToken = generateAccessToken(
      { userId: testUser.id, email: testUser.email, role: testUser.role },
      '-1s' // Expired 1 second ago
    );
    const expiredRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert(expiredRes.status === 401, 'Expired access token is strictly rejected with 401 Unauthorized');

    // 6.2 Refresh Token Rotation & Reuse Detection
    const { refreshToken: rawRefreshToken } = await AuthService.issueTokenPair(testUser);

    // First refresh should succeed and issue a new token
    const firstRefresh = await AuthService.refresh(rawRefreshToken);
    assert(typeof firstRefresh.accessToken === 'string', 'First refresh succeeds and issues new access token');
    assert(typeof firstRefresh.refreshToken === 'string', 'First refresh rotates refresh token');

    // Attempting to reuse the old refresh token MUST trigger reuse detection and revoke the family
    let reuseFailed = false;
    try {
      await AuthService.refresh(rawRefreshToken);
    } catch (err: any) {
      reuseFailed = true;
      assert(
        err.message.includes('Token reuse detected') || err.statusCode === 401,
        'Token reuse attack detected and rejected'
      );
    }
    assert(reuseFailed, 'Reused refresh token is denied access');

    console.log('\n--- 7. AI Security, Tool Validation & Prompt Injection Defense ---');

    // 7.1 Verify that executing an invalid tool name throws safely
    let toolErr: string | null = null;
    try {
      await executeFinanceTool('executeCustomSql', { sql: 'DROP TABLE users' }, testUser.id);
    } catch (err: any) {
      toolErr = err.message;
    }
    assert(
      toolErr !== null && toolErr.includes('not recognized or not permitted'),
      'AI tool dispatcher rejects unauthorized tool calls'
    );

    // 7.2 Verify getRecentTransactions bounds limit argument to max 30
    const txLimitTest = await executeFinanceTool('getRecentTransactions', { limit: 999 }, testUser.id);
    assert(
      txLimitTest.returnedCount <= 30,
      'getRecentTransactions enforces server-side maximum limit of 30 results'
    );

    // 7.3 Verify all tool declarations contain zero write functions
    const mutationWords = ['create', 'update', 'delete', 'modify', 'drop', 'insert', 'transfer'];
    const hasMutations = FINANCE_TOOL_DECLARATIONS.some((tool) =>
      mutationWords.some((m) => tool.name.toLowerCase().includes(m))
    );
    assert(!hasMutations, 'Audit confirms zero mutation capabilities in AI tool definitions');

    // Clean up created USD account
    await prisma.account.delete({ where: { id: usdAccount.id } });
  } catch (error) {
    console.error('Unexpected test error in Phase 6 suite:', error);
    failed++;
  } finally {
    if (testUser) {
      await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
      await prisma.account.deleteMany({ where: { userId: testUser.id } });
      await prisma.category.deleteMany({ where: { userId: testUser.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  }

  console.log('\n================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runPhase6Tests();
