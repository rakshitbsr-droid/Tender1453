import React, { useMemo, useState } from 'react';
import { EvaluationMovement, EvaluationSubStage, Tender, TenderEvaluation, UserProfile } from '../types';
import {
  EVALUATION_STAGE,
  computeEvaluationSplit,
  formatDateTime,
  formatDurationWithUnit,
  isTenderCreatorOrPM,
  normalizeToNineStages,
  parseCustomDate,
  toDateTimeLocalInput,
} from '../utils/tenderUtils';
import { USERS } from '../data/seedData';
import { CheckCircle2, CornerUpLeft, Plus, RotateCcw, Send, X } from 'lucide-react';

interface EvaluationSectionProps {
  tender: Tender;
  currentUser: UserProfile;
  onUpdateTender: (updated: Tender, message?: string) => void;
}

interface MovementForm {
  subStage: EvaluationSubStage;
  action: 'sent' | 'returned';
  available: string[]; // bidders that can move in this direction
}

// '6.5 hrs', '3d 4.5h'; a day here is 24 working hours, as everywhere else in the app
const formatHours = (hours: number) => {
  if (hours < 24) return formatDurationWithUnit(hours, 'hours');
  const days = Math.floor(hours / 24);
  const rest = Math.round((hours % 24) * 10) / 10;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
};

/**
 * Parallel EMD and BQC evaluation. The tender creator sends all or some bidders to Finance under
 * either sub-stage at any time; Finance returns them after checking. The time of the stage is
 * shared between the two by the bidders each one holds (see computeEvaluationSplit).
 */
export const EvaluationSection: React.FC<EvaluationSectionProps> = ({ tender, currentUser, onUpdateTender }) => {
  const evaluation: TenderEvaluation = tender.evaluation || { bidders: [], movements: [] };
  const split = useMemo(() => computeEvaluationSplit(tender), [tender]);

  const inStage = tender.brief_status === EVALUATION_STAGE;
  const creatorName = tender.created_by || tender.pm_officer;
  const isCreator = currentUser.role === 'ADMIN' || isTenderCreatorOrPM(tender, currentUser.name);
  const canManage = inStage && isCreator;

  const [newBidder, setNewBidder] = useState('');
  const [form, setForm] = useState<MovementForm | null>(null);
  const [selectedBidders, setSelectedBidders] = useState<string[]>([]);
  const [officer, setOfficer] = useState('');
  const [movedAt, setMovedAt] = useState('');
  const [remarks, setRemarks] = useState('');

  // Finance officers attached to the tender come first
  const financeOfficers = useMemo(
    () =>
      Array.from(
        new Set([...(tender.attached_fms || []), ...USERS.filter((u) => u.role === 'FM').map((u) => u.name)])
      ),
    [tender]
  );

  const movedBidders = useMemo(
    () => new Set(evaluation.movements.flatMap((m) => m.bidders)),
    [evaluation.movements]
  );

  const save = (next: TenderEvaluation, message: string, extra: Partial<Tender> = {}) => {
    onUpdateTender({ ...tender, ...extra, evaluation: next }, message);
  };

  const handleAddBidder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBidder.trim();
    if (!name) return;
    if (evaluation.bidders.some((b) => b.toLowerCase() === name.toLowerCase())) {
      alert(`"${name}" is already listed.`);
      return;
    }
    save({ ...evaluation, bidders: [...evaluation.bidders, name] }, `Bidder "${name}" added`);
    setNewBidder('');
  };

  const handleRemoveBidder = (name: string) => {
    save({ ...evaluation, bidders: evaluation.bidders.filter((b) => b !== name) }, `Bidder "${name}" removed`);
  };

  const openForm = (subStage: EvaluationSubStage, action: 'sent' | 'returned', available: string[], officerName: string) => {
    setForm({ subStage, action, available });
    setSelectedBidders(available); // everything ticked = full work; untick for partial work
    setOfficer(officerName);
    setMovedAt(toDateTimeLocalInput(new Date()));
    setRemarks('');
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (selectedBidders.length === 0) {
      alert('Select at least one bidder.');
      return;
    }
    if (!officer) {
      alert('Select a finance officer.');
      return;
    }

    // A movement cannot be dated before the stage began or before the previous movement
    const at = formatDateTime(movedAt);
    const when = parseCustomDate(at);
    const stageEntry = (tender.timeline || []).find((entry) => normalizeToNineStages(entry.stage) === EVALUATION_STAGE);
    const earlier = [
      parseCustomDate(stageEntry?.entry_date),
      ...evaluation.movements.filter((m) => m.sub_stage === form.subStage).map((m) => parseCustomDate(m.at)),
    ].filter((d): d is Date => !!d);
    const floor = earlier.length > 0 ? new Date(Math.max(...earlier.map((d) => d.getTime()))) : null;
    if (!when || (floor && when < floor)) {
      alert(`Date and time cannot be before ${floor ? formatDateTime(floor) : 'the start of the stage'}.`);
      return;
    }
    if (when.getTime() > Date.now() + 60 * 1000) {
      alert('Date and time cannot be in the future.');
      return;
    }

    const movement: EvaluationMovement = {
      id: `ev-${Date.now()}`,
      sub_stage: form.subStage,
      action: form.action,
      bidders: selectedBidders,
      officer,
      by: currentUser.name,
      at,
      remarks: remarks.trim() || undefined,
    };
    const count = `${selectedBidders.length} of ${evaluation.bidders.length} bidders`;
    save(
      { ...evaluation, movements: [...evaluation.movements, movement] },
      form.action === 'sent'
        ? `${form.subStage}: ${count} sent to ${officer}`
        : `${form.subStage}: ${count} returned by ${officer}`
    );
    setForm(null);
  };

  const handleComplete = (subStage: EvaluationSubStage) => {
    const now = new Date();
    const signOffField = subStage === 'EMD Evaluation' ? 'emd_eval_signed_on' : 'bqc_eval_signed_on';
    save(
      { ...evaluation, completed_on: { ...evaluation.completed_on, [subStage]: formatDateTime(now) } },
      `${subStage} completed`,
      tender[signOffField] ? {} : { [signOffField]: toDateTimeLocalInput(now).slice(0, 10) }
    );
  };

  const handleReopen = (subStage: EvaluationSubStage) => {
    const completed_on = { ...evaluation.completed_on };
    delete completed_on[subStage];
    save({ ...evaluation, completed_on }, `${subStage} reopened`);
  };

  const toggleBidder = (name: string) => {
    setSelectedBidders((prev) => (prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">EMD & BQC Evaluation</h3>
        <span className="text-xs font-semibold text-slate-600">{evaluation.bidders.length} Bidders</span>
      </div>

      {/* Bidders */}
      <div className="flex flex-wrap items-center gap-1.5">
        {evaluation.bidders.map((bidder) => (
          <span
            key={bidder}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
          >
            {bidder}
            {canManage && !movedBidders.has(bidder) && (
              <button
                type="button"
                onClick={() => handleRemoveBidder(bidder)}
                title="Remove"
                className="text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {evaluation.bidders.length === 0 && !canManage && <span className="text-xs text-slate-500">No bidders</span>}
        {canManage && (
          <form onSubmit={handleAddBidder} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newBidder}
              onChange={(e) => setNewBidder(e.target.value)}
              placeholder="Bidder name"
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bidder</span>
            </button>
          </form>
        )}
      </div>

      {/* The two sub-stages, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {split.subStages.map((s) => {
          const financeCount = s.withFinance.reduce((sum, f) => sum + f.bidders.length, 0);
          const financeHours = s.financeHours.reduce((sum, f) => sum + f.hours, 0);
          const officersInvolved = Array.from(
            new Set([...s.withFinance.map((f) => f.officer), ...s.financeHours.map((f) => f.officer)])
          );
          const isOpen = inStage && !s.completedOn;

          return (
            <div key={s.subStage} className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900">{s.subStage}</h4>
                {s.completedOn ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed {s.completedOn}
                  </span>
                ) : (
                  inStage && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      In Progress
                    </span>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
                  <div className="font-semibold text-blue-700 truncate">{creatorName}</div>
                  <div className="text-xl font-bold text-blue-900 mt-1">
                    {s.withCreator.length} <span className="text-xs font-normal">bidders</span>
                  </div>
                  <div className="font-mono font-semibold text-blue-800 mt-0.5">{formatHours(s.creatorHours)}</div>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
                  <div className="font-semibold text-emerald-700">Finance</div>
                  <div className="text-xl font-bold text-emerald-900 mt-1">
                    {financeCount} <span className="text-xs font-normal">bidders</span>
                  </div>
                  <div className="font-mono font-semibold text-emerald-800 mt-0.5">{formatHours(financeHours)}</div>
                </div>
              </div>

              {/* Each finance officer: time taken and bidders in hand */}
              {officersInvolved.length > 0 && (
                <div className="space-y-1.5">
                  {officersInvolved.map((name) => {
                    const holding = s.withFinance.find((f) => f.officer === name)?.bidders || [];
                    const hours = s.financeHours.find((f) => f.officer === name)?.hours || 0;
                    const canReturn =
                      isOpen &&
                      holding.length > 0 &&
                      (currentUser.role === 'ADMIN' || currentUser.name.toLowerCase() === name.toLowerCase());
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900">{name}</span>
                          <span className="font-mono text-slate-600 ml-2">{formatHours(hours)}</span>
                          {holding.length > 0 && <div className="text-slate-600 truncate">{holding.join(', ')}</div>}
                        </div>
                        {canReturn && (
                          <button
                            type="button"
                            onClick={() => openForm(s.subStage, 'returned', holding, name)}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isCreator && inStage && (
                <div className="flex items-center gap-2 flex-wrap">
                  {isOpen && s.withCreator.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openForm(s.subStage, 'sent', s.withCreator, financeOfficers[0] || '')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Finance</span>
                    </button>
                  )}
                  {isOpen && evaluation.bidders.length > 0 && financeCount === 0 && (
                    <button
                      type="button"
                      onClick={() => handleComplete(s.subStage)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Complete</span>
                    </button>
                  )}
                  {s.completedOn && (
                    <button
                      type="button"
                      onClick={() => handleReopen(s.subStage)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Send / return form */}
      {form && (
        <form onSubmit={handleSubmitMovement} className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">
              {form.subStage}: {form.action === 'sent' ? 'Send to Finance' : 'Return to Tender Creator'}
            </span>
            <button
              type="button"
              onClick={() => setForm(null)}
              title="Close"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">
                Bidders ({selectedBidders.length} of {form.available.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedBidders(selectedBidders.length === form.available.length ? [] : form.available)
                }
                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                {selectedBidders.length === form.available.length ? 'Clear' : 'Select All'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.available.map((bidder) => (
                <label
                  key={bidder}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${
                    selectedBidders.includes(bidder)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedBidders.includes(bidder)}
                    onChange={() => toggleBidder(bidder)}
                    className="sr-only"
                  />
                  {bidder}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block font-semibold text-slate-700 mb-1">Finance Officer</span>
              <select
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                disabled={form.action === 'returned'}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
              >
                {(form.action === 'returned' ? [officer] : financeOfficers).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block font-semibold text-slate-700 mb-1">Date & Time</span>
              <input
                type="datetime-local"
                value={movedAt}
                onChange={(e) => setMovedAt(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <label className="block">
            <span className="block font-semibold text-slate-700 mb-1">Remarks</span>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="px-3.5 py-1.5 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              {form.action === 'sent' ? 'Send' : 'Return'}
            </button>
          </div>
        </form>
      )}

      {/* Movements */}
      {evaluation.movements.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-2 px-3 font-mono">Date & Time</th>
                <th className="py-2 px-3">Sub-stage</th>
                <th className="py-2 px-3">Movement</th>
                <th className="py-2 px-3">Finance Officer</th>
                <th className="py-2 px-3">Bidders</th>
                <th className="py-2 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {evaluation.movements.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{m.at}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">{m.sub_stage}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        m.action === 'sent'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {m.action === 'sent' ? 'Sent to Finance' : 'Returned'}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">{m.officer}</td>
                  <td className="py-2 px-3">
                    {m.bidders.length} of {evaluation.bidders.length}: {m.bidders.join(', ')}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{m.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
