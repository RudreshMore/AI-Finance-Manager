import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

const setAuthCookies = (res: Response, accessToken?: string, refreshToken?: string): void => {
  if (accessToken) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
      path: '/',
    });
  }

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });
  }
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
  });
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      ApiResponse.created(res, result.user, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.verifyOtp(req.body);

      if (result.accessToken && result.refreshToken) {
        setAuthCookies(res, result.accessToken, result.refreshToken);
      }

      ApiResponse.success(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        result.message
      );
    } catch (error) {
      next(error);
    }
  }

  static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resendOtp(req.body);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      ApiResponse.success(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;

      const result = await AuthService.refresh(refreshToken);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      ApiResponse.success(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        'Token refreshed successfully'
      );
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;

      const result = await AuthService.logout(refreshToken);
      clearAuthCookies(res);

      ApiResponse.success(res, null, result.message);
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body);
      clearAuthCookies(res);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const user = await AuthService.getCurrentUser(req.user.id);
      ApiResponse.success(res, user, 'Current user retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async adminOnlyTest(req: Request, res: Response): Promise<void> {
    ApiResponse.success(
      res,
      { adminId: req.user?.id, email: req.user?.email },
      'Welcome Administrator. RBAC verification passed.'
    );
  }
}
