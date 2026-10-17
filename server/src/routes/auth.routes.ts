import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  authLimiter,
  otpLimiter,
  resendOtpLimiter,
} from '../middlewares/rateLimit.middleware';
import {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';
import { Role } from '@prisma/client';

const router = Router();

// Public Authentication Endpoints
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  AuthController.register
);

router.post(
  '/verify-otp',
  otpLimiter,
  validate(verifyOtpSchema),
  AuthController.verifyOtp
);

router.post(
  '/resend-otp',
  resendOtpLimiter,
  validate(resendOtpSchema),
  AuthController.resendOtp
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  AuthController.login
);

router.post(
  '/refresh',
  AuthController.refresh
);

router.post(
  '/logout',
  AuthController.logout
);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

// Protected Endpoints
router.get(
  '/me',
  requireAuth,
  AuthController.getCurrentUser
);

// RBAC Protected Test Route for ADMIN role
router.get(
  '/admin-check',
  requireAuth,
  requireRole([Role.ADMIN]),
  AuthController.adminOnlyTest
);

export default router;
