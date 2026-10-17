import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface SendOtpEmailOptions {
  to: string;
  otp: string;
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  userName?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private devOtpCache = new Map<string, string>();

  getDevOtp(email: string): string | undefined {
    return this.devOtpCache.get(email.toLowerCase());
  }

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    if (env.SMTP_USER && env.SMTP_PASS && env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      console.log('📧 Configured production SMTP email transport.');
    } else {
      // In development / test when real SMTP is not configured, use fast JSON transport to avoid port 587 timeout
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      if (env.NODE_ENV !== 'test') {
        console.log('📧 Configured local simulated email transport (Dev mode).');
      }
    }

    return this.transporter;
  }

  async sendOtpEmail({ to, otp, type, userName }: SendOtpEmailOptions): Promise<void> {
    this.devOtpCache.set(to.toLowerCase(), otp);
    const transporter = await this.getTransporter();

    const isVerification = type === 'EMAIL_VERIFICATION';
    const subject = isVerification
      ? 'Verify Your Email — AI Finance Manager'
      : 'Password Reset Code — AI Finance Manager';

    const greeting = userName ? `Hello ${userName},` : 'Hello,';
    const actionText = isVerification
      ? 'verify your email address and activate your account'
      : 'reset your AI Finance Manager password';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700;">AI Finance Manager</h2>
          <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Smart Financial Control & Insights</p>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">${greeting}</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Use the one-time verification code below to ${actionText}:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; padding: 12px 28px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f766e; background-color: #f0fdfa; border: 1px dashed #0d9488; border-radius: 8px;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in <strong>1 minute</strong>. If you did not make this request, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">AI Finance Manager Security Team</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html: htmlContent,
      });

      if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test') {
        console.log(`📨 [Dev Email Sent] To: ${to} | Subject: ${subject}`);
      }
    } catch (err) {
      console.error('❌ Failed to send email via transporter:', err);
      if (env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }
}

export const emailService = new EmailService();
