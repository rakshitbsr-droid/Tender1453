import React, { useState } from 'react';
import { Tender, UserProfile, PostAwardStep } from '../types';
import { isTenderCreatorOrPM } from '../utils/tenderUtils';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  FileCheck,
  Check,
  Clock,
  Bell,
  X,
  Briefcase
} from 'lucide-react';

interface PostAwardStepsSectionProps {
  tender: Tender;
  currentUser: UserProfile;
  onAddStep: (
    tenderId: number,
    title: string,
    notes?: string,
    dueDate?: string,
    reminder?: string
  ) => void;
  onToggleStep: (tenderId: number, stepId: string) => void;
  onDeleteStep: (tenderId: number, stepId: string) => void;
  onCloseTender: (tenderId: number, remarks?: string) => void;
}

export const PostAwardStepsSection: React.FC<PostAwardStepsSectionProps> = ({
  tender,
  currentUser,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onCloseTender,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [closureRemarks, setClosureRemarks] = useState('');

  const steps = tender.post_award_steps || [];
  const completedCount = steps.filter((s) => s.completed).length;
  const isClosed = tender.is_closed === true;

  const creatorName = tender.created_by || tender.pm_officer;
  const isCreatorOrPmUser = isTenderCreatorOrPM(tender, currentUser.name);
  const isEntityHeadOrAdmin =
    currentUser.role === 'ADMIN' ||
    currentUser.designation.toLowerCase().includes('chief') ||
    currentUser.designation.toLowerCase().includes('head');

  const canEdit = !isClosed && (isCreatorOrPmUser || isEntityHeadOrAdmin);

  const handleAddWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddStep(
      tender.sr_no,
      newTitle.trim(),
      newNotes.trim() || undefined,
      newDueDate || undefined,
      newReminder || undefined
    );

    setNewTitle('');
    setNewNotes('');
    setNewDueDate('');
    setNewReminder('');
    setIsAddFormOpen(false);
  };

  const handleConfirmClose = () => {
    onCloseTender(tender.sr_no, closureRemarks.trim());
    setIsCloseConfirmOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Post-Award Work
              </h3>
              {isClosed ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Closed</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>In Progress</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Work Status / Close Tender CTA */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isClosed ? (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Closed On</span>
              <span className="text-xs font-semibold text-slate-700">
                {tender.closure_info?.closed_on || '—'}
              </span>
            </div>
          ) : (
            canEdit && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Work</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCloseConfirmOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Close Tender</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-600">
        <span className="text-[11px] font-bold text-slate-700 shrink-0">
          {completedCount} of {steps.length} completed
        </span>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Add Work Form (when opened) */}
        {isAddFormOpen && canEdit && (
          <form
            onSubmit={handleAddWork}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Work</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Work Title */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Work Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Describe the work"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Optional Notes */}
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="Reference number, instructions, remarks"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Optional Due Date & Optional Reminder (Date & Time) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Due Date</span>
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                  <Bell className="w-3 h-3 text-amber-500" />
                  <span>Reminder</span>
                </label>
                <input
                  type="datetime-local"
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                />
              </div>
            </div>

            {/* Form Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Save Work
              </button>
            </div>
          </form>
        )}

        {/* Work Items List */}
        <div className="space-y-2">
          {steps.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/40 space-y-2">
              <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No work added yet</p>
              {canEdit && !isAddFormOpen && (
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Work</span>
                </button>
              )}
            </div>
          ) : (
            steps.map((step) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  step.completed
                    ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                    : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    disabled={isClosed}
                    onClick={() => onToggleStep(tender.sr_no, step.id)}
                    className={`mt-0.5 transition-colors shrink-0 ${
                      isClosed
                        ? 'cursor-default'
                        : 'cursor-pointer hover:text-emerald-600'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <h5
                      className={`text-xs font-semibold leading-tight ${
                        step.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {step.title}
                    </h5>
                    {step.notes && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.notes}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[10px]">
                      {step.due_date && (
                        <span className="flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Due: {step.due_date}</span>
                        </span>
                      )}
                      {step.reminder && (
                        <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          <Bell className="w-3 h-3 text-amber-600" />
                          <span>Reminder: {step.reminder.replace('T', ' ')}</span>
                        </span>
                      )}
                      {step.completed && step.completed_at && (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                          Finished on {step.completed_at}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDeleteStep(tender.sr_no, step.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                    title="Remove work"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Close Tender Confirmation Modal */}
      {isCloseConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Close Tender #{tender.sr_no}?
                </h4>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
              <p>
                <strong>Tender:</strong> {tender.pr_no} — {tender.item_description}
              </p>
              <p className="text-[11px] text-slate-500">
                Closing removes it from your inbox. It stays under Awarded Tenders.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Closure Remarks
              </label>
              <textarea
                rows={2}
                placeholder="e.g. All post-award work finished"
                value={closureRemarks}
                onChange={(e) => setClosureRemarks(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCloseConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Close Tender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
