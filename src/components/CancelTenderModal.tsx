import React, { useState } from 'react';
import { Tender, UserProfile } from '../types';
import { AlertTriangle, X, Ban, FileWarning, CheckCircle2 } from 'lucide-react';

interface CancelTenderModalProps {
  tender: Tender;
  currentUser: UserProfile;
  onClose: () => void;
  onConfirmCancel: (tenderId: number, reason: string, remarks: string) => void;
}

const CANCEL_REASONS = [
  'Scope changed by user department',
  'Budget reallocated or revised',
  'No responsive or qualified bids',
  'Cancelled by Competent Authority / Board',
  'Design or specification overhaul',
  'Merged with another tender',
  'Commercial terms or policy revised',
  'Other',
];

export const CancelTenderModal: React.FC<CancelTenderModalProps> = ({
  tender,
  currentUser,
  onClose,
  onConfirmCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) return;
    setIsSubmitting(true);
    onConfirmCancel(tender.sr_no, selectedReason, remarks.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">
                Cancel Tender #{tender.sr_no}
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Stage: <strong>{tender.brief_status}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tender Summary Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-blue-700">{tender.pr_no}</span>
              <span className="text-slate-500 font-medium">{tender.user_function}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 line-clamp-1">
              {tender.item_description}
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Justification / Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Approval reference, department communication or meeting minutes"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Warning notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              This stops the workflow and the SLA. Cancelled by <strong>{currentUser.name}</strong>.
            </div>
          </div>

          {/* Footer CTAs */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !remarks.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>Cancel Tender</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
