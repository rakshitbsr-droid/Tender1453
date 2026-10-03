import React, { useState } from 'react';
import { Tender, UserProfile, TenderStage, UserRole, UserTask } from '../types';
import {
  formatCurrencyCr,
  getStageBadgeColor,
  isPrimaryOfficer,
  getPrimaryRoleLabel,
  isTenderCreatorOrPM,
  holdsEvaluationBidders,
} from '../utils/tenderUtils';
import { USERS } from '../data/seedData';
import { MicrosoftTasksSection } from '../components/MicrosoftTasksSection';
import { EisenhowerMatrixView } from '../components/EisenhowerMatrixView';
import { PostAwardStepsSection } from '../components/PostAwardStepsSection';
import {
  Inbox,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  Filter,
  Layers,
  Search,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Info,
  Grid2X2,
  List,
  Sparkles,
  FileCheck,
  Check
} from 'lucide-react';

interface MyQueueViewProps {
  currentUser: UserProfile;
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
  onAdvanceStage: (
    tenderId: number,
    nextStage: TenderStage,
    nextHolder: string,
    nextRole: UserRole,
    remarks: string,
    awardedValue?: number,
    savings?: number
  ) => void;
  tasks: UserTask[];
  onAddTask: (task: Omit<UserTask, 'id' | 'created_at'>) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateTask: (task: UserTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTenderPriority: (
    tenderId: number,
    urgency: 'urgent' | 'not_urgent',
    importance: 'important' | 'not_important'
  ) => void;
  onAddPostAwardStep: (tenderId: number, title: string, notes?: string, dueDate?: string) => void;
  onTogglePostAwardStep: (tenderId: number, stepId: string) => void;
  onDeletePostAwardStep: (tenderId: number, stepId: string) => void;
  onCloseTender: (tenderId: number, remarks?: string) => void;
}

export const MyQueueView: React.FC<MyQueueViewProps> = ({
  currentUser,
  tenders,
  onOpenTender,
  onAdvanceStage,
  tasks,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTenderPriority,
  onAddPostAwardStep,
  onTogglePostAwardStep,
  onDeletePostAwardStep,
  onCloseTender,
}) => {
  // View mode switcher: standard action queue vs Eisenhower Matrix
  const [viewMode, setViewMode] = useState<'standard' | 'eisenhower'>('standard');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High' | 'Normal'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  // For Admin role: allow inspecting individual officer's primary queue directly
  const [adminSelectedOfficerId, setAdminSelectedOfficerId] = useState<string>('pm-1');

  // Expanded post-award steps modal/drawer for a specific tender in queue
  const [inspectingPostAwardTender, setInspectingPostAwardTender] = useState<Tender | null>(null);

  // Determine effective officer being viewed
  const effectiveUser: UserProfile =
    currentUser.role === 'ADMIN'
      ? USERS.find((u) => u.id === adminSelectedOfficerId) || USERS[1]
      : currentUser;

  // 1. Tenders directly sitting with this officer in their inbox WHERE THEY ARE PRIMARY
  // In-progress files held by officer
  // PLUS Awarded tenders created by or with primary responsibility of this officer where !is_closed
  // "till the tender creator does not closes the tender it will be appearing in his work inbox"
  // "Once a tender he fully completed and closed it should not be visible in any work inbox."
  const inboxTenders = tenders.filter((t) => {
    if (t.brief_status === 'Cancelled') return false;

    // Post-Award pending files
    if (t.brief_status === 'Awarded') {
      if (t.is_closed) return false; // Fully completed & closed -> hidden from work inboxes
      const isCreatorOrPM = isTenderCreatorOrPM(t, effectiveUser.name);
      if (!isCreatorOrPM) return false;

      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDesc = t.item_description.toLowerCase().includes(term);
        const matchPr = t.pr_no.toLowerCase().includes(term);
        const matchCrfq = (t.crfq_no || '').toLowerCase().includes(term);
        if (!matchDesc && !matchPr && !matchCrfq) return false;
      }
      return true;
    }

    // Workflow in-progress files, and bidders received for EMD / BQC evaluation
    const holdsBidders = holdsEvaluationBidders(t, effectiveUser.name);
    const isHolder = t.current_holder?.toLowerCase() === effectiveUser.name.toLowerCase();
    if (!isHolder && !holdsBidders) return false;

    // Must be Primary Officer (not secondary), unless bidders were sent to this officer
    const isPrimary = isPrimaryOfficer(t, effectiveUser.name, effectiveUser.role);
    if (!isPrimary && !holdsBidders) return false;

    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDesc = t.item_description.toLowerCase().includes(term);
      const matchPr = t.pr_no.toLowerCase().includes(term);
      const matchCrfq = (t.crfq_no || '').toLowerCase().includes(term);
      if (!matchDesc && !matchPr && !matchCrfq) return false;
    }
    return true;
  });

  // 2. All other tenders where this officer is PRIMARY (held by other colleagues in subsequent stages)
  const otherPrimaryTenders = tenders.filter((t) => {
    if (t.brief_status === 'Cancelled') return false;
    if (t.brief_status === 'Awarded') return false; // Awarded are either in inbox (if !is_closed) or completed

    const isHolder = t.current_holder?.toLowerCase() === effectiveUser.name.toLowerCase();
    if (isHolder || holdsEvaluationBidders(t, effectiveUser.name)) return false; // Already rendered in Active Inbox above

    // Must be Primary Officer (not secondary)
    const isPrimary = isPrimaryOfficer(t, effectiveUser.name, effectiveUser.role);
    if (!isPrimary) return false;

    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDesc = t.item_description.toLowerCase().includes(term);
      const matchPr = t.pr_no.toLowerCase().includes(term);
      const matchCrfq = (t.crfq_no || '').toLowerCase().includes(term);
      if (!matchDesc && !matchPr && !matchCrfq) return false;
    }
    return true;
  });

  // Workload stats
  const totalPrimaryCount = inboxTenders.length + otherPrimaryTenders.length;
  const totalPrimaryValueCr = [...inboxTenders, ...otherPrimaryTenders].reduce(
    (sum, t) => sum + (t.estimate_value_cr || 0),
    0
  );

  const roleTitle =
    effectiveUser.role === 'PM'
      ? 'Primary Procurement Manager'
      : effectiveUser.role === 'FM'
      ? 'Lead Finance Manager'
      : effectiveUser.role === 'CEC'
      ? 'Lead Estimation Officer'
      : 'Primary Officer';

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Executive Officer Selector Bar (When logged in as Admin) */}
      {currentUser.role === 'ADMIN' && (
        <div className="bg-indigo-900 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-indigo-700">
          <div className="flex items-center gap-2">
            <label htmlFor="admin-officer-select" className="text-xs text-indigo-200 whitespace-nowrap">
              Viewing Officer:
            </label>
            <select
              id="admin-officer-select"
              value={adminSelectedOfficerId}
              onChange={(e) => setAdminSelectedOfficerId(e.target.value)}
              className="bg-indigo-800 border border-indigo-600 text-white text-xs rounded-lg px-3 py-1.5 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <optgroup label="Procurement Managers">
                {USERS.filter((u) => u.role === 'PM').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.group || 'Procurement'})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Finance Managers">
                {USERS.filter((u) => u.role === 'FM').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.group || 'Finance'})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Estimation Officers">
                {USERS.filter((u) => u.role === 'CEC').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.group || 'Estimation'})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      {/* Header Banner with View Switcher */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {effectiveUser.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {effectiveUser.name}&apos;s Action Queue
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {roleTitle}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {effectiveUser.pillar}
                </span>
              </div>
            </div>
          </div>

          {/* VIEW SWITCHER: Standard Action Queue vs Eisenhower Matrix */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                onClick={() => setViewMode('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'standard'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Action Queue</span>
              </button>

              <button
                onClick={() => setViewMode('eisenhower')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'eisenhower'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid2X2 className="w-3.5 h-3.5" />
                <span>Eisenhower Matrix</span>
              </button>
            </div>

            {/* KPI Mini Stats */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center hidden md:block">
              <span className="text-[10px] text-amber-700 font-medium block">In Inbox</span>
              <span className="text-sm font-bold text-amber-900">{inboxTenders.length} pending</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar (When in Standard view) */}
        {viewMode === 'standard' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by PR No, CRFQ, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Priority:</span>
              </span>
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setPriorityFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors text-[11px] ${
                    priorityFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPriorityFilter('High')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors text-[11px] ${
                    priorityFilter === 'High'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  High
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RENDER VIEW ACCORDING TO VIEW MODE */}
      {viewMode === 'eisenhower' ? (
        <EisenhowerMatrixView
          currentUser={effectiveUser}
          inboxTenders={inboxTenders}
          tasks={tasks}
          onOpenTender={onOpenTender}
          onAdvanceStage={onAdvanceStage}
          onUpdateTenderPriority={onUpdateTenderPriority}
          onAddTask={onAddTask}
          onToggleTask={onToggleTask}
          onUpdateTask={onUpdateTask}
        />
      ) : (
        <>
          {/* SECTION 1: ACTIVE INBOX (Pending officer's action right now + Post-award pending steps) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Inbox ({inboxTenders.length})
                </h3>
              </div>
            </div>

            {inboxTenders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-90" />
                <h4 className="text-sm font-bold text-slate-800">No pending tenders</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inboxTenders.map((tender) => {
                  const isPostAward = tender.brief_status === 'Awarded';
                  const stageBadge = getStageBadgeColor(tender.brief_status);
                  const holdsBidders = holdsEvaluationBidders(tender, effectiveUser.name);
                  const primaryRoleLabel = holdsBidders
                    ? 'EMD / BQC Evaluation'
                    : getPrimaryRoleLabel(tender, effectiveUser.name) || `Primary ${effectiveUser.role}`;

                  const postAwardSteps = tender.post_award_steps || [];
                  const completedSteps = postAwardSteps.filter((s) => s.completed).length;

                  return (
                    <div
                      key={`${tender.sr_no}-${tender.pr_no}`}
                      className={`bg-white border rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group ${
                        isPostAward
                          ? 'border-emerald-200 hover:border-emerald-300 ring-1 ring-emerald-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div>
                        {/* Top Row: PR No, Primary Role Badge, Stage, Priority */}
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {tender.pr_no}
                            </span>
                            {tender.crfq_no && (
                              <span className="text-[11px] font-mono text-slate-500">
                                {tender.crfq_no}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-blue-700" />
                              <span>{primaryRoleLabel}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {tender.priority === 'High' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                High Priority
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
                            >
                              {tender.brief_status}
                            </span>
                          </div>
                        </div>

                        {/* Tender Title */}
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                          {tender.item_description}
                        </h4>

                        {/* POST-AWARD NOTICE BANNER IF AWARDED */}
                        {isPostAward && (
                          <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                <FileCheck className="w-4 h-4 text-emerald-600" />
                                <span>Post-Award Work</span>
                              </span>
                              <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                                {completedSteps} / {postAwardSteps.length} done
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Metadata summary */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              {isPostAward ? 'Awarded Value' : 'Estimate Value'}
                            </span>
                            <span className="font-bold text-slate-800">
                              {isPostAward && tender.awarded_value_cr
                                ? formatCurrencyCr(tender.awarded_value_cr)
                                : formatCurrencyCr(tender.estimate_value_cr)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">User Function</span>
                            <span className="font-semibold text-slate-700">{tender.user_function}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Primary PM</span>
                            <span className="font-semibold text-blue-700 truncate block">
                              {tender.pm_officer}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Action Status</span>
                            <span className="font-bold text-amber-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {isPostAward ? 'Steps Pending' : holdsBidders ? 'Bidders to Check' : 'Awaiting Action'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions footer */}
                      <div
                        className={`mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 ${
                          isPostAward ? 'justify-between' : 'justify-end'
                        }`}
                      >
                        {isPostAward && (
                          <button
                            onClick={() => onOpenTender(tender)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </button>
                        )}

                        {isPostAward ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setInspectingPostAwardTender(tender)}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Post-Award Work</span>
                            </button>
                            <button
                              onClick={() => onCloseTender(tender.sr_no)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Close Tender</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onOpenTender(tender)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: MICROSOFT TASKS SECTION */}
          <div className="space-y-3 pt-4">
            <MicrosoftTasksSection
              tasks={tasks}
              currentUserName={effectiveUser.name}
              tenders={tenders}
              onAddTask={onAddTask}
              onToggleTask={onToggleTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onOpenTender={onOpenTender}
            />
          </div>

          {/* SECTION 3: OTHER TENDERS WHERE THIS OFFICER IS PRIMARY (Progressing with others in pipeline) */}
          <div className="space-y-3 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pipeline Tenders ({otherPrimaryTenders.length})
              </h3>
            </div>

            {otherPrimaryTenders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 shadow-xs">
                <Info className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">No tenders in the pipeline</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherPrimaryTenders.map((tender) => {
                  const stageBadge = getStageBadgeColor(tender.brief_status);
                  const primaryRoleLabel =
                    getPrimaryRoleLabel(tender, effectiveUser.name) || `Primary ${effectiveUser.role}`;

                  return (
                    <div
                      key={`${tender.sr_no}-${tender.pr_no}`}
                      onClick={() => onOpenTender(tender)}
                      className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {tender.pr_no}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              {primaryRoleLabel}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
                          >
                            {tender.brief_status}
                          </span>
                        </div>

                        <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 line-clamp-2 transition-colors">
                          {tender.item_description}
                        </h5>

                        <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Value:</span>
                            <span className="font-bold text-slate-800">
                              {formatCurrencyCr(tender.estimate_value_cr)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Currently with:</span>
                            <span className="font-bold text-amber-700 truncate max-w-[140px]">
                              {tender.current_holder || '—'} {tender.current_role ? `(${tender.current_role})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Inspect Post-Award Steps Modal from My Queue */}
      {inspectingPostAwardTender && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {inspectingPostAwardTender.pr_no}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate max-w-lg">
                  {inspectingPostAwardTender.item_description}
                </h4>
              </div>
              <button
                onClick={() => setInspectingPostAwardTender(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <PostAwardStepsSection
                tender={inspectingPostAwardTender}
                currentUser={currentUser}
                onAddStep={(tId, title, notes, due) => {
                  onAddPostAwardStep(tId, title, notes, due);
                  setInspectingPostAwardTender((prev) =>
                    prev
                      ? {
                          ...prev,
                          post_award_steps: [
                            ...(prev.post_award_steps || []),
                            {
                              id: `step-${Date.now()}`,
                              title,
                              notes,
                              due_date: due,
                              completed: false,
                              created_at: new Date().toLocaleDateString(),
                              created_by: currentUser.name,
                            },
                          ],
                        }
                      : null
                  );
                }}
                onToggleStep={(tId, sId) => {
                  onTogglePostAwardStep(tId, sId);
                  setInspectingPostAwardTender((prev) =>
                    prev
                      ? {
                          ...prev,
                          post_award_steps: (prev.post_award_steps || []).map((s) =>
                            s.id === sId ? { ...s, completed: !s.completed } : s
                          ),
                        }
                      : null
                  );
                }}
                onDeleteStep={(tId, sId) => {
                  onDeletePostAwardStep(tId, sId);
                  setInspectingPostAwardTender((prev) =>
                    prev
                      ? {
                          ...prev,
                          post_award_steps: (prev.post_award_steps || []).filter((s) => s.id !== sId),
                        }
                      : null
                  );
                }}
                onCloseTender={(tId, remarks) => {
                  onCloseTender(tId, remarks);
                  setInspectingPostAwardTender(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
