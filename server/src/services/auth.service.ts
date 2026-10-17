import { Role } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import {
  hashPassword,
  comparePassword,
  generateOtp,
  hashToken,
  compareTokenHash,
} from '../utils/hash';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { emailService } from './email.service';
import {
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
  ResetPasswordInput,
} from '../validators/auth.validator';
import crypto from 'crypto';

export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isVerified: boolean;
  createdAt: Date;
}

export class AuthService {
  /**
   * Helper to strip sensitive fields from a user entity.
   */
  private static sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isVerified: boolean;
    createdAt: Date;
  }): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Registers a new user as unverified and sends an OTP verification email.
   */
  static async register(input: RegisterInput): Promise<{
    user: SanitizedUser;
    message: string;
  }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        throw ApiError.conflict('An account with this email address already exists');
      }
      // If user exists but is not verified, update details and re-issue OTP
      const hashedPassword = await hashPassword(input.password);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash: hashedPassword,
        },
      });

      await this.createAndSendOtp(updatedUser.id, updatedUser.email, 'EMAIL_VERIFICATION', updatedUser.firstName);

      return {
        user: this.sanitizeUser(updatedUser),
        message: 'Registration pending verification. A new verification code has been sent to your email.',
      };
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: hashedPassword,
        role: Role.USER,
        isVerified: false,
      },
    });

    await this.createAndSendOtp(user.id, user.email, 'EMAIL_VERIFICATION', user.firstName);

    return {
      user: this.sanitizeUser(user),
      message: 'Registration successful. Please verify your email with the verification code sent.',
    };
  }

  /**
   * Creates, hashes, persists, and emails an OTP code.
   */
  private static async createAndSendOtp(
    userId: string,
    email: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
    userName?: string
  ): Promise<string> {
    // Invalidate existing active OTPs for this user and type
    await prisma.otpToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const otp = generateOtp();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_IN_SECONDS * 1000);

    await prisma.otpToken.create({
      data: {
        userId,
        otpHash,
        type,
        expiresAt,
        attempts: 0,
      },
    });

    await emailService.sendOtpEmail({
      to: email,
      otp,
      type,
      userName,
    });

    return otp;
  }

  /**
   * Verifies an OTP code and activates user or authorizes password reset.
   */
  static async verifyOtp(input: VerifyOtpInput): Promise<{
    user: SanitizedUser;
    accessToken?: string;
    refreshToken?: string;
    message: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification request');
    }

    const activeOtp = await prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        type: input.type,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw ApiError.badRequest('No active verification code found. Please request a new code.');
    }

    // Check brute-force attempts
    if (activeOtp.attempts >= 5) {
      await prisma.otpToken.update({
        where: { id: activeOtp.id },
        data: { usedAt: new Date() },
      });
      throw ApiError.badRequest('Too many failed attempts. This code has been invalidated. Please request a new code.');
    }

    // Check expiration
    if (activeOtp.expiresAt < new Date()) {
      await prisma.otpToken.update({
        where: { id: activeOtp.id },
        data: { usedAt: new Date() },
      });
      throw ApiError.badRequest('Verification code has expired. Please request a new code.');
    }

    // Validate hash
    const isValid = compareTokenHash(input.otp, activeOtp.otpHash);
    if (!isValid) {
      await prisma.otpToken.update({
        where: { id: activeOtp.id },
        data: { attempts: { increment: 1 } },
      });
      throw ApiError.badRequest('Invalid verification code. Please check and try again.');
    }

    // Mark OTP as consumed
    await prisma.otpToken.update({
      where: { id: activeOtp.id },
      data: { usedAt: new Date() },
    });

    if (input.type === 'EMAIL_VERIFICATION') {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Issue tokens immediately upon email verification for seamless onboarding
      const { accessToken, refreshToken } = await this.issueTokenPair(updatedUser);

      return {
        user: this.sanitizeUser(updatedUser),
        accessToken,
        refreshToken,
        message: 'Email verified successfully. Welcome to AI Finance Manager!',
      };
    }

    return {
      user: this.sanitizeUser(user),
      message: 'Code verified successfully. You may now reset your password.',
    };
  }

  /**
   * Resends an OTP with rate limiting and invalidation of previous OTPs.
   */
  static async resendOtp(input: ResendOtpInput): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Prevent user enumeration: Return generic message if user doesn't exist
    if (!user) {
      return { message: 'If an account with that email exists, a new verification code has been sent.' };
    }

    if (input.type === 'EMAIL_VERIFICATION' && user.isVerified) {
      throw ApiError.badRequest('Email is already verified. Please log in.');
    }

    await this.createAndSendOtp(user.id, user.email, input.type, user.firstName);

    return { message: 'A new verification code has been sent to your email.' };
  }

  /**
   * Authenticates user credentials and issues access & refresh tokens.
   */
  static async login(input: LoginInput): Promise<{
    user: SanitizedUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isVerified) {
      throw ApiError.forbidden('Your email address has not been verified. Please verify your email before logging in.');
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotates refresh tokens and detects token reuse attacks.
   */
  static async refresh(rawRefreshToken: string): Promise<{
    user: SanitizedUser;
    accessToken: string;
    refreshToken: string;
  }> {
    if (!rawRefreshToken) {
      throw ApiError.unauthorized('No refresh token provided');
    }

    try {
      verifyRefreshToken(rawRefreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw ApiError.unauthorized('Refresh token not recognized');
    }

    // Token Reuse Detection: If an already-revoked token is submitted, invalidate the entire token family
    if (storedToken.revokedAt !== null) {
      console.warn(`🚨 Refresh token reuse detected for user ${storedToken.userId}! Revoking token family ${storedToken.family}.`);
      await prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { revokedAt: new Date() },
      });
      throw ApiError.unauthorized('Security alert: Refresh token reuse detected. All sessions terminated. Please log in again.');
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
      throw ApiError.unauthorized('Refresh token has expired. Please log in again.');
    }

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new pair maintaining the same family
    const payload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    const newTokenHash = hashToken(newRefreshToken);

    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: newTokenHash,
        family: storedToken.family,
        expiresAt: refreshExpiry,
      },
    });

    return {
      user: this.sanitizeUser(storedToken.user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logs out user by revoking the provided refresh token.
   */
  static async logout(rawRefreshToken?: string): Promise<{ message: string }> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Initiates forgot-password flow with generic response preventing enumeration.
   */
  static async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await this.createAndSendOtp(user.id, user.email, 'PASSWORD_RESET', user.firstName);
    }

    return {
      message: 'If an account with that email exists, a password reset code has been sent.',
    };
  }

  /**
   * Resets password using valid OTP and terminates all existing sessions.
   */
  static async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid password reset request');
    }

    const activeOtp = await prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw ApiError.badRequest('No active password reset code found. Please request a new code.');
    }

    if (activeOtp.attempts >= 5 || activeOtp.expiresAt < new Date()) {
      await prisma.otpToken.update({
        where: { id: activeOtp.id },
        data: { usedAt: new Date() },
      });
      throw ApiError.badRequest('Password reset code has expired or exceeded maximum attempts. Please request a new code.');
    }

    const isValid = compareTokenHash(input.otp, activeOtp.otpHash);
    if (!isValid) {
      await prisma.otpToken.update({
        where: { id: activeOtp.id },
        data: { attempts: { increment: 1 } },
      });
      throw ApiError.badRequest('Invalid password reset code');
    }

    // Mark OTP as used
    await prisma.otpToken.update({
      where: { id: activeOtp.id },
      data: { usedAt: new Date() },
    });

    // Hash new password and update user
    const newPasswordHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all existing sessions/refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Password reset successful. All previous sessions have been logged out. Please log in with your new password.',
    };
  }

  /**
   * Fetches profile for currently authenticated user.
   */
  static async getCurrentUser(userId: string): Promise<SanitizedUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Generates a new access token and refresh token pair, saving the refresh token in DB.
   */
  private static async issueTokenPair(user: {
    id: string;
    email: string;
    role: Role;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const tokenHash = hashToken(refreshToken);
    const family = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        family,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
