import React, { useState, useMemo } from 'react';
import { TenderTypeMasterItem, Tender } from '../../types';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  X,
  FileCheck,
  AlertCircle
} from 'lucide-react';

interface TenderTypesMasterTabProps {
  tenderTypes: TenderTypeMasterItem[];
  onUpdateTenderTypes: (newTypes: TenderTypeMasterItem[]) => void;
  tenders: Tender[];
  showToast: (msg: string) => void;
}

export const TenderTypesMasterTab: React.FC<TenderTypesMasterTabProps> = ({
  tenderTypes,
  onUpdateTenderTypes,
  tenders,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Count tenders per type
  const typeTenderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tenders.forEach((t) => {
      const type = t.tender_type || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [tenders]);

  const filteredTypes = useMemo(() => {
    return tenderTypes.filter((tt) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        tt.name.toLowerCase().includes(term) ||
        (tt.code || '').toLowerCase().includes(term) ||
        (tt.description || '').toLowerCase().includes(term)
      );
    });
  }, [tenderTypes, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setShowModal(true);
  };

  const handleOpenEditModal = (tt: TenderTypeMasterItem) => {
    setEditingId(tt.id);
    setFormName(tt.name);
    setFormCode(tt.code || '');
    setFormDescription(tt.description || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      const updated = tenderTypes.map((tt) =>
        tt.id === editingId
          ? {
              ...tt,
              name: formName.trim(),
              code: formCode.trim() || undefined,
              description: formDescription.trim() || undefined,
            }
          : tt
      );
      onUpdateTenderTypes(updated);
      showToast(`Tender type "${formName.trim()}" updated`);
    } else {
      const newType: TenderTypeMasterItem = {
        id: `tt-${Date.now()}`,
        name: formName.trim(),
        code: formCode.trim() || undefined,
        description: formDescription.trim() || undefined,
        isActive: true,
      };
      onUpdateTenderTypes([...tenderTypes, newType]);
      showToast(`Tender type "${formName.trim()}" added`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const target = tenderTypes.find((tt) => tt.id === id);
    if (!target) return;

    const count = typeTenderCounts[target.name] || 0;
    if (count > 0) {
      alert(`Cannot delete "${target.name}": ${count} tender(s) use it.`);
      setDeleteConfirmId(null);
      return;
    }

    onUpdateTenderTypes(tenderTypes.filter((tt) => tt.id !== id));
    showToast(`Tender type "${target.name}" deleted`);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <span>Tender Type Master</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {tenderTypes.length} Types
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tender types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tender Type</span>
          </button>
        </div>
      </div>

      {/* Table / Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Tender Type</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Tenders</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No tender types found</p>
                  </td>
                </tr>
              ) : (
                filteredTypes.map((tt) => {
                  const tenderCount = typeTenderCounts[tt.name] || 0;
                  return (
                    <tr key={tt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>{tt.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tt.code ? (
                          <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {tt.code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-md truncate">
                        {tt.description || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            tenderCount > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tenderCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(tt)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(tt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>{editingId ? 'Edit Tender Type' : 'Add Tender Type'}</span>
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tender Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Open, Limited"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. OPN, LTD"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Bidding conditions, supplier requirements"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Create Tender Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Tender Type?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
