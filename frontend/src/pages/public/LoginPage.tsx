import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Layers,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Clock,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login, verifySuperAdminOtp, resendSuperAdminOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'otp' | 'setup_invite'
  const [authStep, setAuthStep] = useState<'login' | 'otp' | 'setup_invite'>('login');

  // Step 1: Login states
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Step 2: OTP verification states
  const [challengeId, setChallengeId] = useState('');
  const [targetEmail, setTargetEmail] = useState('cpnihal35@gmail.com');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [expiresInSeconds, setExpiresInSeconds] = useState(300);
  const [isResending, setIsResending] = useState(false);

  // Invitation token setup states
  const [inviteToken, setInviteToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check URL query parameters for invitation token
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      setInviteToken(token);
      setAuthStep('setup_invite');
    }
  }, [location.search]);

  // Timers for OTP cooldown & expiration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (authStep === 'otp') {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setExpiresInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authStep]);

  // Step 1 Submit: Credential verification
  const onCredentialsSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await login(data.email, data.password);

      // If Super Admin two-step authentication is triggered
      if (result.requiresOtp && result.challengeId) {
        setChallengeId(result.challengeId);
        setTargetEmail(result.email || 'cpnihal35@gmail.com');
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setResendCooldown(60);
        setExpiresInSeconds(300);
        setAuthStep('otp');
        toast.success(`Verification code dispatched to ${result.email || 'cpnihal35@gmail.com'}`);
        // Focus first OTP digit after render
        setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
        return;
      }

      if (result.user) {
        handlePostLoginRedirect(result.user);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message;

      if (status === 401) {
        setErrorMessage(serverMessage || 'Invalid email or password');
      } else if (status === 429) {
        setErrorMessage(serverMessage || 'Too many attempts. Please wait a few minutes before trying again.');
      } else if (status === 502) {
        setErrorMessage(serverMessage || 'Email delivery failed. Please verify SMTP settings in backend.');
      } else if (!err.response) {
        setErrorMessage('Authentication service is currently unreachable. Please verify that the backend is running.');
      } else {
        setErrorMessage(serverMessage || err.message || 'An error occurred during authentication.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect based on verified database role
  const handlePostLoginRedirect = (user: any) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && !from.includes('/login')) {
      navigate(from, { replace: true });
    } else if (user.role === 'super_admin') {
      navigate('/superadmin/dashboard', { replace: true });
    } else if (user.role === 'shop_admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/my-account/orders', { replace: true });
    }
  };

  // Step 2: Handle individual digit input and keyboard navigation
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Handle paste of multiple characters
      const pastedDigits = cleaned.slice(0, 6).split('');
      pastedDigits.forEach((digit, i) => {
        if (i < 6) newDigits[i] = digit;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();

      // If full 6 digits are pasted, trigger auto-submit
      if (pastedDigits.length === 6) {
        submitOtp(pastedDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);
    setOtpError('');

    // Advance focus
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (newDigits.every((d) => d.length === 1)) {
      submitOtp(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setOtpDigits(newDigits);

    const targetFocus = Math.min(pasted.length, 5);
    otpInputRefs.current[targetFocus]?.focus();

    if (pasted.length === 6) {
      submitOtp(pasted);
    }
  };

  // Submit 6-digit OTP to backend
  const submitOtp = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length !== 6) {
      setOtpError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (expiresInSeconds <= 0) {
      setOtpError('This verification code has expired. Please request a new one.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const user = await verifySuperAdminOtp(challengeId, fullCode);
      toast.success('Super Admin verified successfully. Welcome back!');
      handlePostLoginRedirect(user);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'Invalid or expired verification code');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setOtpError('');
    try {
      await resendSuperAdminOtp(challengeId);
      toast.success(`A fresh verification code was sent to ${targetEmail}`);
      setResendCooldown(60);
      setExpiresInSeconds(300);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // Handle invitation password setup
  const onSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSettingPassword(true);
    try {
      const res = await api.post('/auth/setup-admin-password', {
        token: inviteToken,
        password: newPassword,
        confirmPassword,
      });
      toast.success('Password set successfully! Logging in...');
      const { user, accessToken } = res.data.data;
      if (accessToken) localStorage.setItem('wf_access_token', accessToken);
      handlePostLoginRedirect(user);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute inset-0 bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">WholesaleFlow</span>
        </Link>

        {authStep === 'login' && (
          <>
            <h2 className="text-center text-2xl font-bold tracking-tight text-white">
              Sign in to platform
            </h2>
            <p className="mt-2 text-center text-xs text-slate-400">
              Access your wholesale management dashboard
            </p>
          </>
        )}

        {authStep === 'otp' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Two-Factor Authentication
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Security verification for Super Administrator
            </p>
          </div>
        )}

        {authStep === 'setup_invite' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Set Up Admin Password
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Welcome! Configure a strong password to activate your account.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">

          {/* ============================================================== */}
          {/* STEP 1: CREDENTIALS SIGN-IN                                     */}
          {/* ============================================================== */}
          {authStep === 'login' && (
            <form className="space-y-5" onSubmit={handleSubmit(onCredentialsSubmit)}>
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Account Email
                  </label>
                  {import.meta.env.DEV && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue('email', 'cpnihal35@gmail.com');
                      }}
                      className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Fill Admin Email
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="e.g. cpnihal35@gmail.com"
                    {...register('email')}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    {...register('password')}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-400">Remember session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                New retail buyer?{' '}
                <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
                  Create customer account
                </Link>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 2: SUPER ADMIN TWO-FACTOR OTP VERIFICATION               */}
          {/* ============================================================== */}
          {authStep === 'otp' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-center">
                <p className="text-xs text-slate-300 leading-relaxed">
                  A verification code has been dispatched to:
                </p>
                <p className="font-mono text-sm font-bold text-indigo-300 mt-1 select-all">
                  {targetEmail}
                </p>
              </div>

              {otpError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* Six-digit segmented input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-between gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-12 h-14 sm:w-13 sm:h-16 text-center text-2xl font-black font-mono rounded-xl bg-slate-950 border transition-all focus:outline-none ${
                        digit
                          ? 'border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                          : 'border-slate-800 text-slate-300 focus:border-indigo-500'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Expiry indicator & resend countdown */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Expires in:{' '}
                    <strong className="text-slate-200">
                      {Math.floor(expiresInSeconds / 60)}:
                      {String(expiresInSeconds % 60).padStart(2, '0')}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className="font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                >
                  <RotateCcw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => submitOtp()}
                  disabled={isVerifyingOtp || otpDigits.some((d) => !d)}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Verify & Access HQ</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('login');
                    setOtpDigits(['', '', '', '', '', '']);
                    setOtpError('');
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel / Change Login</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: SHOP ADMIN INVITATION PASSWORD SETUP                   */}
          {/* ============================================================== */}
          {authStep === 'setup_invite' && (
            <form onSubmit={onSetupPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSettingPassword}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                {isSettingPassword ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Activate & Log In</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAuthStep('login')}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-2"
              >
                Back to standard sign-in
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
