import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Rocket,
  Eye,
  CheckCircle2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Plus,
  Settings,
  HelpCircle,
  FileText,
  Hash,
  DollarSign,
  List,
  CheckSquare,
  Calendar,
  Link2,
  Mail,
  Phone,
  Image as ImageIcon,
  ToggleLeft,
  Barcode,
  Package,
  Layers,
  Sparkles,
  Store,
  X,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { IFormFieldConfig, FormFieldType, IFormFieldOption, IShop } from '../../types';
import { Button } from '../../components/common/Button';

// Palette of available field types
const FIELD_PALETTE: Array<{
  type: FormFieldType;
  label: string;
  icon: any;
  category: string;
  defaultConfig: Partial<IFormFieldConfig>;
}> = [
  {
    type: 'text',
    label: 'Single-line Text',
    icon: FileText,
    category: 'Text & Input',
    defaultConfig: { placeholder: 'Enter text...', visibleOnDetails: true },
  },
  {
    type: 'textarea',
    label: 'Multiline Text',
    icon: FileText,
    category: 'Text & Input',
    defaultConfig: { placeholder: 'Enter detailed description...', visibleOnDetails: true },
  },
  {
    type: 'number',
    label: 'Number (Integer)',
    icon: Hash,
    category: 'Numeric',
    defaultConfig: { minValue: 0, visibleOnDetails: true },
  },
  {
    type: 'decimal',
    label: 'Decimal / Precision',
    icon: Hash,
    category: 'Numeric',
    defaultConfig: { step: 0.01, minValue: 0, visibleOnDetails: true },
  },
  {
    type: 'price',
    label: 'Wholesale Price',
    icon: DollarSign,
    category: 'Numeric',
    defaultConfig: { step: 0.01, minValue: 0, visibleOnCard: true, visibleOnDetails: true },
  },
  {
    type: 'select',
    label: 'Dropdown Select',
    icon: List,
    category: 'Choices',
    defaultConfig: {
      options: [
        { label: 'Option 1', value: 'opt_1' },
        { label: 'Option 2', value: 'opt_2' },
      ],
      visibleOnDetails: true,
    },
  },
  {
    type: 'multiselect',
    label: 'Multi-Select Tags',
    icon: List,
    category: 'Choices',
    defaultConfig: {
      options: [
        { label: 'Choice A', value: 'choice_a' },
        { label: 'Choice B', value: 'choice_b' },
      ],
      visibleOnDetails: true,
    },
  },
  {
    type: 'radio',
    label: 'Radio Options',
    icon: List,
    category: 'Choices',
    defaultConfig: {
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      visibleOnDetails: true,
    },
  },
  {
    type: 'checkbox',
    label: 'Single Checkbox',
    icon: CheckSquare,
    category: 'Choices',
    defaultConfig: { visibleOnDetails: true },
  },
  {
    type: 'boolean',
    label: 'Boolean Toggle',
    icon: ToggleLeft,
    category: 'Choices',
    defaultConfig: { visibleOnDetails: true },
  },
  {
    type: 'date',
    label: 'Date / Expiry',
    icon: Calendar,
    category: 'Attributes',
    defaultConfig: { visibleOnDetails: true },
  },
  {
    type: 'sku',
    label: 'SKU / Batch Code',
    icon: Barcode,
    category: 'Attributes',
    defaultConfig: { visibleOnCard: true, visibleOnDetails: true },
  },
  {
    type: 'uom',
    label: 'Unit of Measure',
    icon: Package,
    category: 'Attributes',
    defaultConfig: {
      placeholder: 'e.g., kg, carton, box, litre',
      visibleOnCard: true,
      visibleOnDetails: true,
    },
  },
  {
    type: 'moq',
    label: 'Minimum Order Qty',
    icon: Package,
    category: 'Attributes',
    defaultConfig: { minValue: 1, defaultValue: 1, visibleOnCard: true, visibleOnDetails: true },
  },
  {
    type: 'stock',
    label: 'Stock Quantity',
    icon: Hash,
    category: 'Attributes',
    defaultConfig: { minValue: 0, visibleOnDetails: true },
  },
  {
    type: 'url',
    label: 'Web URL / Link',
    icon: Link2,
    category: 'Contact & Media',
    defaultConfig: { placeholder: 'https://...', visibleOnDetails: true },
  },
  {
    type: 'email',
    label: 'Email Address',
    icon: Mail,
    category: 'Contact & Media',
    defaultConfig: { placeholder: 'contact@brand.com', visibleOnDetails: true },
  },
  {
    type: 'phone',
    label: 'Phone / Helpline',
    icon: Phone,
    category: 'Contact & Media',
    defaultConfig: { placeholder: '+91 ...', visibleOnDetails: true },
  },
  {
    type: 'image',
    label: 'Single Image',
    icon: ImageIcon,
    category: 'Contact & Media',
    defaultConfig: { visibleOnDetails: true },
  },
  {
    type: 'multi_image',
    label: 'Gallery Images',
    icon: ImageIcon,
    category: 'Contact & Media',
    defaultConfig: { visibleOnDetails: true },
  },
];

export const ProductFormBuilderPage: React.FC = () => {
  const { id: templateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fields, setFields] = useState<IFormFieldConfig[]>([]);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch template data
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['product-form-template', templateId],
    queryFn: async () => {
      const res = await api.get(`/forms/templates/${templateId}`);
      return res.data?.data;
    },
    enabled: Boolean(templateId),
  });

  // Fetch all shops for assignment modal
  const { data: shopsData } = useQuery({
    queryKey: ['all-shops-for-assignment'],
    queryFn: async () => {
      const res = await api.get('/super-admin/shops?limit=100');
      return res.data?.data?.shops as IShop[];
    },
  });

  // Initialize fields on load
  useEffect(() => {
    if (templateData) {
      const initialFields =
        templateData.latestDraft?.fields ||
        templateData.publishedVersion?.fields ||
        [];
      setFields(initialFields);
      if (initialFields.length > 0 && selectedFieldIndex === null) {
        setSelectedFieldIndex(0);
      }
      if (templateData.template?.assignedShopIds) {
        setSelectedShopIds(
          templateData.template.assignedShopIds.map((s: any) =>
            typeof s === 'string' ? s : s._id
          )
        );
      }
    }
  }, [templateData]);

  // Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/forms/templates/${templateId}/draft`, {
        fields,
        changeSummary: `Draft updated at ${new Date().toLocaleTimeString()}`,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Form draft saved successfully!');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['product-form-template', templateId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save draft');
    },
  });

  // Publish Version Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/forms/templates/${templateId}/publish`, {
        fields,
        changeSummary: `Published version with ${fields.length} dynamic fields`,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Version published successfully!');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['product-form-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['product-form-templates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to publish form version');
    },
  });

  // Assign to Shops Mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/forms/assign', {
        templateId,
        shopIds: selectedShopIds,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Template assigned to shops successfully!');
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['product-form-template', templateId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign template');
    },
  });

  // Field Manipulation Functions
  const addField = (item: typeof FIELD_PALETTE[0]) => {
    const rawKey = `field_${item.type}_${Date.now().toString().slice(-4)}`;
    const newField: IFormFieldConfig = {
      fieldKey: rawKey,
      label: item.label,
      type: item.type,
      required: false,
      visibleOnCard: item.defaultConfig.visibleOnCard || false,
      visibleOnDetails: item.defaultConfig.visibleOnDetails ?? true,
      searchable: false,
      filterable: false,
      isPublic: true,
      editableByShopAdmin: true,
      displayOrder: fields.length + 1,
      ...item.defaultConfig,
    };

    const updated = [...fields, newField];
    setFields(updated);
    setSelectedFieldIndex(updated.length - 1);
    setHasUnsavedChanges(true);
  };

  const removeField = (index: number) => {
    if (confirm('Are you sure you want to remove this field from the template?')) {
      const updated = fields.filter((_, i) => i !== index);
      setFields(updated);
      setSelectedFieldIndex(updated.length > 0 ? Math.max(0, index - 1) : null);
      setHasUnsavedChanges(true);
    }
  };

  const duplicateField = (index: number) => {
    const original = fields[index];
    const cloned: IFormFieldConfig = {
      ...original,
      fieldKey: `${original.fieldKey}_copy_${Date.now().toString().slice(-3)}`,
      label: `${original.label} (Copy)`,
      displayOrder: fields.length + 1,
    };
    const updated = [...fields, cloned];
    setFields(updated);
    setSelectedFieldIndex(updated.length - 1);
    setHasUnsavedChanges(true);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Reassign displayOrder
    updated.forEach((f, idx) => {
      f.displayOrder = idx + 1;
    });

    setFields(updated);
    setSelectedFieldIndex(targetIndex);
    setHasUnsavedChanges(true);
  };

  const updateSelectedField = (updates: Partial<IFormFieldConfig>) => {
    if (selectedFieldIndex === null || !fields[selectedFieldIndex]) return;
    const updated = [...fields];
    updated[selectedFieldIndex] = {
      ...updated[selectedFieldIndex],
      ...updates,
    };
    setFields(updated);
    setHasUnsavedChanges(true);
  };

  const selectedField =
    selectedFieldIndex !== null && fields[selectedFieldIndex]
      ? fields[selectedFieldIndex]
      : null;

  const template = templateData?.template;
  const isPublished = template?.status === 'published';

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/superadmin/product-form-builder')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back to templates list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {template?.name || 'Product Form Schema'}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {template?.status || 'Draft'}
              </span>
              {template?.isPlatformDefault && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Platform Default
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {fields.length} dynamic fields configured • {hasUnsavedChanges ? '⚠️ Unsaved changes' : 'All saved'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preview Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPreviewMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isPreviewMode ? 'Exit Preview' : 'Shop Admin Preview'}</span>
          </button>

          {/* Assign to Shops */}
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition-all"
          >
            <Store className="w-4 h-4" />
            <span>Assign Shops ({selectedShopIds.length})</span>
          </button>

          {/* Save Draft */}
          <Button
            variant="outline"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            isLoading={saveDraftMutation.isPending}
            onClick={() => saveDraftMutation.mutate()}
          >
            Save Draft
          </Button>

          {/* Publish */}
          <Button
            variant="primary"
            size="sm"
            icon={<Rocket className="w-4 h-4" />}
            isLoading={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            Publish Live
          </Button>
        </div>
      </div>

      {/* 3-Panel Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================================================== */}
        {/* PANEL 1: FIELD LIBRARY (LEFT - 3 COLS)               */}
        {/* ==================================================== */}
        {!isPreviewMode && (
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4 max-h-[820px] overflow-y-auto">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Field Library
              </h2>
              <p className="text-[11px] text-slate-500">
                Click any attribute to append it to the dynamic form canvas.
              </p>
            </div>

            {/* Categorized Fields */}
            {['Text & Input', 'Numeric', 'Choices', 'Attributes', 'Contact & Media'].map((cat) => (
              <div key={cat} className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {cat}
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {FIELD_PALETTE.filter((f) => f.category === cat).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => addField(item)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-indigo-50/80 hover:text-indigo-700 border border-slate-100 hover:border-indigo-200 transition-all group"
                      >
                        <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 shadow-2xs">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="flex-1 truncate">{item.label}</span>
                        <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================================================== */}
        {/* PANEL 2: FORM CANVAS (CENTER - 5 or 9 COLS)         */}
        {/* ==================================================== */}
        <div
          className={`${
            isPreviewMode
              ? 'lg:col-span-12 max-w-3xl mx-auto'
              : 'lg:col-span-5'
          } bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 max-h-[820px] overflow-y-auto`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isPreviewMode ? 'Shop Admin Live Preview' : 'Form Canvas'}
              </h2>
              <p className="text-xs text-slate-500">
                {isPreviewMode
                  ? 'Interactive simulation of what Shop Admins see when adding products.'
                  : 'Reorder, preview, and configure specifications fields.'}
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {fields.length} {fields.length === 1 ? 'Field' : 'Fields'}
            </span>
          </div>

          {fields.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Canvas is empty</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                Select field types from the library on the left to start assembling the dynamic product schema.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isSelected = selectedFieldIndex === index;

                return (
                  <div
                    key={field.fieldKey || index}
                    onClick={() => !isPreviewMode && setSelectedFieldIndex(index)}
                    className={`rounded-xl border transition-all ${
                      isSelected && !isPreviewMode
                        ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } p-4 cursor-pointer`}
                  >
                    {/* Field Header / Actions */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            Required
                          </span>
                        )}
                        {field.visibleOnCard && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                            Card Badge
                          </span>
                        )}
                        {!field.isPublic && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                            Private Internal
                          </span>
                        )}
                      </div>

                      {!isPreviewMode && (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === fields.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateField(index)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700"
                            title="Duplicate Field"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="p-1 rounded text-rose-400 hover:text-rose-600"
                            title="Remove Field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Field Interactive / Simulated Input Preview */}
                    <div className="pt-1">
                      {field.type === 'textarea' ? (
                        <textarea
                          disabled={!isPreviewMode}
                          rows={2}
                          placeholder={field.placeholder || 'Enter multiline text...'}
                          className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-700"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          disabled={!isPreviewMode}
                          className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-700"
                        >
                          <option value="">{field.placeholder || 'Select an option...'}</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'radio' ? (
                        <div className="flex flex-wrap gap-3">
                          {(field.options || []).map((opt) => (
                            <label
                              key={opt.value}
                              className="flex items-center gap-1.5 text-xs text-slate-600"
                            >
                              <input
                                type="radio"
                                name={field.fieldKey}
                                disabled={!isPreviewMode}
                                className="text-blue-600"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'boolean' || field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isPreviewMode}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span>{field.placeholder || `Enable ${field.label}`}</span>
                        </label>
                      ) : (
                        <input
                          type={
                            ['number', 'decimal', 'price', 'moq', 'stock'].includes(field.type)
                              ? 'number'
                              : 'text'
                          }
                          disabled={!isPreviewMode}
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-700"
                        />
                      )}

                      {field.helpText && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* PANEL 3: FIELD PROPERTIES (RIGHT - 4 COLS)          */}
        {/* ==================================================== */}
        {!isPreviewMode && (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5 max-h-[820px] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Field Properties</h2>
              </div>
              {selectedField && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
                  {selectedField.type}
                </span>
              )}
            </div>

            {!selectedField ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs">No field selected.</p>
                <p className="text-[11px] mt-1">
                  Click any field on the canvas to inspect and customize its validation rules, options, and visibility settings.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Field Label */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateSelectedField({ label: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Stable Field Key */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Database Key (Stable Identifier) *
                  </label>
                  <input
                    type="text"
                    value={selectedField.fieldKey}
                    onChange={(e) =>
                      updateSelectedField({
                        fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                      })
                    }
                    className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Permanent JSON key saved in product records. Avoid changing after products exist.
                  </p>
                </div>

                {/* Placeholder & Help Text */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => updateSelectedField({ placeholder: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Help / Instructions Text
                    </label>
                    <input
                      type="text"
                      value={selectedField.helpText || ''}
                      onChange={(e) => updateSelectedField({ helpText: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Options Manager (for select, radio, multiselect) */}
                {['select', 'radio', 'multiselect'].includes(selectedField.type) && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-800">Options List</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentOpts = selectedField.options || [];
                          const nextIdx = currentOpts.length + 1;
                          updateSelectedField({
                            options: [
                              ...currentOpts,
                              { label: `Option ${nextIdx}`, value: `opt_${nextIdx}` },
                            ],
                          });
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(selectedField.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Label"
                            value={opt.label}
                            onChange={(e) => {
                              const newOpts = [...(selectedField.options || [])];
                              newOpts[optIdx].label = e.target.value;
                              updateSelectedField({ options: newOpts });
                            }}
                            className="flex-1 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
                          />
                          <input
                            type="text"
                            placeholder="Value"
                            value={opt.value}
                            onChange={(e) => {
                              const newOpts = [...(selectedField.options || [])];
                              newOpts[optIdx].value = e.target.value;
                              updateSelectedField({ options: newOpts });
                            }}
                            className="w-24 text-xs font-mono rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = (selectedField.options || []).filter(
                                (_, i) => i !== optIdx
                              );
                              updateSelectedField({ options: newOpts });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Settings */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">Validation Rules</h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700">Required Field</span>
                      <p className="text-[10px] text-slate-400">Shop Admin must fill this before saving</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) => updateSelectedField({ required: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {['number', 'decimal', 'price', 'moq', 'stock'].includes(selectedField.type) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Min Value</label>
                        <input
                          type="number"
                          value={selectedField.minValue ?? ''}
                          onChange={(e) =>
                            updateSelectedField({
                              minValue: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Max Value</label>
                        <input
                          type="number"
                          value={selectedField.maxValue ?? ''}
                          onChange={(e) =>
                            updateSelectedField({
                              maxValue: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                  )}

                  {['text', 'textarea'].includes(selectedField.type) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Min Length</label>
                        <input
                          type="number"
                          value={selectedField.minLength ?? ''}
                          onChange={(e) =>
                            updateSelectedField({
                              minLength: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Max Length</label>
                        <input
                          type="number"
                          value={selectedField.maxLength ?? ''}
                          onChange={(e) =>
                            updateSelectedField({
                              maxLength: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Catalogue Visibility Settings */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">Display & Catalogue Placement</h4>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs text-slate-700 font-medium">Show on Product Details</span>
                      <p className="text-[10px] text-slate-400">Displayed in product specifications table</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedField.visibleOnDetails}
                      onChange={(e) => updateSelectedField({ visibleOnDetails: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs text-slate-700 font-medium">Show on Product Card</span>
                      <p className="text-[10px] text-slate-400">Prominent badge on catalogue grid cards</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedField.visibleOnCard}
                      onChange={(e) => updateSelectedField({ visibleOnCard: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs text-slate-700 font-medium">Public Wholesale Field</span>
                      <p className="text-[10px] text-slate-400">
                        If unchecked, field is private internal (never sent to public catalogue API)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedField.isPublic}
                      onChange={(e) => updateSelectedField({ isPublic: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign to Shops Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Assign Form to Wholesale Shops</h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              When assigned, Shop Admins will use this published schema when adding and editing products.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50 mb-5">
              {(shopsData || []).map((shop) => {
                const isSelected = selectedShopIds.includes(shop._id);
                return (
                  <label
                    key={shop._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedShopIds([...selectedShopIds, shop._id]);
                          } else {
                            setSelectedShopIds(selectedShopIds.filter((id) => id !== shop._id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900">{shop.name}</span>
                        <p className="text-[10px] text-slate-400">/{shop.slug}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        shop.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {shop.status}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {selectedShopIds.length} shop(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={assignMutation.isPending}
                  onClick={() => assignMutation.mutate()}
                >
                  Save Assignments
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
