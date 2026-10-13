import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Shield, Filter, Calendar } from 'lucide-react';
import { api } from '../../api/client';

export const AuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/super-admin/audit-logs?limit=50');
      return res.data?.data?.logs || [];
    },
  });

  const logs = data || [];
  const filtered = logs.filter((l: any) => {
    const act = (l.action || '').toLowerCase();
    const actor = (l.actorId?.email || '').toLowerCase();
    const target = (l.targetEntity || '').toLowerCase();
    return (
      act.includes(searchTerm.toLowerCase()) ||
      actor.includes(searchTerm.toLowerCase()) ||
      target.includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
            <Shield className="w-3 h-3 text-blue-600" /> Platform Security & Compliance
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail & Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable historical log of administrative modifications, role actions, and shop state changes.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter logs by action keyword, actor email, or entity..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 text-slate-800"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Shop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filtered.map((log: any) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600">{log.action}</td>
                    <td className="py-3 px-4 text-slate-700 font-sans text-xs">
                      {log.actorId?.name || log.actorId?.email || 'Platform System'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.targetEntity} {log.targetId ? `(${log.targetId.slice(-6)})` : ''}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans">
                      {log.shopId?.name || 'Global'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
