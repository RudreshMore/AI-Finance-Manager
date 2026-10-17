import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Securely hashes a plain-text password using bcrypt.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plain-text password with a bcrypt hash.
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hashes a sensitive token (such as OTP or refresh token) using SHA-256.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Timing-safe comparison of token hashes to mitigate timing attacks.
 */
export const compareTokenHash = (
  plainToken: string,
  storedHash: string
): boolean => {
  const computedHash = hashToken(plainToken);
  if (computedHash.length !== storedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'utf8'),
    Buffer.from(storedHash, 'utf8')
  );
};

/**
 * Generates a cryptographically secure random token string (e.g. for refresh tokens).
 */
export const generateSecureToken = (byteLength = 32): string => {
  return crypto.randomBytes(byteLength).toString('hex');
};
