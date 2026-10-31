import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Layers,
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    phone: z.string().min(7, 'Phone number must be at least 7 digits'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerCustomer, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Mode: 'register' | 'otp'
  const [authStep, setAuthStep] = useState<'register' | 'otp'>('register');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Verification state
  const [challengeId, setChallengeId] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Resend cooldown timer
  useEffect(() => {
    let timer: any;
    if (authStep === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, resendCooldown]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await registerCustomer(data);
      if (result.requiresOtp && result.challengeId) {
        setChallengeId(result.challengeId);
        setRegisteredEmail(result.email || data.email);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setResendCooldown(60);
        setAuthStep('otp');
        toast.success('Verification code dispatched to your email!');
        setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
      } else {
        toast.success('Account created successfully!');
        navigate('/account/orders', { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split('');
      pasted.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      if (newDigits.every((d) => d !== '')) {
        handleVerifyOtp(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);
    setOtpError('');

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
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
    pasted.split('').forEach((d, i) => {
      newDigits[i] = d;
    });
    setOtpDigits(newDigits);

    const targetFocus = Math.min(pasted.length, 5);
    otpInputRefs.current[targetFocus]?.focus();

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      await verifyOtp(challengeId, code);
      toast.success('Email verified successfully! Welcome to Cataloza.');
      navigate('/account/orders', { replace: true });
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'Invalid or expired verification code');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setOtpError('');
    try {
      await resendOtp(challengeId);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      toast.success('Fresh verification code dispatched to your email.');
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">Cataloza</span>
        </Link>

        {authStep === 'register' ? (
          <>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
              Create customer account
            </h2>
            <p className="mt-2 text-center text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
              Verify Your Email
            </h2>
            <p className="mt-2 text-center text-xs text-slate-600">
              We sent a 6-digit verification code to{' '}
              <strong className="text-slate-900">{registeredEmail}</strong>
            </p>
          </>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {/* STEP 1: REGISTRATION FORM */}
          {authStep === 'register' && (
            <>
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <Input
                  label="Full Name or Business Owner"
                  type="text"
                  placeholder="e.g. Deepak Patel"
                  leftIcon={<User className="w-4 h-4" />}
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Input
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  placeholder="name@business.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  leftIcon={<Phone className="w-4 h-4" />}
                  helperText="Used for order tracking & delivery notifications."
                  error={errors.phone?.message}
                  {...register('phone')}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Min. 8 chars, 1 uppercase & 1 number"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Create Customer Account
                </Button>
              </form>

              <p className="mt-4 text-[11px] text-center text-slate-400">
                By registering, you agree to our Terms of Service & Privacy Policy.
              </p>
            </>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {authStep === 'otp' && (
            <div className="space-y-6">
              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  Verification code expires in 10 minutes
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Didn't receive the email?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className="font-semibold text-blue-600 hover:text-blue-500 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isVerifyingOtp}
                disabled={isVerifyingOtp || otpDigits.some((d) => !d)}
                onClick={() => handleVerifyOtp()}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Verify & Complete Registration
              </Button>

              <button
                type="button"
                onClick={() => {
                  setAuthStep('register');
                  setOtpDigits(['', '', '', '', '', '']);
                  setOtpError('');
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change email address
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
