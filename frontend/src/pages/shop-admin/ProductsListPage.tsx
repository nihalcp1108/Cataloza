import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../api/client';
import { IProduct, ICategory } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';

export const ProductsListPage: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);

  // Delete modal state
  const [deleteProductTarget, setDeleteProductTarget] = useState<IProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (activeFilter) params.isActive = activeFilter;

      const [prodRes, catRes] = await Promise.all([
        api.get('/shop-admin/products', { params }),
        api.get('/shop-admin/categories'),
      ]);

      if (prodRes.data?.success) {
        setProducts(prodRes.data.data.products);
        setPagination(prodRes.data.data.pagination);
      }
      if (catRes.data?.success) {
        setCategories(catRes.data.data.categories);
      }
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, categoryId, activeFilter]);

  const handleDelete = async () => {
    if (!deleteProductTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/shop-admin/products/${deleteProductTarget._id}`);
      toast.success(`Product "${deleteProductTarget.name}" deleted`);
      setDeleteProductTarget(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActiveStatus = async (product: IProduct) => {
    try {
      await api.patch(`/shop-admin/products/${product._id}`, {
        isActive: !product.isActive,
      });
      toast.success(`Product ${!product.isActive ? 'activated' : 'deactivated'}`);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wholesale Products</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage catalogue items, wholesale bulk prices, MOQ rules, and stock availability.
          </p>
        </div>

        <Link to="/admin/products/new">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products by name or SKU..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price / Unit</th>
                <th className="py-3 px-4">MOQ</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const img = product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80';
                  return (
                    <tr key={product._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">{product.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 uppercase mt-0.5 block">
                              SKU: {product.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {(product.categoryId as any)?.name || 'Unassigned'}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        ₹{product.price.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/ {product.unit}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {product.minimumOrderQuantity} {product.unit}s
                      </td>

                      <td className="py-3 px-4">
                        {product.trackInventory ? (
                          <span className={`font-semibold ${product.stockQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {product.stockQuantity} in stock
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Not tracked</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleActiveStatus(product)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteProductTarget(product)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
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

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteProductTarget && (
        <Modal
          isOpen={Boolean(deleteProductTarget)}
          onClose={() => setDeleteProductTarget(null)}
          title="Delete Product"
          maxWidth="sm"
        >
          <div className="text-center py-2">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Confirm Product Deletion</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deleteProductTarget.name}"</span>?
              This will remove it from the public catalogue. Historical orders will keep their saved snapshot.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteProductTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
