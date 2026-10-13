import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, CheckCircle2, Home, Building2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';

export const CustomerAddressesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const { data: addressesData, isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: async () => {
      const res = await api.get('/customers/me/addresses');
      return res.data?.data?.addresses || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/customers/me/addresses', {
        fullName,
        businessName,
        phone,
        street,
        city,
        state,
        postalCode,
        isDefault,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Address added successfully');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
      setIsAdding(false);
      setFullName('');
      setBusinessName('');
      setPhone('');
      setStreet('');
      setCity('');
      setState('');
      setPostalCode('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add address');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/me/addresses/${id}`);
    },
    onSuccess: () => {
      toast.success('Address deleted');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
  });

  const addresses = addressesData || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Addresses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saved dispatch addresses for wholesale orders and prefilled checkout.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAdding(true)}
        >
          Add Delivery Address
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No delivery addresses saved</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Add your primary warehouse or store address to speed up wholesale checkout.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsAdding(true)}>
            Add New Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr: any) => (
            <div
              key={addr._id}
              className={`p-5 rounded-2xl border transition-all ${
                addr.isDefault
                  ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">{addr.fullName}</span>
                {addr.isDefault && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Default
                  </span>
                )}
              </div>

              {addr.businessName && (
                <div className="text-xs text-slate-600 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{addr.businessName}</span>
                </div>
              )}

              <div className="text-xs text-slate-500 mb-2 leading-relaxed">
                {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
              </div>

              <div className="text-xs text-slate-600 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1 text-slate-500">
                  <Phone className="w-3 h-3" />
                  {addr.phone}
                </span>

                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(addr._id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">New Delivery Address</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter recipient contact details and dispatch location.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Optional"
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700">Set as default delivery address</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={createMutation.isPending}>
                  Save Address
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
