import React, { useState, useMemo } from 'react';
import { StageMasterItem, UserRole, Tender } from '../../types';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';
import { getRoleBadge } from '../../utils/tenderUtils';

interface TenderStagesMasterTabProps {
  stages: StageMasterItem[];
  onUpdateStages: (newStages: StageMasterItem[]) => void;
  tenders: Tender[];
  showToast: (msg: string) => void;
}

export const TenderStagesMasterTab: React.FC<TenderStagesMasterTabProps> = ({
  stages,
  onUpdateStages,
  tenders,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('PM');
  const [formStepNo, setFormStepNo] = useState<number>(stages.length + 1);
  const [formDescription, setFormDescription] = useState('');

  // Count active tenders currently in each stage
  const stageTenderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tenders.forEach((t) => {
      const st = t.brief_status || 'Unknown';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [tenders]);

  const sortedStages = useMemo(() => {
    const list = [...stages].sort((a, b) => a.stepNo - b.stepNo);
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.defaultRole.toLowerCase().includes(term) ||
        (s.description || '').toLowerCase().includes(term)
    );
  }, [stages, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormRole('PM');
    setFormStepNo(stages.length + 1);
    setFormDescription('');
    setShowModal(true);
  };

  const handleOpenEditModal = (stage: StageMasterItem) => {
    setEditingId(stage.id);
    setFormName(stage.name);
    setFormRole(stage.defaultRole);
    setFormStepNo(stage.stepNo);
    setFormDescription(stage.description || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      const updated = stages.map((s) =>
        s.id === editingId
          ? {
              ...s,
              name: formName.trim(),
              defaultRole: formRole,
              stepNo: Number(formStepNo),
              description: formDescription.trim() || undefined,
            }
          : s
      );
      onUpdateStages(updated);
      showToast(`Stage "${formName.trim()}" updated`);
    } else {
      const newStage: StageMasterItem = {
        id: `stage-${Date.now()}`,
        name: formName.trim(),
        stepNo: Number(formStepNo),
        defaultRole: formRole,
        description: formDescription.trim() || undefined,
        isStandard: false,
      };
      onUpdateStages([...stages, newStage]);
      showToast(`Stage "${formName.trim()}" added`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const target = stages.find((s) => s.id === id);
    if (!target) return;

    const count = stageTenderCounts[target.name] || 0;
    if (count > 0) {
      alert(`Cannot delete "${target.name}": ${count} tender(s) are in this stage.`);
      setDeleteConfirmId(null);
      return;
    }

    const filtered = stages.filter((s) => s.id !== id);
    // Renumber remaining stages sequentially
    const renumbered = filtered
      .sort((a, b) => a.stepNo - b.stepNo)
      .map((s, idx) => ({ ...s, stepNo: idx + 1 }));

    onUpdateStages(renumbered);
    showToast(`Stage "${target.name}" deleted`);
    setDeleteConfirmId(null);
  };

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const sorted = [...stages].sort((a, b) => a.stepNo - b.stepNo);
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const currentItem = sorted[index];
    const adjacentItem = sorted[targetIndex];

    const currentStep = currentItem.stepNo;
    currentItem.stepNo = adjacentItem.stepNo;
    adjacentItem.stepNo = currentStep;

    onUpdateStages([...sorted]);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <span>Tender Stage Master</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {stages.length} Stages
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search stages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stage</span>
          </button>
        </div>
      </div>

      {/* Table / Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-16 text-center">Step #</th>
                <th className="py-3 px-4">Stage Name</th>
                <th className="py-3 px-4">Responsible Role</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Tenders</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No stages found</p>
                  </td>
                </tr>
              ) : (
                sortedStages.map((stage, idx) => {
                  const tenderCount = stageTenderCounts[stage.name] || 0;
                  return (
                    <tr key={stage.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 font-mono font-bold text-slate-700 text-xs">
                          {stage.stepNo}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {stage.name}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const b = getRoleBadge(stage.defaultRole);
                          return (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${b.bg} ${b.text} ${b.border}`}
                            >
                              {b.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-md truncate">
                        {stage.description || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            tenderCount > 0
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tenderCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, 'UP')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedStages.length - 1}
                            onClick={() => handleMove(idx, 'DOWN')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(stage)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(stage.id)}
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
                <Layers className="w-4 h-4 text-purple-600" />
                <span>{editingId ? 'Edit Stage' : 'Add Stage'}</span>
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
                  Stage Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Board Approval"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Step #
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formStepNo}
                    onChange={(e) => setFormStepNo(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Responsible Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-purple-500 focus:bg-white cursor-pointer"
                  >
                    <option value="PM">PM</option>
                    <option value="FM">FM</option>
                    <option value="CEC">CEC</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Milestones, approvals, handoffs"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
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
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Create Stage'}
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
                <h4 className="text-sm font-bold text-slate-900">Delete Stage?</h4>
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
