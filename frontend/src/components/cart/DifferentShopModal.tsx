import React from 'react';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const DifferentShopModal: React.FC = () => {
  const { isSwitchShopModalOpen, conflictingShop, confirmSwitchShop, cancelSwitchShop } = useCart();

  if (!isSwitchShopModalOpen) return null;

  return (
    <Modal isOpen={isSwitchShopModalOpen} onClose={cancelSwitchShop} maxWidth="md">
      <div className="text-center py-2">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">Items from Another Supplier in Cart</h3>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
          Your current cart already contains items from{' '}
          <strong className="text-slate-900 font-semibold">{conflictingShop?.name || 'another wholesale business'}</strong>.
          <br /><br />
          Because each wholesale business operates independent inventory, delivery routes, and WhatsApp lines, wholesale orders cannot combine multiple suppliers.
        </p>

        <p className="mt-4 text-xs text-slate-500 font-medium">
          Would you like to clear your current cart and switch to this supplier, or keep your existing items?
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={cancelSwitchShop}
          >
            Keep Existing Cart
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white"
            onClick={confirmSwitchShop}
          >
            Clear Cart & Switch Shop
          </Button>
        </div>
      </div>
    </Modal>
  );
};
