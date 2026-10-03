import React, { useState, useMemo } from 'react';
import { UserFunctionMasterItem, Tender } from '../../types';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  FileText
} from 'lucide-react';

interface UserFunctionsMasterTabProps {
  userFunctions: UserFunctionMasterItem[];
  onUpdateUserFunctions: (newFunctions: UserFunctionMasterItem[]) => void;
  tenders: Tender[];
  showToast: (msg: string) => void;
}

export const UserFunctionsMasterTab: React.FC<UserFunctionsMasterTabProps> = ({
  userFunctions,
  onUpdateUserFunctions,
  tenders,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Count tenders per function
  const functionTenderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tenders.forEach((t) => {
      const fn = t.user_function || 'Other';
      counts[fn] = (counts[fn] || 0) + 1;
    });
    return counts;
  }, [tenders]);

  const filteredFunctions = useMemo(() => {
    return userFunctions.filter((uf) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        uf.name.toLowerCase().includes(term) ||
        (uf.department || '').toLowerCase().includes(term) ||
        (uf.description || '').toLowerCase().includes(term)
      );
    });
  }, [userFunctions, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormDepartment('');
    setFormDescription('');
    setShowModal(true);
  };

  const handleOpenEditModal = (uf: UserFunctionMasterItem) => {
    setEditingId(uf.id);
    setFormName(uf.name);
    setFormDepartment(uf.department || '');
    setFormDescription(uf.description || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      const updated = userFunctions.map((uf) =>
        uf.id === editingId
          ? {
              ...uf,
              name: formName.trim(),
              department: formDepartment.trim() || undefined,
              description: formDescription.trim() || undefined,
            }
          : uf
      );
      onUpdateUserFunctions(updated);
      showToast(`User function "${formName.trim()}" updated`);
    } else {
      const newFunction: UserFunctionMasterItem = {
        id: `uf-${Date.now()}`,
        name: formName.trim(),
        department: formDepartment.trim() || undefined,
        description: formDescription.trim() || undefined,
        isActive: true,
      };
      onUpdateUserFunctions([...userFunctions, newFunction]);
      showToast(`User function "${formName.trim()}" added`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const target = userFunctions.find((uf) => uf.id === id);
    if (!target) return;

    const tenderCount = functionTenderCounts[target.name] || 0;
    if (tenderCount > 0) {
      alert(`Cannot delete "${target.name}": ${tenderCount} tender(s) use it.`);
      setDeleteConfirmId(null);
      return;
    }

    onUpdateUserFunctions(userFunctions.filter((uf) => uf.id !== id));
    showToast(`User function "${target.name}" deleted`);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>User Function Master</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {userFunctions.length} Functions
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user functions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add User Function</span>
          </button>
        </div>
      </div>

      {/* Table / Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Function</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Tenders</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFunctions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No user functions found</p>
                  </td>
                </tr>
              ) : (
                filteredFunctions.map((uf) => {
                  const tenderCount = functionTenderCounts[uf.name] || 0;
                  return (
                    <tr key={uf.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>{uf.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {uf.department ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {uf.department}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-md truncate">
                        {uf.description || <span className="text-slate-400 italic">—</span>}
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
                            onClick={() => handleOpenEditModal(uf)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(uf.id)}
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
                <Building className="w-4 h-4 text-indigo-600" />
                <span>{editingId ? 'Edit User Function' : 'Add User Function'}</span>
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
                  Function Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HSSE"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Refining"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Scope, responsibilities"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Create User Function'}
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
                <h4 className="text-sm font-bold text-slate-900">Delete User Function?</h4>
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
