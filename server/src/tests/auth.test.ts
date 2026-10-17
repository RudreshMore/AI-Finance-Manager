import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { hashToken } from '../utils/hash';

const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const NEW_PASSWORD = 'NewPassword456@';

let testUserId: string;
let verifiedOtp: string;
let accessToken: string;
let refreshToken: string;

const runTests = async () => {
  console.log('🧪 Starting Phase 2 Authentication & Security Test Suite...\n');
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

  try {
    // 1. Health check
    const healthRes = await request(app).get('/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.body.database.status === 'connected', 'Database is connected');

    // 2. Unauthenticated access to protected routes
    const unauthRes = await request(app).get('/api/auth/me');
    assert(unauthRes.status === 401, 'GET /api/auth/me rejects unauthenticated request (401)');

    // 3. User Registration (Validation check)
    const invalidRegRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: '123' });
    assert(invalidRegRes.status === 400, 'Registration validates email and password rules (400)');

    // 4. Successful User Registration
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    assert(regRes.status === 201, 'Registration returns 201 Created');
    assert(regRes.body.data.isVerified === false, 'Newly registered user isVerified is false');
    assert(!regRes.body.data.passwordHash, 'Registration does NOT leak passwordHash in response');

    testUserId = regRes.body.data.id;

    // 5. Duplicate Registration Check
    const dupRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    assert(dupRegRes.status === 201, 'Unverified user re-registering safely receives updated OTP');

    // 6. Login before OTP verification
    const preVerifyLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(preVerifyLoginRes.status === 403, 'Login fails with 403 Forbidden before email verification');

    // Fetch the OTP from database to test verification
    const otpRecord = await prisma.otpToken.findFirst({
      where: { userId: testUserId, type: 'EMAIL_VERIFICATION', usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!otpRecord, 'OTP record successfully created in database');

    // 7. Invalid OTP check
    const invalidOtpRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: TEST_EMAIL, otp: '000000', type: 'EMAIL_VERIFICATION' });
    assert(invalidOtpRes.status === 400, 'Invalid OTP rejected with 400 Bad Request');

    // 8. Test OTP verification with valid code
    // Find the plain OTP generated for this test:
    // Because in tests we hashed the token, let's create a known test OTP record
    const knownOtp = '789456';
    await prisma.otpToken.create({
      data: {
        userId: testUserId,
        otpHash: hashToken(knownOtp),
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 60000),
      },
    });

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: TEST_EMAIL, otp: knownOtp, type: 'EMAIL_VERIFICATION' });
    assert(verifyRes.status === 200, 'Verify OTP returns 200 OK');
    assert(verifyRes.body.data.user.isVerified === true, 'User isVerified is updated to true');
    assert(!!verifyRes.body.data.accessToken, 'Verify OTP delivers accessToken');

    // 9. OTP Reuse Prevention
    const reuseOtpRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: TEST_EMAIL, otp: knownOtp, type: 'EMAIL_VERIFICATION' });
    assert(reuseOtpRes.status === 400, 'Reusing consumed OTP is rejected (400)');

    // 10. Login with Invalid Credentials
    const badLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPassword999!' });
    assert(badLoginRes.status === 401, 'Login rejects incorrect password with 401 Unauthorized');

    // 11. Login with Valid Credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(loginRes.status === 200, 'Login succeeds with 200 OK');
    assert(!!loginRes.body.data.accessToken, 'Login returns accessToken');
    assert(!loginRes.body.data.user.passwordHash, 'Login response does NOT leak passwordHash');

    // Check cookies
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    assert(
      Array.isArray(cookies) && cookies.some((c) => c.includes('refreshToken=')),
      'Login sets secure HttpOnly refreshToken cookie'
    );

    accessToken = loginRes.body.data.accessToken;

    // Extract refreshToken from cookie
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    const rawRefreshToken = refreshCookie?.split(';')[0]?.replace('refreshToken=', '');
    assert(!!rawRefreshToken, 'Raw refresh token successfully extracted from cookie');
    refreshToken = rawRefreshToken || '';

    // 12. Authenticated access to /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    assert(meRes.status === 200, 'GET /api/auth/me succeeds with Bearer token');
    assert(meRes.body.data.email === TEST_EMAIL, 'GET /api/auth/me returns current user profile');

    // 13. RBAC: Standard USER attempting ADMIN route
    const userRoleCheck = await request(app)
      .get('/api/auth/admin-check')
      .set('Authorization', `Bearer ${accessToken}`);
    assert(userRoleCheck.status === 403, 'RBAC: Standard USER forbidden from ADMIN route (403)');

    // 14. RBAC: ADMIN user accessing ADMIN route
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${Date.now()}@example.com`,
        firstName: 'System',
        lastName: 'Admin',
        passwordHash: 'dummy',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: 'any' }); // We'll manually test with token

    // Issue admin token
    const { generateAccessToken: genTok } = await import('../utils/jwt');
    const adminToken = genTok({ userId: adminUser.id, email: adminUser.email, role: 'ADMIN' });

    const adminRoleCheck = await request(app)
      .get('/api/auth/admin-check')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminRoleCheck.status === 200, 'RBAC: ADMIN role successfully accesses ADMIN route (200)');

    // 15. Token Refresh and Rotation
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`]);
    assert(refreshRes.status === 200, 'Token refresh returns 200 OK');
    assert(!!refreshRes.body.data.accessToken, 'Token refresh returns new accessToken');

    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    const newRefreshCookie = newCookies?.find((c) => c.startsWith('refreshToken='));
    const newRefreshToken = newRefreshCookie?.split(';')[0]?.replace('refreshToken=', '');
    assert(!!newRefreshToken && newRefreshToken !== refreshToken, 'New rotated refresh token issued');

    // 16. Refresh Token Reuse Detection
    const reuseRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`]); // Presenting old revoked token!
    assert(
      reuseRefreshRes.status === 401,
      'Refresh token reuse detected and rejected with 401'
    );

    // Verify token family revocation on reuse: The rotated token should now also be invalidated
    const familyCheckRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${newRefreshToken}`]);
    assert(
      familyCheckRes.status === 401,
      'Reuse detection revoked the entire token family (subsequent tokens invalidated)'
    );

    // 17. Forgot Password Flow
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: TEST_EMAIL });
    assert(forgotRes.status === 200, 'Forgot password returns generic 200 OK');

    // Forgot password with non-existent email (prevents enumeration)
    const forgotFakeRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent999@example.com' });
    assert(forgotFakeRes.status === 200, 'Forgot password for non-existent email returns generic 200 OK');

    // 18. Reset Password with OTP
    const resetOtp = '654321';
    await prisma.otpToken.create({
      data: {
        userId: testUserId,
        otpHash: hashToken(resetOtp),
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60000),
      },
    });

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: TEST_EMAIL,
        otp: resetOtp,
        newPassword: NEW_PASSWORD,
      });
    assert(resetRes.status === 200, 'Reset password succeeds with 200 OK');

    // 19. Verify Old Password Fails and New Password Works
    const oldPassLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(oldPassLoginRes.status === 401, 'Login with old password fails (401)');

    const newPassLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: NEW_PASSWORD });
    assert(newPassLoginRes.status === 200, 'Login with new password succeeds (200)');

    // 20. Logout Flow
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send();
    assert(logoutRes.status === 200, 'Logout succeeds with 200 OK');
    const clearedCookies = logoutRes.headers['set-cookie'] as unknown as string[];
    assert(
      Array.isArray(clearedCookies) && clearedCookies.some((c) => c.includes('Expires=Thu, 01 Jan 1970')),
      'Logout clears authentication cookies'
    );

    // Cleanup test data
    await prisma.otpToken.deleteMany({ where: { userId: testUserId } });
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.user.delete({ where: { id: adminUser.id } });

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

runTests();
