import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileCode2,
  Plus,
  Copy,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  Store,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { IProductFormTemplate } from '../../types';
import { Button } from '../../components/common/Button';

export const ProductFormTemplatesListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingModal, setIsCreatingModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [isPlatformDefault, setIsPlatformDefault] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['product-form-templates'],
    queryFn: async () => {
      const res = await api.get('/forms/templates');
      return res.data?.data?.templates as IProductFormTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/forms/templates', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success('Form template created successfully!');
      queryClient.invalidateQueries({ queryKey: ['product-form-templates'] });
      setIsCreatingModal(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setIsPlatformDefault(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create template');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/forms/templates/${id}/duplicate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Template duplicated successfully');
      queryClient.invalidateQueries({ queryKey: ['product-form-templates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to duplicate template');
    },
  });

  const templates = data || [];
  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Core SaaS Architecture
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Product Form Builder
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Design, version, and assign dynamic product specification schemas to wholesale shops.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreatingModal(true)}
        >
          Create Form Template
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search templates by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 text-slate-800"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <FileCode2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No form templates found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create your first dynamic product form template to control the fields and validations required from wholesale suppliers.
          </p>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreatingModal(true)}
          >
            Create Initial Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => {
            const isPlatform = template.isPlatformDefault;
            const isPublished = template.status === 'published';
            const assignedCount = template.assignedShopIds?.length || 0;

            return (
              <div
                key={template._id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <FileCode2 className="w-5 h-5" />
                      </div>
                      <div>
                        {isPlatform && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Platform Default
                          </span>
                        )}
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          {template.name}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isPublished
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {template.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {template.description || 'No description provided for this template.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {isPlatform
                          ? 'All Default Shops'
                          : `${assignedCount} Assigned ${assignedCount === 1 ? 'Shop' : 'Shops'}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {template.currentPublishedVersionId
                          ? `v${(template.currentPublishedVersionId as any).versionNumber || 1} Published`
                          : 'Draft Mode'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => duplicateMutation.mutate(template._id)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    title="Duplicate Template"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>

                  <Link
                    to={`/superadmin/product-form-builder/${template._id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Open Builder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Template Modal */}
      {isCreatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Product Form Template</h3>
            <p className="text-xs text-slate-500 mb-4">
              Initialize a new dynamic form configuration that can be customized with fields and assigned to shops.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTemplateName.trim()) {
                  toast.error('Template title is required');
                  return;
                }
                createMutation.mutate({
                  name: newTemplateName,
                  description: newTemplateDescription,
                  isPlatformDefault,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Grocery & FMCG Product Schema"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain which products or supplier categories this form is designed for..."
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="platformDefault"
                  checked={isPlatformDefault}
                  onChange={(e) => setIsPlatformDefault(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4"
                />
                <label htmlFor="platformDefault" className="text-xs text-slate-700 cursor-pointer">
                  Set as <span className="font-semibold">Platform Default</span> (used for all shops without custom schemas)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreatingModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMutation.isPending}
                >
                  Create & Launch Builder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
