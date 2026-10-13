import React from 'react';
import { OrderStatus, PaymentStatus } from '../../types';

interface BadgeProps {
  status?: OrderStatus | PaymentStatus | 'active' | 'inactive' | string;
  type?: 'order' | 'payment' | 'shop' | 'generic';
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, type = 'generic', label, className = '' }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let displayText = label || status || '';

  if (type === 'order' || status === 'pending' || status === 'confirmed' || status === 'processing' || status === 'delivered' || status === 'cancelled' || status === 'ready_for_dispatch' || status === 'shipped') {
    switch (status) {
      case 'pending':
        colorStyles = 'bg-amber-50 text-amber-700 border-amber-200';
        displayText = 'Pending Confirmation';
        break;
      case 'confirmed':
        colorStyles = 'bg-blue-50 text-blue-700 border-blue-200';
        displayText = 'Confirmed';
        break;
      case 'processing':
        colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        displayText = 'Processing';
        break;
      case 'ready_for_dispatch':
        colorStyles = 'bg-cyan-50 text-cyan-700 border-cyan-200';
        displayText = 'Ready for Dispatch';
        break;
      case 'shipped':
        colorStyles = 'bg-purple-50 text-purple-700 border-purple-200';
        displayText = 'Shipped';
        break;
      case 'delivered':
        colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        displayText = 'Delivered';
        break;
      case 'cancelled':
        colorStyles = 'bg-rose-50 text-rose-700 border-rose-200';
        displayText = 'Cancelled';
        break;
    }
  } else if (type === 'payment' || status === 'paid' || status === 'unpaid' || status === 'partially_paid' || status === 'refunded') {
    switch (status) {
      case 'paid':
        colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        displayText = 'Paid';
        break;
      case 'unpaid':
        colorStyles = 'bg-amber-50 text-amber-700 border-amber-200';
        displayText = 'Unpaid';
        break;
      case 'partially_paid':
        colorStyles = 'bg-sky-50 text-sky-700 border-sky-200';
        displayText = 'Partially Paid';
        break;
      case 'refunded':
        colorStyles = 'bg-slate-100 text-slate-600 border-slate-300';
        displayText = 'Refunded';
        break;
    }
  } else if (status === 'active') {
    colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    displayText = 'Active';
  } else if (status === 'inactive') {
    colorStyles = 'bg-slate-100 text-slate-600 border-slate-300';
    displayText = 'Inactive';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70" />
      {displayText}
    </span>
  );
};
