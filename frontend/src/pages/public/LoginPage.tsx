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
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email or username').trim(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  const maskedLength = Math.max(local.length - 2, 3);
  return `${first}${'*'.repeat(maskedLength)}${last}@${domain}`;
};

export const LoginPage: React.FC = () => {
  const { login, exploreDemo, verifyOtp, resendOtp, verifySuperAdminOtp, resendSuperAdminOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'otp' | 'setup_invite'
  const [authStep, setAuthStep] = useState<'login' | 'otp' | 'setup_invite'>('login');

  // Step 1: Login states
  const [errorMessage, setErrorMessage] = useState('');
  const [sandboxNotice, setSandboxNotice] = useState<{ message: string; details?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExploringDemo, setIsExploringDemo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Step 2: OTP verification states
  const [challengeId, setChallengeId] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
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
    setSandboxNotice(null);
    try {
      const result = await login(data.email, data.password);

      // If two-step authentication is triggered (Super Admin or Dealer Admin)
      if (result.requiresOtp && result.challengeId) {
        setChallengeId(result.challengeId);
        setTargetEmail(result.email || '');
        const displayMasked = result.maskedEmail || maskEmail(result.email || '');
        setMaskedEmail(displayMasked);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setResendCooldown(60);
        setExpiresInSeconds(300);
        setAuthStep('otp');
        toast.success(displayMasked ? `Verification code dispatched to ${displayMasked}` : 'Verification code dispatched to your registered email');
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
      const errorCode = err.response?.data?.error;
      const errorDetails = err.response?.data?.details;

      if (status === 401) {
        setErrorMessage(serverMessage || 'Invalid email or password');
      } else if (status === 429) {
        setErrorMessage(serverMessage || 'Too many attempts. Please wait a few minutes before trying again.');
      } else if (status === 502) {
        const isSandbox =
          errorCode === 'RESEND_SANDBOX_RESTRICTION' ||
          serverMessage?.includes('sandbox testing restriction') ||
          serverMessage?.includes('testing emails to your own email address');

        if (isSandbox) {
          setSandboxNotice({
            message: serverMessage,
            details: errorDetails,
          });
        } else {
          setErrorMessage(serverMessage || 'Email delivery failed. Please check Resend email configuration.');
        }
      } else if (!err.response) {
        setErrorMessage('Authentication service is currently unreachable. Please verify that the backend is running.');
      } else {
        setErrorMessage(serverMessage || err.message || 'An error occurred during authentication.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dedicated one-click Explore Demo session authentication
  const handleExploreDemo = async () => {
    setIsExploringDemo(true);
    setErrorMessage('');
    try {
      const result = await exploreDemo();
      if (result.user) {
        toast.success('Welcome to Cataloza Demo Store!');
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      setErrorMessage(serverMessage || 'Failed to initialize demo session. Please try again.');
    } finally {
      setIsExploringDemo(false);
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
      const user = await verifyOtp(challengeId, fullCode);
      toast.success('Authentication verified successfully. Welcome back!');
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
      await resendOtp(challengeId);
      toast.success(`A fresh verification code was sent to ${maskedEmail || maskEmail(targetEmail)}`);
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
              Security verification for Super Administrator sign-in
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
              {sandboxNotice && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Email Delivery Restriction (Resend Sandbox)</span>
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    {sandboxNotice.message}
                  </p>
                  <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-300/90 space-y-1">
                    <p className="font-semibold text-amber-200">How to deliver to all Dealer Admins:</p>
                    <p>
                      1. Verify your custom domain in the{' '}
                      <a
                        href="https://resend.com/domains"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-bold text-amber-300 hover:text-white"
                      >
                        Resend Domains Dashboard &rarr;
                      </a>
                    </p>
                    <p>
                      2. Configure <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">RESEND_FROM_EMAIL="Cataloza &lt;noreply@YOUR_VERIFIED_DOMAIN&gt;"</code> in your production environment variables.
                    </p>
                  </div>
                </div>
              )}

              {errorMessage && !sandboxNotice && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Email or Username
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="Email or username"
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
                    placeholder="Password"
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
                disabled={isSubmitting || isExploringDemo}
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

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Or</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleExploreDemo}
                disabled={isExploringDemo || isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isExploringDemo ? (
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Explore Demo</span>
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
                  {maskedEmail || maskEmail(targetEmail) || 'your registered email'}
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
