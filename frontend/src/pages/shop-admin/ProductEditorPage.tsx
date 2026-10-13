import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Upload,
  X,
  Plus,
  Trash2,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { ICategory, IProduct, IFormFieldConfig } from '../../types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50).toUpperCase(),
  description: z.string().max(4000).default(''),
  categoryId: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  compareAtPrice: z.coerce.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required').default('piece'),
  minimumOrderQuantity: z.coerce.number().int().min(1).default(1),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  variants: z
    .array(
      z.object({
        name: z.string().min(1, 'Variant name is required'),
        sku: z.string().optional(),
        price: z.coerce.number().min(0),
        stockQuantity: z.coerce.number().int().min(0).optional(),
      })
    )
    .default([]),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [formFields, setFormFields] = useState<IFormFieldConfig[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      price: 0,
      unit: 'piece',
      minimumOrderQuantity: 1,
      trackInventory: false,
      stockQuantity: 0,
      isActive: true,
      isFeatured: false,
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const trackInventory = watch('trackInventory');

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catRes, formRes] = await Promise.all([
          api.get('/shop-admin/categories'),
          api.get('/shop-admin/product-form').catch(() => null),
        ]);

        if (catRes.data?.success) {
          setCategories(catRes.data.data.categories);
        }
        if (formRes?.data?.success && formRes.data?.data?.fields) {
          setFormFields(formRes.data.data.fields);
        }

        if (isEditMode && id) {
          const prodRes = await api.get(`/shop-admin/products/${id}`);
          if (prodRes.data?.success) {
            const p: IProduct = prodRes.data.data.product;
            reset({
              name: p.name,
              sku: p.sku,
              description: p.description || '',
              categoryId: typeof p.categoryId === 'object' ? p.categoryId._id : p.categoryId,
              price: p.price,
              compareAtPrice: p.compareAtPrice,
              unit: p.unit || 'piece',
              minimumOrderQuantity: p.minimumOrderQuantity || 1,
              trackInventory: p.trackInventory || false,
              stockQuantity: p.stockQuantity || 0,
              isActive: p.isActive,
              isFeatured: p.isFeatured || false,
              variants: p.variants || [],
            });
            setImages(p.images || []);
            if (p.customFields) {
              setCustomFields(p.customFields);
            }
          }
        }
      } catch {
        toast.error('Failed to load product data');
      }
    };
    fetchMeta();
  }, [id, isEditMode, reset]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    try {
      const res = await api.post('/shop-admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success && res.data?.data?.url) {
        setImages((prev) => [...prev, res.data.data.url]);
        toast.success('Image uploaded');
      }
    } catch {
      toast.error('Could not upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        images,
        customFields,
      };

      if (isEditMode) {
        await api.patch(`/shop-admin/products/${id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/shop-admin/products', payload);
        toast.success('Product created successfully');
      }
      navigate('/admin/products');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to save product';
      const validationErrors = err.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        toast.error(`Validation Error: ${validationErrors.map((e: any) => e.message).join(', ')}`);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/products" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEditMode ? 'Edit Wholesale Product' : 'Add Wholesale Product'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure wholesale tier pricing, SKU, unit specifications, and images.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Basic Information
          </h2>

          <Input
            label="Product Title"
            placeholder="e.g. Royal Basmati Rice Aged 2 Years (50kg Bulk Sack)"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU (Stock Keeping Unit)"
              placeholder="e.g. ABC-RICE-050"
              helperText="Must be unique within your shop."
              error={errors.sku?.message}
              {...register('sku')}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                {...register('categoryId')}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.categoryId.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Wholesale Product Description & Specs
            </label>
            <textarea
              rows={4}
              placeholder="Detailed commercial description, origin, grade, packaging specs..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              {...register('description')}
            />
          </div>
        </div>

        {/* Dynamic Specifications & Attributes (Configured by Super Admin) */}
        {formFields.length > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Product Specifications & Attributes
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Dynamic Schema
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formFields.map((field) => {
                const val = customFields[field.fieldKey] ?? field.defaultValue ?? '';

                if (field.type === 'textarea') {
                  return (
                    <div key={field.fieldKey} className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      <textarea
                        rows={3}
                        value={val}
                        placeholder={field.placeholder || ''}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                      {field.helpText && <p className="text-[11px] text-slate-400 mt-1">{field.helpText}</p>}
                    </div>
                  );
                }

                if (field.type === 'select') {
                  return (
                    <div key={field.fieldKey}>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      <select
                        value={val}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                      >
                        <option value="">{field.placeholder || 'Select Option'}</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {field.helpText && <p className="text-[11px] text-slate-400 mt-1">{field.helpText}</p>}
                    </div>
                  );
                }

                if (field.type === 'radio') {
                  return (
                    <div key={field.fieldKey} className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex flex-wrap gap-4 pt-1">
                        {(field.options || []).map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name={`custom_${field.fieldKey}`}
                              value={opt.value}
                              checked={val === opt.value}
                              onChange={(e) =>
                                setCustomFields((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                              }
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      {field.helpText && <p className="text-[11px] text-slate-400 mt-1">{field.helpText}</p>}
                    </div>
                  );
                }

                if (field.type === 'boolean' || field.type === 'checkbox') {
                  return (
                    <div key={field.fieldKey} className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id={`cb_${field.fieldKey}`}
                        checked={Boolean(val)}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.fieldKey]: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <label htmlFor={`cb_${field.fieldKey}`} className="text-xs font-semibold text-slate-700 cursor-pointer">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                    </div>
                  );
                }

                return (
                  <div key={field.fieldKey}>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type={
                        ['number', 'decimal', 'price', 'moq', 'stock'].includes(field.type)
                          ? 'number'
                          : field.type === 'date'
                          ? 'date'
                          : 'text'
                      }
                      value={val}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      onChange={(e) =>
                        setCustomFields((prev) => ({
                          ...prev,
                          [field.fieldKey]:
                            ['number', 'decimal', 'price', 'moq', 'stock'].includes(field.type)
                              ? e.target.value === ''
                                ? ''
                                : Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                    />
                    {field.helpText && <p className="text-[11px] text-slate-400 mt-1">{field.helpText}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing & Units */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Wholesale Pricing & Units
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Wholesale Unit Price (₹)"
              type="number"
              step="any"
              placeholder="0.00"
              error={errors.price?.message}
              {...register('price')}
            />

            <Input
              label="Compare-At / MRP Price (₹, Optional)"
              type="number"
              step="any"
              placeholder="0.00"
              helperText="Displayed as strikethrough to showcase wholesale savings."
              error={errors.compareAtPrice?.message}
              {...register('compareAtPrice')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Unit of Sale"
              placeholder="e.g. piece, 50kg sack, case (24 cans), carton"
              error={errors.unit?.message}
              {...register('unit')}
            />

            <Input
              label="Minimum Order Quantity (MOQ)"
              type="number"
              min={1}
              placeholder="1"
              helperText="Customers cannot order below this amount."
              error={errors.minimumOrderQuantity?.message}
              {...register('minimumOrderQuantity')}
            />
          </div>
        </div>

        {/* Inventory Tracking */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Inventory & Availability
          </h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="trackInventory"
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              {...register('trackInventory')}
            />
            <label htmlFor="trackInventory" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Enable inventory tracking for this product
            </label>
          </div>

          {trackInventory && (
            <div className="max-w-xs pt-2">
              <Input
                label="Available Stock Quantity"
                type="number"
                min={0}
                placeholder="0"
                helperText="Orders will automatically decrement this stock."
                error={errors.stockQuantity?.message}
                {...register('stockQuantity')}
              />
            </div>
          )}

          <div className="pt-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                {...register('isActive')}
              />
              <span>Published & Active in Catalogue</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                {...register('isFeatured')}
              />
              <span>Mark as Featured Product</span>
            </label>
          </div>
        </div>

        {/* Product Images */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Product Images
          </h2>

          {/* Existing thumbnails */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-2 right-2 p-1 rounded-lg bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload and URL input */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Image File
            </Button>

            <div className="flex gap-2 flex-1">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Or paste external image URL..."
                className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddImageUrl}>
                Add URL
              </Button>
            </div>
          </div>
        </div>

        {/* Variants Builder */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Product Variants (Optional)
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => append({ name: '', price: 0, stockQuantity: 0 })}
            >
              Add Variant
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Variant Name</label>
                <input
                  placeholder="e.g. 500g Jar or Blue Pack"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  {...register(`variants.${index}.name` as const)}
                />
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  {...register(`variants.${index}.price` as const)}
                />
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Stock</label>
                <input
                  type="number"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  {...register(`variants.${index}.stockQuantity` as const)}
                />
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link to="/admin/products">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
            {isEditMode ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};
