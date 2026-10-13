import React, { useEffect, useState } from 'react';
import {
  Users,
  Store,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Plus,
  Send,
  Ban,
  CheckCircle2,
  Lock,
  Copy,
  ExternalLink,
  Edit,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { IUser, IShop } from '../../types';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';
import { Button } from '../../components/common/Button';

export const ShopAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [shops, setShops] = useState<IShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invitation link display
  const [inviteResult, setInviteResult] = useState<{ email: string; inviteUrl: string } | null>(null);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const [adminsRes, shopsRes] = await Promise.all([
        api.get('/super-admin/admins'),
        api.get('/super-admin/shops?limit=100'),
      ]);
      if (adminsRes.data?.success) {
        setAdmins(adminsRes.data.data.admins);
      }
      if (shopsRes.data?.success) {
        setShops(shopsRes.data.data.shops || []);
      }
    } catch {
      setAdmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Please enter admin name and email');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/super-admin/admins', {
        name,
        email,
        phone,
        shopId: selectedShopId || undefined,
        password: password || undefined,
      });

      toast.success('Shop Administrator provisioned successfully');
      if (res.data?.data?.inviteUrl) {
        setInviteResult({
          email,
          inviteUrl: res.data.data.inviteUrl,
        });
      }

      setIsCreateModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setSelectedShopId('');
      setPassword('');
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: any) => {
    try {
      const updatedStatus = !admin.isActive;
      await api.patch(`/super-admin/admins/${admin._id}`, {
        isActive: updatedStatus,
      });
      toast.success(`Administrator is now ${updatedStatus ? 'Active' : 'Deactivated'}`);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResendInvitation = async (adminId: string) => {
    try {
      const res = await api.post(`/super-admin/admins/${adminId}/resend-invitation`);
      toast.success('Invitation link generated');
      if (res.data?.data?.inviteUrl) {
        setInviteResult({
          email: 'Administrator',
          inviteUrl: res.data.data.inviteUrl,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate invitation');
    }
  };

  const handleRevokeSessions = async (adminId: string) => {
    if (!window.confirm('Revoke all active sessions for this administrator?')) return;
    try {
      await api.post(`/super-admin/admins/${adminId}/revoke-sessions`);
      toast.success('All active sessions for this admin were revoked.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke sessions');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shop Administrators</h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision, assign, and manage access privileges for wholesale shop administrators.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Provision New Admin
        </Button>
      </div>

      {/* Invitation link alert banner if generated */}
      {inviteResult && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-indigo-900 block">
              Password Setup Link Generated for {inviteResult.email}:
            </span>
            <span className="text-xs font-mono text-indigo-700 break-all select-all">
              {inviteResult.inviteUrl}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<Copy className="w-3.5 h-3.5" />}
              onClick={() => copyToClipboard(inviteResult.inviteUrl)}
            >
              Copy Link
            </Button>
            <button
              onClick={() => setInviteResult(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Assigned Wholesale Shops</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No shop administrators provisioned yet.
                  </td>
                </tr>
              ) : (
                admins.map((adm) => {
                  const assignedShops = adm.assignedShopIds || [];
                  return (
                    <tr key={adm._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{adm.name}</span>
                        <span className="text-slate-400 text-[11px] block">{adm.email}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {assignedShops.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedShops.map((s: any, i: number) => (
                              <span
                                key={s._id || i}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]"
                              >
                                <Store className="w-3 h-3" />
                                {s.name || 'Assigned Shop'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No shop assigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {adm.phone || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(adm)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            adm.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle status"
                        >
                          {adm.isActive ? 'Active' : 'Deactivated'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {adm.lastLogin ? new Date(adm.lastLogin).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleResendInvitation(adm._id)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Resend invitation link"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevokeSessions(adm._id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Revoke active sessions"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision New Admin Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Provision Shop Administrator</h3>
                <p className="text-xs text-slate-500 mt-0.5">Assign an administrator to a wholesale shop</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@distributors.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Wholesale Shop
                </label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a shop...</option>
                  {shops.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.name} ({shop.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to send invitation setup link"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  If left blank, an invitation link will be generated for the admin to configure their own password.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  Provision Admin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
