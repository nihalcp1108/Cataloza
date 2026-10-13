import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Sliders, Save, ShieldAlert, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, MailCheck, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const PlatformSettingsPage: React.FC = () => {
  const [platformName, setPlatformName] = useState('WholesaleFlow');
  const [supportEmail, setSupportEmail] = useState('support@wholesaleflow.com');
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [defaultCurrencySymbol, setDefaultCurrencySymbol] = useState('₹');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Super Admin Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Email Diagnostic State
  const [isCheckingSmtp, setIsCheckingSmtp] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [smtpResult, setSmtpResult] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/super-admin/settings');
        if (res.data?.success && res.data?.data?.setting) {
          const s = res.data.data.setting;
          setPlatformName(s.platformName || 'WholesaleFlow');
          setSupportEmail(s.supportEmail || 'support@wholesaleflow.com');
          setSupportPhone(s.supportPhone || '+91 98765 43210');
          setDefaultCurrency(s.defaultCurrency || 'INR');
          setDefaultCurrencySymbol(s.defaultCurrencySymbol || '₹');
        }
      } catch {
        // Fallback defaults
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch('/super-admin/settings', {
        platformName,
        supportEmail,
        supportPhone,
        defaultCurrency,
        defaultCurrencySymbol,
      });
      toast.success('Platform settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError('New password must contain at least one uppercase letter');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError('New password must contain at least one number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.data?.success) {
        toast.success('Super Admin password successfully updated!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure global platform attributes, default currencies, and administrative account security.
        </p>
      </div>

      {/* Global Configuration */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          Global Configuration
        </h2>

        <Input
          label="Platform Brand Name"
          value={platformName}
          onChange={(e) => setPlatformName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Support Email"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />

          <Input
            label="Support Phone"
            value={supportPhone}
            onChange={(e) => setSupportPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Default Currency Code"
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
          />

          <Input
            label="Default Currency Symbol"
            value={defaultCurrencySymbol}
            onChange={(e) => setDefaultCurrencySymbol(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            type="submit"
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Global Settings
          </Button>
        </div>
      </form>

      {/* Super Admin Account Security & Password Change */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            Super Admin Account Security & Password
          </h2>
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Protected HQ
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Updating your password will immediately secure your administrative credentials and invalidate older active sessions across other devices.
        </p>

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
            <div className="leading-relaxed font-medium">{passwordError}</div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Min 8 characters, 1 uppercase, 1 number.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            type="submit"
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            isLoading={isChangingPassword}
            icon={<KeyRound className="w-4 h-4" />}
          >
            Update Super Admin Password
          </Button>
        </div>
      </form>

      {/* Email & SMTP Diagnostics */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MailCheck className="w-4 h-4 text-indigo-600" />
            Email Service & SMTP Diagnostics
          </h2>
          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            Realtime Probe
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Test your SMTP provider connectivity and verify that OTP delivery to <strong>cpnihal35@gmail.com</strong> is fully operational.
        </p>

        {smtpResult && (
          <div
            className={`p-4 rounded-xl border text-xs ${
              smtpResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {smtpResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{smtpResult.message}</span>
            </div>
            {smtpResult.host && (
              <p className="text-[11px] opacity-80 mt-1">
                Host: {smtpResult.host}:{smtpResult.port} • Secure: {smtpResult.secure ? 'Yes (TLS)' : 'No (STARTTLS)'} • Authenticated As: {smtpResult.authenticatedUser}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
            isLoading={isCheckingSmtp}
            onClick={async () => {
              setIsCheckingSmtp(true);
              setSmtpResult(null);
              try {
                const res = await api.get('/super-admin/email/diagnostic');
                setSmtpResult(res.data?.data || { success: true, message: 'SMTP connection verified' });
                if (res.data?.success) {
                  toast.success('SMTP connection verified successfully!');
                } else {
                  toast.error(res.data?.data?.message || 'SMTP check failed');
                }
              } catch (err: any) {
                const msg = err.response?.data?.message || err.message;
                setSmtpResult({ success: false, message: msg });
                toast.error(msg);
              } finally {
                setIsCheckingSmtp(false);
              }
            }}
            icon={<MailCheck className="w-4 h-4" />}
          >
            Verify SMTP Connection
          </Button>

          <Button
            type="button"
            variant="primary"
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
            isLoading={isSendingTestEmail}
            onClick={async () => {
              setIsSendingTestEmail(true);
              try {
                const res = await api.post('/super-admin/email/test');
                toast.success(res.data?.message || 'Test email dispatched to cpnihal35@gmail.com!');
              } catch (err: any) {
                const msg = err.response?.data?.message || err.message;
                toast.error(`Email delivery failed: ${msg}`);
              } finally {
                setIsSendingTestEmail(false);
              }
            }}
            icon={<Send className="w-4 h-4" />}
          >
            Send Test Email to cpnihal35@gmail.com
          </Button>
        </div>
      </div>
    </div>
  );
};

