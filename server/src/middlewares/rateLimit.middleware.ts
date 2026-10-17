import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isProd = env.NODE_ENV === 'production';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 15 : 1000, // limit each IP to 15 requests in production, 1000 in dev/test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 10 : 1000, // limit each IP to 10 OTP attempts in production, 1000 in dev/test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many OTP verification attempts. Please try again after 15 minutes.',
  },
});

export const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 5 : 1000, // limit each IP to 5 resend requests in production, 1000 in dev/test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many OTP resend requests. Please wait before requesting another code.',
  },
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 30 : 1000, // limit each IP/user to 30 requests in production, 1000 in dev/test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many AI Assistant requests. Please wait a few minutes before trying again.',
  },
});

