import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { emailService } from '../services/email.service';
import { hashPassword } from '../utils/hash';
import { Role } from '@prisma/client';

const router = Router();

/**
 * Retrieves the latest generated OTP for an email address (dev / test mode only).
 */
router.get('/get-otp', async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Email query parameter is required' });
  }

  const otp = emailService.getDevOtp(email);
  return res.json({ status: 'success', email, otp: otp || null });
});

/**
 * Creates or resets an active, verified test user with given credentials.
 */
router.post('/setup-user', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  // Check if exists
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        isVerified: true,
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
      },
    });
    return res.json({ status: 'success', user: { id: updated.id, email: updated.email } });
  }

  const created = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName: firstName || 'Test',
      lastName: lastName || 'User',
      role: role === 'ADMIN' ? Role.ADMIN : Role.USER,
      isVerified: true,
    },
  });

  return res.json({ status: 'success', user: { id: created.id, email: created.email } });
});

/**
 * Purges a test user and all cascade data.
 */
router.post('/cleanup-user', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return res.json({ status: 'success', message: 'User not found, nothing to clean up' });
  }

  // Delete records in safe order
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.otpToken.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  return res.json({ status: 'success', message: 'User and cascade data deleted' });
});

export default router;
