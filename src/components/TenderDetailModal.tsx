import React, { useState, useMemo } from 'react';
import { Tender, UserProfile, TenderStage, UserRole } from '../types';
import {
  formatCurrencyCr,
  formatNumber,
  getStageBadgeColor,
  getRoleBadge,
  STAGE_STEPS,
  NINE_STANDARD_STAGES,
  normalizeToNineStages,
  getStageStepIndex,
  toDateTimeLocalInput,
  formatDateTime,
  calculateElapsedDays,
  calculateElapsedHours,
  getTimelineEntryDuration,
  formatDurationWithUnit,
  getOfficerGroup,
  parseCustomDate,
  formatFriendlyDate,
  roleName
} from '../utils/tenderUtils';
import { useDismiss } from './ui';
import { USERS } from '../data/seedData';
import {
  X,
  Send,
  CheckCircle2,
  Clock,
  UserCheck,
  TrendingDown,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MessageSquareQuote,
  Users,
  ArrowRightLeft,
  Layers,
  Zap,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Maximize2,
  Minimize2,
  Filter,
  Flame,
  Timer,
  BarChart3,
  Clock3,
  RotateCcw,
  History
} from 'lucide-react';

interface TenderDetailModalProps {
  tender: Tender | null;
  currentUser: UserProfile;
  onClose: () => void;
  onAdvanceStage: (
    tenderId: number,
    nextStage: TenderStage,
    nextHolder: string,
    nextRole: UserRole,
    remarks: string,
    awardedValue?: number,
    savings?: number,
    handoffTimestamp?: string
  ) => void;
}

export const TenderDetailModal: React.FC<TenderDetailModalProps> = ({
  tender,
  currentUser,
  onClose,
  onAdvanceStage,
}) => {
  if (!tender) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'excel-fields' | 'audit-log' | 'team'>('overview');
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  // Escape closes the innermost thing that is open
  useDismiss(isHandoffOpen ? () => setIsHandoffOpen(false) : onClose);

  // Handoff form states
  const currentStepIdx = getStageStepIndex(tender.brief_status);
  const defaultNextStage =
    currentStepIdx >= 0 && currentStepIdx < STAGE_STEPS.length - 1
      ? STAGE_STEPS[currentStepIdx + 1]
      : 'Awarded';

  const [selectedNextStage, setSelectedNextStage] = useState<TenderStage>(defaultNextStage);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [recipientPillarFilter, setRecipientPillarFilter] = useState<'ALL' | 'ASSIGNED' | 'FM' | 'CEC' | 'PM'>('ALL');
  const [handoffDateTime, setHandoffDateTime] = useState<string>(() => toDateTimeLocalInput(new Date()));
  const [handoffRemarks, setHandoffRemarks] = useState('');
  const [awardedValInput, setAwardedValInput] = useState<string>(
    tender.awarded_value_cr ? tender.awarded_value_cr.toString() : ''
  );

  // Last stage entry date for calculating preview SLA
  const lastTimelineEntry =
    tender.timeline && tender.timeline.length > 0 ? tender.timeline[tender.timeline.length - 1] : null;
  const lastEntryDateStr = lastTimelineEntry?.entry_date || tender.receipt_actionable_pr;
  const previewDaysInCurrentStage = calculateElapsedDays(lastEntryDateStr, handoffDateTime);

  // Compile the assigned multi-pillar team for this tender
  const assignedTeamNames: { name: string; roleLabel: string; pillarRole: UserRole }[] = [];
  if (tender.pm_officer) {
    assignedTeamNames.push({ name: tender.pm_officer, roleLabel: 'Procurement lead', pillarRole: 'PM' });
  }
  if (tender.attached_pms) {
    tender.attached_pms.forEach((pm) => {
      if (!assignedTeamNames.some((a) => a.name.toLowerCase() === pm.toLowerCase())) {
        assignedTeamNames.push({ name: pm, roleLabel: 'Procurement', pillarRole: 'PM' });
      }
    });
  }
  if (tender.attached_fms) {
    tender.attached_fms.forEach((fm, idx) => {
      if (!assignedTeamNames.some((a) => a.name.toLowerCase() === fm.toLowerCase())) {
        assignedTeamNames.push({
          name: fm,
          roleLabel: idx === 0 ? 'Finance lead' : 'Finance',
          pillarRole: 'FM'
        });
      }
    });
  }
  if (tender.attached_cec_officers) {
    tender.attached_cec_officers.forEach((cec) => {
      if (!assignedTeamNames.some((a) => a.name.toLowerCase() === cec.toLowerCase())) {
        assignedTeamNames.push({ name: cec, roleLabel: 'Estimation', pillarRole: 'CEC' });
      }
    });
  }

  // Filter possible recipients
  const pmUsers = USERS.filter((u) => u.role === 'PM');
  const fmUsers = USERS.filter((u) => u.role === 'FM');
  const cecUsers = USERS.filter((u) => u.role === 'CEC');
  const adminUsers = USERS.filter((u) => u.role === 'ADMIN');

  // Filter list according to active pillar filter
  const getFilteredOfficers = () => {
    if (recipientPillarFilter === 'FM') return fmUsers;
    if (recipientPillarFilter === 'CEC') return cecUsers;
    if (recipientPillarFilter === 'PM') return pmUsers;
    if (recipientPillarFilter === 'ASSIGNED') {
      const assignedNamesSet = new Set(assignedTeamNames.map((a) => a.name.toLowerCase()));
      return USERS.filter((u) => assignedNamesSet.has(u.name.toLowerCase()));
    }
    return USERS;
  };

  const filteredOfficers = getFilteredOfficers();
  const selectedOfficerObj = USERS.find((u) => u.name === selectedRecipient);

  const stageBadge = getStageBadgeColor(tender.brief_status);
  const holderRoleBadge = getRoleBadge(tender.current_role);

  // Switches for Timeline & Audit Tab
  const [timelineViewMode, setTimelineViewMode] = useState<'movement' | 'stage-officer-breakdown'>('movement');
  const [durationUnitMode, setDurationUnitMode] = useState<'both' | 'hours' | 'days'>('both');
  const [movementStageFilter, setMovementStageFilter] = useState<string>('ALL');
  const [movementOfficerFilter, setMovementOfficerFilter] = useState<string>('ALL');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  const toggleStageExpand = (stageName: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageName]: !prev[stageName],
    }));
  };

  const expandAllStages = () => {
    const all: Record<string, boolean> = {};
    NINE_STANDARD_STAGES.forEach((s) => {
      all[s] = true;
    });
    setExpandedStages(all);
  };

  const collapseAllStages = () => {
    setExpandedStages({});
  };

  const distinctStages = useMemo(() => {
    return NINE_STANDARD_STAGES;
  }, []);

  const distinctOfficers = useMemo(() => {
    if (!tender?.timeline) return [];
    return Array.from(new Set(tender.timeline.map((t) => t.holder)));
  }, [tender]);

  const stageAnalysisData = useMemo(() => {
    if (!tender || !tender.timeline || tender.timeline.length === 0) {
      return {
        stages: [],
        officersSummary: [],
        totalHours: 0,
        totalDays: 0,
        quickTurnaroundsCount: 0,
        totalOfficersCount: 0,
        entriesWithDuration: [],
      };
    }

    const entriesWithDuration = tender.timeline.map((entry, index) => {
      const dur = getTimelineEntryDuration(entry);
      return {
        entry,
        index,
        ...dur,
      };
    });

    const totalHours = entriesWithDuration.reduce((sum, e) => sum + e.totalHours, 0);
    const totalDays = Math.round((totalHours / 24) * 10) / 10;
    const quickTurnaroundsCount = entriesWithDuration.filter((e) => e.isQuickTurnaround).length;

    // Build map strictly for the 9 canonical stages in standard workflow order
    const stageMap = new Map<
      TenderStage,
      {
        stageName: TenderStage;
        stageNumber: number;
        totalHours: number;
        isOngoing: boolean;
        hasData: boolean;
        entries: typeof entriesWithDuration;
        officerMap: Map<
          string,
          {
            holder: string;
            role: UserRole;
            group: string;
            totalHours: number;
            isOngoing: boolean;
            isFinanceReviewOfBqc: boolean;
            stints: typeof entriesWithDuration;
          }
        >;
      }
    >();

    NINE_STANDARD_STAGES.forEach((stg, idx) => {
      stageMap.set(stg, {
        stageName: stg,
        stageNumber: idx + 1,
        totalHours: 0,
        isOngoing: false,
        hasData: false,
        entries: [],
        officerMap: new Map(),
      });
    });

    entriesWithDuration.forEach((item) => {
      // Consolidate any historical / review sub-labels into the 9 primary stages
      // e.g. "Finance Review of BQC" is mapped strictly under "BQC Preparation"
      const canonicalStage = normalizeToNineStages(item.entry.stage);
      const s = stageMap.get(canonicalStage);
      if (!s) return;

      s.hasData = true;
      s.totalHours += item.totalHours;
      if (item.isOngoing) s.isOngoing = true;
      s.entries.push(item);

      const isBqcFinance =
        canonicalStage === 'BQC Preparation' &&
        (item.entry.role === 'FM' ||
          (item.entry.remarks && item.entry.remarks.toLowerCase().includes('finance')) ||
          (item.entry.stage && item.entry.stage.toLowerCase().includes('finance')));

      const officerKey = `${item.entry.holder}-${item.entry.role}${isBqcFinance ? '-bqc-fm' : ''}`;
      if (!s.officerMap.has(officerKey)) {
        s.officerMap.set(officerKey, {
          holder: item.entry.holder,
          role: item.entry.role,
          group: getOfficerGroup(item.entry.holder),
          totalHours: 0,
          isOngoing: false,
          isFinanceReviewOfBqc: isBqcFinance,
          stints: [],
        });
      }

      const o = s.officerMap.get(officerKey)!;
      o.totalHours += item.totalHours;
      if (item.isOngoing) o.isOngoing = true;
      if (isBqcFinance) o.isFinanceReviewOfBqc = true;
      o.stints.push(item);
    });

    const currentTenderStage = normalizeToNineStages(tender.brief_status);
    const currentStageIndex = NINE_STANDARD_STAGES.indexOf(currentTenderStage);

    // Primary: Stage-wise Total Time calculated for the 9 canonical stages only
    const stages = NINE_STANDARD_STAGES.map((stageName, idx) => {
      const s = stageMap.get(stageName)!;
      const stageOfficers = Array.from(s.officerMap.values())
        .map((o) => {
          const officerDays = Math.round((o.totalHours / 24) * 10) / 10;
          const shareOfStage = s.totalHours > 0 ? Math.round((o.totalHours / s.totalHours) * 1000) / 10 : 0;
          return {
            ...o,
            totalDays: officerDays,
            shareOfStage,
            isQuickTurnaround: o.totalHours < 24,
          };
        })
        .sort((a, b) => b.totalHours - a.totalHours);

      const stageDays = Math.round((s.totalHours / 24) * 10) / 10;
      const percentageOfTotal = totalHours > 0 ? Math.round((s.totalHours / totalHours) * 1000) / 10 : 0;
      const stageQuickCount = stageOfficers.filter((o) => o.isQuickTurnaround).length;

      // Determine stage lifecycle status
      let status: 'completed' | 'in-progress' | 'pending' = 'pending';
      if (s.isOngoing) {
        status = 'in-progress';
      } else if (s.hasData) {
        if (idx === currentStageIndex && !tender.brief_status.includes('Awarded')) {
          status = 'in-progress';
        } else {
          status = 'completed';
        }
      } else if (idx === currentStageIndex) {
        status = 'in-progress';
      }

      return {
        stageName: s.stageName,
        stageNumber: s.stageNumber,
        totalHours: Math.round(s.totalHours * 10) / 10,
        totalDays: stageDays,
        percentageOfTotal,
        isOngoing: s.isOngoing,
        status,
        hasData: s.hasData,
        officers: stageOfficers,
        entriesCount: s.entries.length,
        quickCount: stageQuickCount,
      };
    });

    // Global Officer Rollup across all 9 stages
    const globalOfficerMap = new Map<
      string,
      {
        holder: string;
        role: UserRole;
        group: string;
        totalHours: number;
        handoffCount: number;
        stagesHandled: Set<string>;
        fastestHours: number;
        slowestHours: number;
        isCurrentHolder: boolean;
        quickTurnaroundStints: number;
      }
    >();

    entriesWithDuration.forEach((item) => {
      const key = `${item.entry.holder}-${item.entry.role}`;
      const canonicalStage = normalizeToNineStages(item.entry.stage);
      if (!globalOfficerMap.has(key)) {
        globalOfficerMap.set(key, {
          holder: item.entry.holder,
          role: item.entry.role,
          group: getOfficerGroup(item.entry.holder),
          totalHours: 0,
          handoffCount: 0,
          stagesHandled: new Set(),
          fastestHours: Infinity,
          slowestHours: 0,
          isCurrentHolder: item.isOngoing,
          quickTurnaroundStints: 0,
        });
      }

      const g = globalOfficerMap.get(key)!;
      g.totalHours += item.totalHours;
      g.handoffCount += 1;
      g.stagesHandled.add(canonicalStage);
      if (item.totalHours < g.fastestHours) g.fastestHours = item.totalHours;
      if (item.totalHours > g.slowestHours) g.slowestHours = item.totalHours;
      if (item.isOngoing) g.isCurrentHolder = true;
      if (item.isQuickTurnaround) g.quickTurnaroundStints += 1;
    });

    const officersSummary = Array.from(globalOfficerMap.values())
      .map((g) => ({
        ...g,
        totalHours: Math.round(g.totalHours * 10) / 10,
        totalDays: Math.round((g.totalHours / 24) * 10) / 10,
        percentageOfTotal: totalHours > 0 ? Math.round((g.totalHours / totalHours) * 1000) / 10 : 0,
        stagesCount: g.stagesHandled.size,
        stagesList: Array.from(g.stagesHandled),
        fastestHours: g.fastestHours === Infinity ? 0 : Math.round(g.fastestHours * 10) / 10,
        slowestHours: Math.round(g.slowestHours * 10) / 10,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      stages,
      officersSummary,
      totalHours: Math.round(totalHours * 10) / 10,
      totalDays,
      quickTurnaroundsCount,
      totalOfficersCount: officersSummary.length,
      entriesWithDuration,
    };
  }, [tender]);

  const filteredMovementEntries = useMemo(() => {
    if (!stageAnalysisData.entriesWithDuration) return [];
    return stageAnalysisData.entriesWithDuration.filter((item) => {
      if (movementStageFilter !== 'ALL') {
        const canonicalStage = normalizeToNineStages(item.entry.stage);
        if (canonicalStage !== movementStageFilter) return false;
      }
      if (movementOfficerFilter !== 'ALL' && item.entry.holder !== movementOfficerFilter) return false;
      return true;
    });
  }, [stageAnalysisData, movementStageFilter, movementOfficerFilter]);

  const handleHandoffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient) {
      alert('Choose who to send this to.');
      return;
    }

    const recipientObj = USERS.find((u) => u.name === selectedRecipient);
    const role: UserRole = recipientObj ? recipientObj.role : 'PM';

    let awardedVal: number | undefined = undefined;
    let savingsVal: number | undefined = undefined;

    if (selectedNextStage === 'Awarded') {
      const parsedAward = parseFloat(awardedValInput);
      if (!isNaN(parsedAward) && parsedAward > 0) {
        awardedVal = parsedAward;
        if (tender.estimate_value_cr > parsedAward) {
          savingsVal = +(tender.estimate_value_cr - parsedAward).toFixed(2);
        }
      }
    }

    const formattedTimestamp = formatDateTime(handoffDateTime);

    onAdvanceStage(
      tender.sr_no,
      selectedNextStage,
      selectedRecipient,
      role,
      handoffRemarks || `Transferred to ${selectedRecipient} (${role}) for ${selectedNextStage}`,
      awardedVal,
      savingsVal,
      formattedTimestamp
    );

    setIsHandoffOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-none sm:rounded-xl w-full h-full sm:h-auto max-w-5xl shadow-xl text-slate-800 flex flex-col max-h-full sm:max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {tender.pr_no}
              </span>
              {tender.crfq_no && (
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  {tender.crfq_no}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${stageBadge.dot}`}></span>
                {tender.brief_status}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {tender.tender_type} tender
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {tender.user_function}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {tender.item_description}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span>Procurement manager: <strong className="text-slate-800">{tender.pm_officer}</strong></span>
              {tender.current_holder && (
                <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Now with <strong className="text-amber-900">{tender.current_holder}</strong> ({roleName(tender.current_role)})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Advance / Send File Button */}
            {tender.brief_status !== 'Awarded' && tender.brief_status !== 'Cancelled' && (
              <button
                onClick={() => setIsHandoffOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hidden sm:flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to next person</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Stepper Bar across 9 Stages */}
        <div className="p-4 bg-white border-b border-slate-200 overflow-x-auto shrink-0">
          <div className="text-xs text-slate-500 mb-2">
            Progress
          </div>
          {/* Phones: one line and a bar instead of the nine-step strip */}
          <div className="sm:hidden">
            {(() => {
              const idx = getStageStepIndex(tender.brief_status);
              const done = idx < 0 ? 0 : idx + 1;
              return (
                <>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-900 whitespace-nowrap">
                      {idx >= 0 ? `Stage ${idx + 1} of ${STAGE_STEPS.length}` : 'Off the main path'}
                    </span>
                    <span className="text-slate-600 truncate">{tender.brief_status}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(done / STAGE_STEPS.length) * 100}%` }} />
                  </div>
                </>
              );
            })()}
          </div>
          <div className="hidden sm:flex items-center min-w-[760px] justify-between relative">
            {STAGE_STEPS.map((stage, idx) => {
              const tenderIdx = getStageStepIndex(tender.brief_status);
              const isPast = tenderIdx > idx || tender.brief_status === 'Awarded';
              const isCurrent = tender.brief_status === stage;

              return (
                <div key={stage} className="flex-1 flex flex-col items-center relative group">
                  {/* Connector line */}
                  {idx > 0 && (
                    <div
                      className={`absolute top-3.5 -left-1/2 w-full h-0.5 z-0 ${
                        isPast || isCurrent ? 'bg-blue-500' : 'bg-slate-200'
                      }`}
                    ></div>
                  )}

                  {/* Step Bubble */}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Label */}
                  <div
                    className={`text-xs mt-1.5 text-center leading-tight font-medium max-w-[80px] ${
                      isCurrent
                        ? 'text-blue-700 font-bold'
                        : isPast
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-2 sm:px-6 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('excel-fields')}
            className={`py-3 px-4 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'excel-fields'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All details
          </button>
          <button
            onClick={() => setActiveTab('audit-log')}
            className={`py-3 px-4 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'audit-log'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>History</span>
            <span className="px-1.5 py-0.2 rounded text-xs bg-slate-200 text-slate-700 font-semibold">
              {tender.timeline.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-3 px-4 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Team
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-sm text-slate-500">Estimated value</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                    {formatCurrencyCr(tender.estimate_value_cr)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">From the estimation team</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-sm text-slate-500">Awarded value</div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
                    {tender.awarded_value_cr ? formatCurrencyCr(tender.awarded_value_cr) : 'Not yet'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {tender.brief_status === 'Awarded' ? 'Final contract value' : 'Set when the tender is awarded'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-sm text-slate-500">Saved in negotiation</div>
                  <div className="text-lg sm:text-xl font-bold text-blue-700 mt-1">
                    {tender.savings_due_to_negotiation_cr
                      ? formatCurrencyCr(tender.savings_due_to_negotiation_cr)
                      : '—'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {tender.savings_due_to_negotiation_cr && tender.savings_due_to_negotiation_cr > 0
                      ? `${((tender.savings_due_to_negotiation_cr / tender.estimate_value_cr) * 100).toFixed(1)}% below estimate`
                      : 'Estimate minus awarded value'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-sm text-slate-500">Total working days</div>
                  <div className="text-lg sm:text-xl font-bold text-amber-700 mt-1">
                    {tender.sla_days ? `${tender.sla_days} days` : 'In progress'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Target: under 120 working days</div>
                </div>
              </div>

              {/* Time Breakdown by Pillar */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-sm font-medium text-slate-700 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span>Working days held by each team</span>
                  <span className="text-slate-400 font-normal">Weekends not counted</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                    <div className="text-xs text-blue-700 font-semibold">Procurement (PM)</div>
                    <div className="text-2xl font-bold text-blue-900 mt-1">
                      {tender.days_by_role?.PM || 0} <span className="text-xs font-normal">days</span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">BQC, Bidding, TEC drafting</div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                    <div className="text-xs text-emerald-700 font-semibold">Finance (FM)</div>
                    <div className="text-2xl font-bold text-emerald-900 mt-1">
                      {tender.days_by_role?.FM || 0} <span className="text-xs font-normal">days</span>
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">BQC Review, Concurrence</div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-center">
                    <div className="text-xs text-amber-700 font-semibold">Estimation (CEC)</div>
                    <div className="text-2xl font-bold text-amber-900 mt-1">
                      {tender.days_by_role?.CEC || 0} <span className="text-xs font-normal">days</span>
                    </div>
                    <div className="text-xs text-amber-600 mt-1">Cost benchmark analysis</div>
                  </div>
                </div>
              </div>

              {/* Remarks and Status */}
              {tender.remarks && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <MessageSquareQuote className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Notes</div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tender.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL 25+ EXCEL FIELDS */}
          {activeTab === 'excel-fields' && (
            <div className="space-y-6 text-xs">
              {/* Group 1: Identifiers */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-bold text-blue-700  mb-3">
                  Identification
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">Sr No</span>
                    <span className="font-semibold text-slate-900">{tender.sr_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">PR number</span>
                    <span className="font-semibold text-slate-900 font-mono">{tender.pr_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">CRFQ number</span>
                    <span className="font-semibold text-slate-900 font-mono">{tender.crfq_no || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">User Function</span>
                    <span className="font-semibold text-slate-900">{tender.user_function}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Procurement manager</span>
                    <span className="font-semibold text-slate-900">{tender.pm_officer}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Tender type</span>
                    <span className="font-semibold text-slate-900">{tender.tender_type}</span>
                  </div>
                </div>
              </div>

              {/* Group 2: Key Milestones */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-bold text-blue-700  mb-3">
                  Key dates
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">PR first raised</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.date_pr_initial_indent)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Actionable PR received</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.receipt_actionable_pr)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Estimate received</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.date_receipt_estimate_cec)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Tender floated</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.tender_floated_on)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Tender opened / due</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.tender_opened_due_on)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Sent for technical evaluation</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.tender_sent_tech_eval)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Technical evaluation received</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.receipt_tech_eval)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">TEC proposed</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.tec_proposed_on)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">TEC approved</span>
                    <span className="font-medium text-slate-800">{formatFriendlyDate(tender.tec_approval_date)}</span>
                  </div>
                </div>
              </div>

              {/* Group 3: Financials & Commercials */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-bold text-blue-700  mb-3">
                  Value and savings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">Estimated value</span>
                    <span className="font-bold text-slate-900">{formatCurrencyCr(tender.estimate_value_cr)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Awarded value</span>
                    <span className="font-bold text-emerald-700">{formatCurrencyCr(tender.awarded_value_cr)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Saved in negotiation</span>
                    <span className="font-bold text-blue-700">{formatCurrencyCr(tender.savings_due_to_negotiation_cr)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Approving committee time</span>
                    <span className="font-medium text-slate-800">{tender.time_taken_approving_committee_days ? `${tender.time_taken_approving_committee_days} days` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Total working days</span>
                    <span className="font-medium text-amber-700">{tender.sla_days ? `${tender.sla_days} days` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Month</span>
                    <span className="font-medium text-slate-800">{tender.month_year || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Group 4: Register Checklists */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-bold text-blue-700  mb-3">
                  Register checklist
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">Tender register updated</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      tender.tender_register_updated === 'YES'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tender.tender_register_updated === 'YES' ? 'Yes' : 'Not yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">AOC completed</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      tender.aoc_completed === 'YES'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tender.aoc_completed === 'YES' ? 'Yes' : 'Not yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Contract / OLA created</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      tender.contract_ola_created === 'YES'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tender.contract_ola_created === 'YES' ? 'Yes' : 'Not yet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL LOG WITH 2 SWITCHES */}
          {activeTab === 'audit-log' && (
            <div className="space-y-4">
              {/* Header Card with the 2 Switches */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-600" />
                      <span>History</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      See every hand-off, or how long each stage and each person took.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-mono font-bold bg-white text-slate-800 px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      Total time: {formatDurationWithUnit(stageAnalysisData.totalHours, durationUnitMode)}
                    </span>
                  </div>
                </div>

                {/* THE 2 SWITCHES - Compact, space-saving tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                  {/* Switch 1: Full Movement of Files */}
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('movement')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      timelineViewMode === 'movement'
                        ? 'bg-white text-blue-800 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <ArrowRightLeft
                      className={`w-3.5 h-3.5 shrink-0 ${
                        timelineViewMode === 'movement' ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">Hand-offs</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-xs font-mono font-bold shrink-0 ${
                        timelineViewMode === 'movement'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tender.timeline.length}
                    </span>
                  </button>

                  {/* Switch 2: Stage-wise & Officer Breakdown */}
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('stage-officer-breakdown')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      timelineViewMode === 'stage-officer-breakdown'
                        ? 'bg-white text-blue-800 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Layers
                      className={`w-3.5 h-3.5 shrink-0 ${
                        timelineViewMode === 'stage-officer-breakdown' ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">By stage and person</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-xs font-mono font-bold shrink-0 flex items-center gap-1 ${
                        timelineViewMode === 'stage-officer-breakdown'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span>9</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* SWITCH 1 VIEW: FULL MOVEMENT OF FILES                     */}
              {/* ========================================================= */}
              {timelineViewMode === 'movement' && (
                <div className="space-y-3">
                  {/* Filter & Summary Strip */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mr-1">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span>Filter:</span>
                      </div>
                      <select
                        value={movementStageFilter}
                        onChange={(e) => setMovementStageFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-md px-2 py-1.5 font-medium focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ALL">All stages</option>
                        {distinctStages.map((st, idx) => (
                          <option key={st} value={st}>
                            {idx + 1}. {st}{st === 'BQC Preparation' ? ' (includes finance review)' : ''}
                          </option>
                        ))}
                      </select>

                      <select
                        value={movementOfficerFilter}
                        onChange={(e) => setMovementOfficerFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-md px-2 py-1.5 font-medium focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ALL">All people</option>
                        {distinctOfficers.map((off) => (
                          <option key={off} value={off}>
                            {off} ({getOfficerGroup(off)})
                          </option>
                        ))}
                      </select>

                      {(movementStageFilter !== 'ALL' || movementOfficerFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setMovementStageFilter('ALL');
                            setMovementOfficerFilter('ALL');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    {/* Fast Status Highlights */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>
                          Showing <b>{filteredMovementEntries.length}</b> of {tender.timeline.length} hand-offs
                        </span>
                      </div>
                      {stageAnalysisData.quickTurnaroundsCount > 0 && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <Zap className="w-2.5 h-2.5 text-amber-600" />
                          <span>{stageAnalysisData.quickTurnaroundsCount} done within a day</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Movements Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
                    <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                          <th className="py-2.5 px-3 w-10 text-slate-400">#</th>
                          <th className="py-2.5 px-3">Stage</th>
                          <th className="py-2.5 px-3">Handled by</th>
                          <th className="py-2.5 px-3">Received</th>
                          <th className="py-2.5 px-3">Passed on</th>
                          <th className="py-2.5 px-3 text-right">Time held</th>
                          <th className="py-2.5 px-3">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredMovementEntries.map((item, idx) => {
                          const roleB = getRoleBadge(item.entry.role);
                          const isQuick = item.isQuickTurnaround;
                          const isCurrent = item.isOngoing;
                          const group = getOfficerGroup(item.entry.holder);

                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isCurrent ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              <td className="py-3 px-3 text-slate-400 font-mono text-xs">
                                {item.index + 1}
                              </td>

                              {/* Stage */}
                              <td className="py-3 px-3 font-medium text-slate-900">
                                {(() => {
                                  const canonicalStage = normalizeToNineStages(item.entry.stage);
                                  const stageIdx = getStageStepIndex(canonicalStage);
                                  const isBqcFinance =
                                    canonicalStage === 'BQC Preparation' &&
                                    (item.entry.role === 'FM' ||
                                      (item.entry.remarks && item.entry.remarks.toLowerCase().includes('finance')) ||
                                      (item.entry.stage && item.entry.stage.toLowerCase().includes('finance')));

                                  return (
                                    <div>
                                      <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                        <span>{canonicalStage}</span>
                                        {isBqcFinance && (
                                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                            Finance review
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                                        Stage {stageIdx + 1} of 9
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* Officer */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-xs font-bold ${roleB.bg} ${roleB.text} ${roleB.border} border`}
                                  >
                                    {roleName(item.entry.role)}
                                  </span>
                                  <div>
                                    <div className="font-semibold text-slate-900">{item.entry.holder}</div>
                                    <div className="text-xs text-slate-500">{group}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Entry Date */}
                              <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                                {formatFriendlyDate(item.entry.entry_date)}
                              </td>

                              {/* Exit Date */}
                              <td className="py-3 px-3 font-mono text-xs">
                                {item.entry.exit_date ? (
                                  <span className="text-slate-600 whitespace-nowrap">{formatFriendlyDate(item.entry.exit_date)}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Still here
                                  </span>
                                )}
                              </td>

                              {/* Time Spent */}
                              <td className="py-3 px-3 text-right">
                                {isCurrent ? (
                                  <div className="inline-flex flex-col items-end">
                                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                      Active ({item.formattedDisplay})
                                    </span>
                                  </div>
                                ) : isQuick ? (
                                  <div className="inline-flex flex-col items-end">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono bg-amber-50 text-amber-900 border border-amber-300">
                                      <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                                      {item.formattedDisplay}
                                    </span>
                                    <span className="text-xs font-medium text-amber-700">Within a day</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex flex-col items-end">
                                    <span
                                      className={`font-bold font-mono text-xs ${
                                        item.totalDays > 15
                                          ? 'text-rose-600'
                                          : item.totalDays > 7
                                          ? 'text-amber-600'
                                          : 'text-slate-800'
                                      }`}
                                    >
                                      {item.formattedDisplay}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Remarks */}
                              <td className="py-3 px-3 text-slate-600 text-xs max-w-xs">
                                <div className="flex items-start gap-1">
                                  <MessageSquareQuote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2 hover:line-clamp-none transition-all">
                                    {item.entry.remarks || '—'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SWITCH 2 VIEW: STAGE-WISE & OFFICER-WISE BREAKDOWN        */}
              {/* ========================================================= */}
              {timelineViewMode === 'stage-officer-breakdown' && (
                <div className="space-y-3">
                  {/* Compact Architecture Banner */}
                  <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-purple-50/50 border border-blue-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-700 text-white shadow-2xs">
                          Working days
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          Time per stage
                        </h3>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          BQC includes finance review
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Click a stage to see who held it and for how long. Weekends are not counted.
                      </p>
                    </div>
                    <div className="text-right shrink-0 bg-white/90 px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs">
                      <div className="text-xs font-bold  text-slate-400">Total time</div>
                      <div className="text-sm font-semibold font-mono text-blue-900">
                        {stageAnalysisData.totalDays} Days ({formatNumber(stageAnalysisData.totalHours)} hrs)
                      </div>
                    </div>
                  </div>

                  {/* Compact Granularity Controls & Quick Action Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                    {/* Unit Switcher */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-blue-600" />
                        <span>Unit:</span>
                      </span>
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setDurationUnitMode('both')}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            durationUnitMode === 'both'
                              ? 'bg-white text-blue-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Days & Hours
                        </button>
                        <button
                          type="button"
                          onClick={() => setDurationUnitMode('hours')}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            durationUnitMode === 'hours'
                              ? 'bg-white text-blue-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Hours
                        </button>
                        <button
                          type="button"
                          onClick={() => setDurationUnitMode('days')}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            durationUnitMode === 'days'
                              ? 'bg-white text-blue-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Days
                        </button>
                      </div>
                    </div>

                    {/* Expand/Collapse All and Quick KPI Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={expandAllStages}
                          className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3 text-slate-500" />
                          <span>Expand all</span>
                        </button>
                        <button
                          type="button"
                          onClick={collapseAllStages}
                          className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Minimize2 className="w-3 h-3 text-slate-500" />
                          <span>Collapse all</span>
                        </button>
                      </div>

                      <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

                      <span className="text-xs text-slate-500 hidden sm:inline">
                        <strong className="text-slate-800">{stageAnalysisData.totalOfficersCount}</strong> officers involved
                      </span>

                      {stageAnalysisData.quickTurnaroundsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600" />
                          <span>{stageAnalysisData.quickTurnaroundsCount} within a day</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ONE-VIEW 9 STAGES ACCORDION: Click any stage to inspect officer breakdown */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-200">
                    {/* Header Row for One-View Table */}
                    <div className="bg-slate-50 px-3.5 py-2 text-xs font-bold  text-slate-500 hidden md:grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">Stage</div>
                      <div className="col-span-2 text-center">People</div>
                      <div className="col-span-2 text-center">Share</div>
                      <div className="col-span-2 text-right">Time</div>
                      <div className="col-span-1 text-right"></div>
                    </div>

                    {stageAnalysisData.stages.map((stage, sIdx) => {
                      const isExpanded = expandedStages[stage.stageName] === true;
                      const isBqcStage = stage.stageName === 'BQC Preparation';

                      return (
                        <div
                          key={sIdx}
                          className={`transition-colors ${
                            isExpanded ? 'bg-blue-50/20' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* COMPACT STAGE ROW (Visible in One View) */}
                          <div
                            onClick={() => toggleStageExpand(stage.stageName)}
                            className="p-3 sm:px-3.5 sm:py-2.5 cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center select-none"
                          >
                            {/* Col 1: Stage Number & Name */}
                            <div className="flex items-center gap-2.5 md:col-span-5 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center font-mono shrink-0 ${
                                  stage.status === 'in-progress'
                                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-100'
                                    : stage.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {stage.stageNumber}
                              </span>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                    {stage.stageName}
                                  </span>

                                  {stage.status === 'completed' && (
                                    <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Done
                                    </span>
                                  )}

                                  {stage.status === 'in-progress' && (
                                    <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                      Active
                                    </span>
                                  )}

                                  {stage.status === 'pending' && (
                                    <span className="px-1.5 py-0.2 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                      Pending
                                    </span>
                                  )}

                                  {isBqcStage && (
                                    <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                      Includes finance review
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Col 2: Officers involved */}
                            <div className="flex md:justify-center items-center gap-1.5 md:col-span-2 text-xs">
                              {stage.hasData ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-500" />
                                  <span>{stage.officers.length === 1 ? '1 person' : `${stage.officers.length} people`}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Not started</span>
                              )}
                            </div>

                            {/* Col 3: Share of Total Tender Time */}
                            <div className="flex md:justify-center items-center gap-2 md:col-span-2 w-full md:w-auto">
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full ${
                                    stage.status === 'in-progress'
                                      ? 'bg-blue-600'
                                      : stage.status === 'completed'
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${Math.min(100, stage.percentageOfTotal)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-600">
                                {stage.hasData ? `${stage.percentageOfTotal}%` : '0%'}
                              </span>
                            </div>

                            {/* Col 4: Stage Total Time (PRIMARY) */}
                            <div className="flex md:justify-end items-center gap-1.5 md:col-span-2 text-right">
                              <span className="text-xs md:hidden font-semibold text-slate-500">Time:</span>
                              <span className="text-xs sm:text-sm font-semibold font-mono text-slate-900">
                                {stage.hasData
                                  ? formatDurationWithUnit(stage.totalHours, durationUnitMode)
                                  : '0 hrs (0 d)'}
                              </span>
                            </div>

                            {/* Col 5: Interactive Action Button */}
                            <div className="flex md:justify-end items-center gap-1 md:col-span-1 self-end md:self-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStageExpand(stage.stageName);
                                }}
                                className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isExpanded ? (
                                  <>
                                    <span className="md:hidden">Close</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span className="md:hidden">People</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* EXPANDED OFFICER BREAKDOWN: Shown after clicking into it */}
                          {isExpanded && (
                            <div className="p-3.5 sm:p-4 bg-slate-50/60 border-t border-slate-200 space-y-3">
                              {!stage.hasData ? (
                                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 italic flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span>
                                    The tender has not reached this stage yet.
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {/* Visual Distribution Bar of Officer Time */}
                                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                                    <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Who held it:</span>
                                      </span>
                                      <span className="font-mono text-slate-900 font-bold">
                                        Total: {formatDurationWithUnit(stage.totalHours, durationUnitMode)}
                                      </span>
                                    </div>

                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                                      {stage.officers.map((off, oIdx) => {
                                        const colors = [
                                          'bg-blue-500',
                                          'bg-purple-500',
                                          'bg-emerald-500',
                                          'bg-amber-500',
                                          'bg-indigo-500',
                                          'bg-rose-500',
                                        ];
                                        const barColor = colors[oIdx % colors.length];
                                        return (
                                          <div
                                            key={oIdx}
                                            style={{ width: `${Math.max(2, off.shareOfStage)}%` }}
                                            className={`${barColor} h-full transition-all`}
                                            title={`${off.holder}: ${off.shareOfStage}% (${formatDurationWithUnit(
                                              off.totalHours,
                                              durationUnitMode
                                            )})`}
                                          />
                                        );
                                      })}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                                      {stage.officers.map((off, oIdx) => (
                                        <span key={oIdx} className="flex items-center gap-1">
                                          <span
                                            className={`w-2 h-2 rounded-full ${
                                              [
                                                'bg-blue-500',
                                                'bg-purple-500',
                                                'bg-emerald-500',
                                                'bg-amber-500',
                                                'bg-indigo-500',
                                                'bg-rose-500',
                                              ][oIdx % 6]
                                            }`}
                                          />
                                          <span className="font-medium text-slate-700">{off.holder}</span>
                                          <span className="text-slate-400">({off.shareOfStage}%)</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Special Callout for Stage 3 BQC */}
                                  {isBqcStage && (
                                    <div className="bg-purple-50/80 border border-purple-200 rounded-lg p-2.5 text-xs text-purple-900 flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-bold">
                                          The finance review counts as part of BQC preparation
                                        </div>
                                        <p className="text-xs text-purple-800 mt-0.5">
                                          Time spent by procurement and by finance are added together for this stage. Each person is listed below.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Which Officer Took What Time */}
                                  <div className="grid grid-cols-1 gap-2">
                                    {stage.officers.map((off, oIdx) => {
                                      const roleB = getRoleBadge(off.role);
                                      const isQuick = off.isQuickTurnaround;
                                      const isCurrentlyHolding = off.isOngoing;

                                      return (
                                        <div
                                          key={oIdx}
                                          className={`border rounded-xl p-3 bg-white shadow-2xs transition-all ${
                                            isCurrentlyHolding
                                              ? 'border-blue-300 ring-1 ring-blue-100'
                                              : off.isFinanceReviewOfBqc
                                              ? 'border-purple-200'
                                              : isQuick
                                              ? 'border-amber-200'
                                              : 'border-slate-200 hover:border-slate-300'
                                          }`}
                                        >
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            {/* Officer identity & role */}
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <span
                                                className={`px-2 py-0.5 rounded text-xs font-bold ${roleB.bg} ${roleB.text} ${roleB.border} border shrink-0`}
                                              >
                                                {roleName(off.role)}
                                              </span>
                                              <div className="min-w-0">
                                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                                  <span>{off.holder}</span>
                                                  <span className="text-xs font-medium text-slate-500">
                                                    ({off.group})
                                                  </span>
                                                  {off.isFinanceReviewOfBqc && (
                                                    <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                                      Finance review
                                                    </span>
                                                  )}
                                                  {isCurrentlyHolding && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                      Has it now
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                  {off.stints.length === 1
                                                    ? 'Held it once'
                                                    : `Held it ${off.stints.length} times`}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Time spent by this officer */}
                                            <div className="text-right shrink-0">
                                              <div className="flex items-center justify-end gap-1.5">
                                                <span
                                                  className={`text-sm font-semibold font-mono ${
                                                    isQuick ? 'text-amber-900' : 'text-slate-900'
                                                  }`}
                                                >
                                                  {formatDurationWithUnit(off.totalHours, durationUnitMode)}
                                                </span>
                                                {isQuick && (
                                                  <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                                    <Zap className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                                    <span>&lt;24h</span>
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-slate-500 font-medium">
                                                <b>{off.shareOfStage}%</b> of stage time
                                              </div>
                                            </div>
                                          </div>

                                          {/* Handover stints & notes */}
                                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                            {off.stints.map((stint, stIdx) => (
                                              <div
                                                key={stIdx}
                                                className="text-xs text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-1 bg-slate-50/80 px-2 py-1 rounded"
                                              >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-xs font-mono text-slate-400">
                                                    #{stIdx + 1}
                                                  </span>
                                                  <span className="font-mono text-slate-700">
                                                    {formatFriendlyDate(stint.entry.entry_date)}
                                                  </span>
                                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                                  <span className="font-mono text-slate-700">
                                                    {stint.entry.exit_date ? formatFriendlyDate(stint.entry.exit_date) : 'now'}
                                                  </span>
                                                  <span className="font-mono font-bold text-slate-900 bg-white px-1 py-0.2 rounded border border-slate-200 text-xs">
                                                    {stint.formattedDisplay}
                                                  </span>
                                                </div>

                                                {stint.entry.remarks && (
                                                  <div className="text-xs text-slate-500 italic max-w-xs truncate">
                                                    "{stint.entry.remarks}"
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Consolidated Officer Leaderboard across All Stages */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900  flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <span>Time per person</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          How long each person held this tender, across every stage.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {stageAnalysisData.officersSummary.length} people
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                            <th className="py-2 px-3">Name</th>
                            <th className="py-2 px-3">Team</th>
                            <th className="py-2 px-3">Group</th>
                            <th className="py-2 px-3 text-right">Total time</th>
                            <th className="py-2 px-3 text-right">Share</th>
                            <th className="py-2 px-3 text-center">Stages</th>
                            <th className="py-2 px-3">Fastest</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {stageAnalysisData.officersSummary.map((off, idx) => {
                            const roleB = getRoleBadge(off.role);
                            const hasHoursTurnaround = off.fastestHours < 24 && off.fastestHours > 0;

                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  <div className="flex items-center gap-1.5">
                                    <span>{off.holder}</span>
                                    {off.isCurrentHolder && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Currently holding file"></span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-xs font-bold ${roleB.bg} ${roleB.text} ${roleB.border} border`}
                                  >
                                    {roleName(off.role)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-xs">{off.group}</td>
                                <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                                  {formatDurationWithUnit(off.totalHours, durationUnitMode)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  <span className="font-semibold text-slate-800">{off.percentageOfTotal}%</span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                                  {off.stagesCount}
                                </td>
                                <td className="py-2.5 px-3">
                                  {hasHoursTurnaround ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                      <Zap className="w-2.5 h-2.5 text-amber-600" />
                                      {formatDurationWithUnit(off.fastestHours, durationUnitMode)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 font-mono text-xs">
                                      {formatDurationWithUnit(off.fastestHours, durationUnitMode)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEAM & ATTACHED REVIEWERS */}
          {activeTab === 'team' && (
            <div className="space-y-4 text-xs">
              <div className="text-xs text-slate-500 mb-2">
                Everyone assigned to this tender.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PMs */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    Procurement
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                      <div className="font-semibold text-slate-900">{tender.pm_officer}</div>
                      <div className="text-xs text-blue-700 font-medium">Lead</div>
                    </div>
                    {tender.attached_pms &&
                      tender.attached_pms.map((pm, i) => (
                        <div key={i} className="p-2.5 bg-white/70 rounded-lg border border-slate-200">
                          <div className="font-medium text-slate-800">{pm}</div>
                          <div className="text-xs text-slate-500">Second manager</div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* FMs */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Finance
                  </div>
                  <div className="space-y-2">
                    {tender.attached_fms && tender.attached_fms.length > 0 ? (
                      tender.attached_fms.map((fm, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                          <div className="font-semibold text-slate-900">{fm}</div>
                          <div className="text-xs text-emerald-700 font-medium">Finance manager</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No one assigned yet</div>
                    )}
                  </div>
                </div>

                {/* CEC */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Estimation
                  </div>
                  <div className="space-y-2">
                    {tender.attached_cec_officers && tender.attached_cec_officers.length > 0 ? (
                      tender.attached_cec_officers.map((cec, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                          <div className="font-semibold text-slate-900">{cec}</div>
                          <div className="text-xs text-amber-700 font-medium">Estimation officer</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No one assigned yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
            <span>Working days are Monday to Friday; weekends are not counted.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
            {tender.brief_status !== 'Awarded' && tender.brief_status !== 'Cancelled' && (
              <button
                onClick={() => setIsHandoffOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send to next person</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* HANDOFF / STAGE ADVANCE POPUP MODAL */}
      {isHandoffOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Send className="w-4 h-4" />
                <span>Send to next person</span>
              </div>
              <button
                onClick={() => setIsHandoffOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHandoffSubmit} className="space-y-4 text-xs">
              {/* Stage Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Next stage
                </label>
                <select
                  value={selectedNextStage}
                  onChange={(e) => {
                    const newStage = e.target.value as TenderStage;
                    setSelectedNextStage(newStage);
                    // Smart auto-filter suggestion
                    if (newStage === 'Under Estimation') {
                      setRecipientPillarFilter('CEC');
                      if (tender.attached_cec_officers && tender.attached_cec_officers.length > 0) {
                        setSelectedRecipient(tender.attached_cec_officers[0]);
                      }
                    } else if (newStage === 'BQC Preparation' || newStage === 'Under Award TEC') {
                      if (tender.attached_fms && tender.attached_fms.length > 0) {
                        setRecipientPillarFilter('ASSIGNED');
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="PR Received">1. PR Received</option>
                  <option value="Under Estimation">2. Under Estimation</option>
                  <option value="BQC Preparation">3. BQC Preparation</option>
                  <option value="To be Floated">4. To be Floated</option>
                  <option value="Under Bidding">5. Under Bidding</option>
                  <option value="Under BQC / Tech Evaluation">6. Under BQC / Tech Evaluation</option>
                  <option value="Under Award TEC">7. Under Award TEC</option>
                  <option value="Under Negotiation">8. Under Negotiation</option>
                  <option value="Awarded">9. Awarded</option>
                  <option value="Under Discussion with User">Under Discussion with User (side step)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Recipient Selection Section with Multi-Pillar Filters */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Send to</span>
                  </label>
                  
                </div>

                {/* Quick-Pick Attached Team Members */}
                {assignedTeamNames.length > 0 && (
                  <div>
                    <span className="text-xs  text-slate-500 font-bold block mb-1.5">
                      This tender’s team
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedTeamNames.map((member, idx) => {
                        const isSelected = selectedRecipient === member.name;
                        const roleColor =
                          member.pillarRole === 'PM'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : member.pillarRole === 'FM'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300';

                        return (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setSelectedRecipient(member.name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : `${roleColor} hover:opacity-80`
                            }`}
                          >
                            <span className="text-xs opacity-75">{member.roleLabel}</span>
                            <span>{member.name}</span>
                            {isSelected && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pillar Filter Selector Tabs */}
                <div>
                  <span className="text-xs  text-slate-500 font-bold block mb-1">
                    Or choose anyone
                  </span>
                  <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('ALL')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'ALL'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Everyone
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('FM')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'FM'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      Finance
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('CEC')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'CEC'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      Estimation
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('PM')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'PM'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      Procurement
                    </button>
                  </div>
                </div>

                {/* Dropdown Select */}
                <div>
                  <select
                    required
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
                  >
                    <option value="">Choose a person</option>
                    {recipientPillarFilter === 'ALL' ? (
                      <>
                        <optgroup label="Finance">
                          {fmUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name} — {u.designation}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Estimation">
                          {cecUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name} — {u.designation}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Procurement">
                          {pmUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name} — {u.designation}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Management">
                          {adminUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    ) : (
                      filteredOfficers.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} — {u.designation}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Recipient Confirmation Badge */}
                {selectedOfficerObj && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          selectedOfficerObj.role === 'FM'
                            ? 'bg-emerald-600'
                            : selectedOfficerObj.role === 'CEC'
                            ? 'bg-amber-600'
                            : 'bg-blue-600'
                        }`}
                      >
                        {selectedOfficerObj.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{selectedOfficerObj.name}</span>
                          <span
                            className={`text-xs px-1.5 py-0.2 rounded font-bold ${
                              selectedOfficerObj.role === 'FM'
                                ? 'bg-emerald-100 text-emerald-800'
                                : selectedOfficerObj.role === 'CEC'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {roleName(selectedOfficerObj.role)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {selectedOfficerObj.designation} • {selectedOfficerObj.pillar}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Will receive the file
                    </span>
                  </div>
                )}
              </div>

              {/* Awarded Contract Value (if advancing to Awarded stage) */}
              {selectedNextStage === 'Awarded' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <label className="block text-emerald-900 font-bold mb-1">
                    Awarded value (₹ crore)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1093.39"
                    value={awardedValInput}
                    onChange={(e) => setAwardedValInput(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-emerald-700 block mt-1">
                    Estimate was {formatCurrencyCr(tender.estimate_value_cr)}. The saving is worked out for you.
                  </span>
                </div>
              )}

              {/* Date and Time of File Movement & SLA Calculator */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>When</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setHandoffDateTime(toDateTimeLocalInput(new Date()))}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  >
                    Use now
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="datetime-local"
                      required
                      value={handoffDateTime}
                      onChange={(e) => setHandoffDateTime(e.target.value)}
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 block mt-1">
                      Recorded in the history.
                    </span>
                  </div>

                  {/* Calculated SLA Preview Card */}
                  <div className="bg-white border border-blue-200/80 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Received on</span>
                      <span className="font-mono text-slate-700 font-semibold truncate max-w-[130px]" title={lastEntryDateStr}>
                        {formatFriendlyDate(lastEntryDateStr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 mt-1">
                      <span className="text-slate-700 font-bold">Working days at this stage</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        previewDaysInCurrentStage > 15
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : previewDaysInCurrentStage > 7
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {previewDaysInCurrentStage} {previewDaysInCurrentStage === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Handover Remarks */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Note for the next person
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Technical clearance done; please check the BQC financials."
                  value={handoffRemarks}
                  onChange={(e) => setHandoffRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                ></textarea>
              </div>

              {/* What sending does */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                This closes <strong>{tender.current_holder || currentUser.name}</strong>’s turn, records the working days, and puts the file in{' '}
                <strong>{selectedRecipient || 'the chosen person'}</strong>’s queue.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHandoffOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
