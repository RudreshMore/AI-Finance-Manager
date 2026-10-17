import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { generateAccessToken } from '../utils/jwt';
import { Role, AccountType } from '@prisma/client';

const runFinancialTests = async () => {
  console.log('🧪 Starting Phase 3 Financial Core Integration Test Suite...\n');
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

  let account1Id: string;
  let account2Id: string;
  let userBAccountId: string;

  let salaryCatId: string;
  let foodCatId: string;
  let customCatId: string;

  let incomeTxId: string;
  let expenseTxId: string;
  let transferTxId: string;

  try {
    // Setup test users
    userA = await prisma.user.create({
      data: {
        email: `fin_user_a_${Date.now()}@example.com`,
        firstName: 'Alice',
        lastName: 'Finance',
        passwordHash: 'dummy',
        role: Role.USER,
        isVerified: true,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `fin_user_b_${Date.now()}@example.com`,
        firstName: 'Bob',
        lastName: 'Finance',
        passwordHash: 'dummy',
        role: Role.USER,
        isVerified: true,
      },
    });

    tokenA = generateAccessToken({ userId: userA.id, email: userA.email, role: Role.USER });
    tokenB = generateAccessToken({ userId: userB.id, email: userB.email, role: Role.USER });

    // 1. Categories listing includes seeded system categories
    const categoriesRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(categoriesRes.status === 200, 'GET /api/categories returns 200 OK');
    assert(Array.isArray(categoriesRes.body.data), 'Returns category array');
    
    const salaryCat = categoriesRes.body.data.find((c: any) => c.name === 'Salary' && c.type === 'INCOME');
    const foodCat = categoriesRes.body.data.find((c: any) => c.name === 'Food' && c.type === 'EXPENSE');
    assert(!!salaryCat && salaryCat.isSystem === true, 'System category "Salary" exists');
    assert(!!foodCat && foodCat.isSystem === true, 'System category "Food" exists');

    salaryCatId = salaryCat.id;
    foodCatId = foodCat.id;

    // 2. Custom Category Creation
    const createCatRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Tech Gadgets',
        type: 'EXPENSE',
        icon: 'Smartphone',
        color: '#6366f1',
      });
    assert(createCatRes.status === 201, 'POST /api/categories creates custom category (201)');
    assert(createCatRes.body.data.isSystem === false, 'Custom category isSystem is false');
    customCatId = createCatRes.body.data.id;

    // 3. Duplicate Category Name Prevention
    const dupCatRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Tech Gadgets',
        type: 'EXPENSE',
      });
    assert(dupCatRes.status === 409, 'Duplicate category name is rejected with 409 Conflict');

    // 4. Protection of System Categories
    const delSysCatRes = await request(app)
      .delete(`/api/categories/${salaryCatId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(delSysCatRes.status === 403, 'System category deletion is forbidden (403)');

    // 5. Account Creation (Checking INR default and Decimal)
    const acc1Res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'HDFC Bank Checking',
        type: AccountType.BANK,
        initialBalance: 10000.50,
        currency: 'INR',
      });
    assert(acc1Res.status === 201, 'POST /api/accounts creates bank account (201)');
    assert(parseFloat(acc1Res.body.data.balance) === 10000.50, 'Initial balance matches exact Decimal 10000.50');
    assert(acc1Res.body.data.currency === 'INR', 'Currency defaults to INR');
    account1Id = acc1Res.body.data.id;

    const acc2Res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Cash In Wallet',
        type: AccountType.CASH,
        initialBalance: 500.00,
        currency: 'INR',
      });
    assert(acc2Res.status === 201, 'POST /api/accounts creates second account (201)');
    account2Id = acc2Res.body.data.id;

    // User B account for cross-user tests
    const userBAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: "Bob's Savings",
        type: AccountType.SAVINGS,
        initialBalance: 2000.00,
      });
    userBAccountId = userBAccRes.body.data.id;

    // 6. Cross-User Account Isolation
    const crossAccRes = await request(app)
      .get(`/api/accounts/${userBAccountId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(crossAccRes.status === 404, 'User A cannot access User B account (404)');

    // 7. Duplicate Account Name Prevention for same user
    const dupAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'HDFC Bank Checking',
        type: AccountType.BANK,
      });
    assert(dupAccRes.status === 409, 'Duplicate account name for same user is rejected (409)');

    // 8. INCOME Transaction: Balance Increases
    const incomeRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'INCOME',
        amount: 25000.00,
        accountId: account1Id,
        categoryId: salaryCatId,
        description: 'Monthly Salary Credit',
      });
    assert(incomeRes.status === 201, 'POST /api/transactions creates INCOME transaction');
    assert(
      parseFloat(incomeRes.body.data.newBalance) === 35000.50,
      'Account balance increased by 25000 (10000.50 + 25000 = 35000.50)'
    );
    incomeTxId = incomeRes.body.data.transaction.id;

    // 9. EXPENSE Transaction: Balance Decreases
    const expenseRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'EXPENSE',
        amount: 3200.50,
        accountId: account1Id,
        categoryId: foodCatId,
        description: 'Grocery shopping at supermarket',
      });
    assert(expenseRes.status === 201, 'POST /api/transactions creates EXPENSE transaction');
    assert(
      parseFloat(expenseRes.body.data.newBalance) === 31800.00,
      'Account balance decreased by 3200.50 (35000.50 - 3200.50 = 31800.00)'
    );
    expenseTxId = expenseRes.body.data.transaction.id;

    // 10. Insufficient Funds Check (Overdraft rejection on non-credit account)
    const overdraftRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'EXPENSE',
        amount: 999999.00,
        accountId: account1Id,
        categoryId: foodCatId,
      });
    assert(overdraftRes.status === 400, 'Expense exceeding account balance is rejected with 400 Bad Request');

    // 11. Category Mismatch Validation
    const mismatchCatRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'INCOME',
        amount: 100.00,
        accountId: account1Id,
        categoryId: foodCatId, // Food is an EXPENSE category!
      });
    assert(mismatchCatRes.status === 400, 'Using EXPENSE category for INCOME transaction is rejected (400)');

    // 12. TRANSFER Transaction: Atomic Balance Updates
    // Source: account1 (31800.00), Destination: account2 (500.00)
    const transferRes = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fromAccountId: account1Id,
        toAccountId: account2Id,
        amount: 2000.00,
        description: 'ATM Cash Withdrawal',
      });
    assert(transferRes.status === 201, 'POST /api/transactions/transfer executes transfer (201)');
    assert(
      parseFloat(transferRes.body.data.sourceBalance) === 29800.00,
      'Source account decreased by 2000 (31800 -> 29800)'
    );
    assert(
      parseFloat(transferRes.body.data.destinationBalance) === 2500.00,
      'Destination account increased by 2000 (500 -> 2500)'
    );
    transferTxId = transferRes.body.data.transaction.id;

    // 13. Cross-User Transfer Prevention
    const crossTransferRes = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fromAccountId: account1Id,
        toAccountId: userBAccountId, // Belongs to User B!
        amount: 50.00,
      });
    assert(crossTransferRes.status === 404, 'Transfer to another user account is rejected (404)');

    // 14. Transaction Search & Date Filtering & Pagination
    const listTxRes = await request(app)
      .get('/api/transactions?search=Grocery&page=1&limit=10')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(listTxRes.status === 200, 'GET /api/transactions returns 200 OK');
    assert(listTxRes.body.data.transactions.length === 1, 'Search by keyword returns matching record');
    assert(listTxRes.body.data.transactions[0].id === expenseTxId, 'Found expected transaction');

    // 15. Safe Account Deletion Rule (Cannot delete account with transactions)
    const delAccountWithTxRes = await request(app)
      .delete(`/api/accounts/${account1Id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      delAccountWithTxRes.status === 400,
      'Safe deletion: Account with transactions cannot be deleted (400)'
    );

    // 16. Safe Category Deletion Rule (Cannot delete category with transactions)
    // Link a transaction to customCatId first
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'EXPENSE',
        amount: 150.00,
        accountId: account2Id,
        categoryId: customCatId,
        description: 'Phone cable',
      });

    const delCatWithTxRes = await request(app)
      .delete(`/api/categories/${customCatId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      delCatWithTxRes.status === 400,
      'Safe deletion: Category linked to transactions cannot be deleted (400)'
    );

    // 17. Transaction Update: Reverses Previous Balance and Applies New
    // Expense transaction was 3200.50 on account1 (balance 29800.00)
    // Update amount to 4000.00 -> should debit an additional 799.50
    const updateTxRes = await request(app)
      .put(`/api/transactions/${expenseTxId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 4000.00,
        description: 'Supermarket bill updated',
      });
    assert(updateTxRes.status === 200, 'PUT /api/transactions/:id updates transaction');

    const updatedAcc1 = await prisma.account.findUnique({ where: { id: account1Id } });
    assert(
      parseFloat(updatedAcc1!.balance.toString()) === 29000.50,
      'Account balance updated accurately upon editing transaction amount (29800 - 799.50 = 29000.50)'
    );

    // 18. Transaction Deletion: Reverses Balance Effect
    // Deleting income transaction (amount 25000.00 on account1) -> balance should revert
    const delTxRes = await request(app)
      .delete(`/api/transactions/${incomeTxId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(delTxRes.status === 200, 'DELETE /api/transactions/:id returns 200 OK');

    const afterDelAcc1 = await prisma.account.findUnique({ where: { id: account1Id } });
    assert(
      parseFloat(afterDelAcc1!.balance.toString()) === 4000.50,
      'Account balance reverted accurately upon deleting transaction (29000.50 - 25000 = 4000.50)'
    );

    // 19. Cleanup test data
    await prisma.transaction.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.account.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.category.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n================================`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runFinancialTests();
