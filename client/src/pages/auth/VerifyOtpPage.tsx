import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, AlertCircle, CheckCircle2, RotateCw, ArrowLeft } from 'lucide-react';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const stateEmail = location.state?.email || '';
  const stateType = (location.state?.type as 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') || 'EMAIL_VERIFICATION';

  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState('');
  const [type] = useState(stateType);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await authApi.verifyOtp({ email, otp, type });
      setSuccessMsg(res.message);

      if (type === 'EMAIL_VERIFICATION') {
        setUser(res.data.user);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        // Password reset flow: navigate to reset-password with email and verified OTP
        setTimeout(() => {
          navigate('/reset-password', { state: { email, otp } });
        }, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setError(null);
    setSuccessMsg(null);
    setResending(true);

    try {
      const res = await authApi.resendOtp({ email, type });
      setSuccessMsg(res.message);
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Enter Verification Code
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 max-w-sm mx-auto">
          We sent a 6-digit one-time code to <br />
          <span className="font-semibold text-slate-800">{email || 'your email'}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleVerify}>
            {!stateEmail && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  6-Digit OTP Code
                </label>
                <span className="text-xs font-medium text-slate-500">
                  Expires in: <strong className="text-emerald-700">{countdown}s</strong>
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full tracking-widest text-center text-2xl font-bold font-mono py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? 'Verifying Code...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:hover:text-emerald-600"
            >
              <RotateCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code now'}</span>
            </button>

            <Link to="/login" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
