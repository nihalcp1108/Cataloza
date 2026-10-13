import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldAlert, Lock, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current temporary password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export const ForceChangePasswordModal: React.FC = () => {
  const { user, changeInitialPassword, logout } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const newPassValue = watch('newPassword') || '';
  const hasMinLength = newPassValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassValue);
  const hasLowercase = /[a-z]/.test(newPassValue);
  const hasNumber = /[0-9]/.test(newPassValue);

  if (!user || !user.mustChangePassword) {
    return null;
  }

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await changeInitialPassword(data.currentPassword, data.newPassword, data.confirmPassword);
      toast.success('Password successfully updated! Full platform access granted.');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to update password. Verify current password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Security Requirement</h3>
            <p className="text-xs text-slate-500">First-time login password update required</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
          Welcome to <span className="font-semibold text-slate-900">WholesaleFlow</span>. For compliance and
          tenant isolation security, you must replace your initial temporary password with a strong, permanent
          password before proceeding.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Temporary Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                placeholder="Enter current password"
                {...register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Strong Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                placeholder="Minimum 8 characters"
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.newPassword.message}</p>
            )}

            {/* Password strength checklist */}
            <div className="grid grid-cols-2 gap-1.5 mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div
                className={`flex items-center gap-1.5 text-[11px] ${
                  hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8+ Characters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 text-[11px] ${
                  hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Uppercase letter</span>
              </div>
              <div
                className={`flex items-center gap-1.5 text-[11px] ${
                  hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lowercase letter</span>
              </div>
              <div
                className={`flex items-center gap-1.5 text-[11px] ${
                  hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Number (0-9)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              placeholder="Re-enter new password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Sign Out Instead
            </button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={<KeyRound className="w-4 h-4" />}
            >
              Save New Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
