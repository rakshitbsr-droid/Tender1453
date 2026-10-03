import React, { useState, useMemo, useEffect } from 'react';
import { Tender, UserProfile, TenderStage, UserRole } from '../types';
import {
  formatCurrencyCr,
  formatCurrencyRs,
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
  deriveMilestoneDatesFromTimeline,
  getEffectiveTimeline,
  getEvaluationHolders,
  workingMsBetween,
  EVALUATION_STAGE
} from '../utils/tenderUtils';
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
  ArrowLeft,
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
  History,
  Pencil,
  DollarSign,
  Ban,
  Lock
} from 'lucide-react';
import { CancelTenderModal } from './CancelTenderModal';
import { PostAwardStepsSection } from './PostAwardStepsSection';
import { EvaluationSection } from './EvaluationSection';

interface TenderDetailModalProps {
  tender: Tender | null;
  currentUser: UserProfile;
  /** File movements are shown only to officers working on the tender and to head level */
  canViewTimeline?: boolean;
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
  onUpdateTender?: (updated: Tender, message?: string) => void;
  onCancelTender?: (tenderId: number, reason: string, remarks: string) => void;
  onAddPostAwardStep?: (tenderId: number, title: string, notes?: string, dueDate?: string) => void;
  onTogglePostAwardStep?: (tenderId: number, stepId: string) => void;
  onDeletePostAwardStep?: (tenderId: number, stepId: string) => void;
  onCloseTender?: (tenderId: number, remarks?: string) => void;
}

export const TenderDetailModal: React.FC<TenderDetailModalProps> = ({
  tender,
  currentUser,
  canViewTimeline = true,
  onClose,
  onAdvanceStage,
  onUpdateTender,
  onCancelTender,
  onAddPostAwardStep,
  onTogglePostAwardStep,
  onDeletePostAwardStep,
  onCloseTender,
}) => {
  if (!tender) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'excel-fields' | 'audit-log' | 'team'>('overview');
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isExpandedFullPage, setIsExpandedFullPage] = useState(false);

  // Future Estimate Value edit states
  const [isEditEstimateOpen, setIsEditEstimateOpen] = useState(false);
  const [editEstimateValue, setEditEstimateValue] = useState<string>(() =>
    tender.estimate_value_cr !== null && tender.estimate_value_cr !== undefined ? tender.estimate_value_cr.toString() : ''
  );
  const [editEstimateRemarks, setEditEstimateRemarks] = useState('');

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

  // GST rate tab states for final award calculation (inclusive of taxes)
  const [gstRateTab, setGstRateTab] = useState<'0' | '5' | '12' | '18' | '28' | 'custom'>('18');
  const [customGstRate, setCustomGstRate] = useState<string>('18');
  const [baseAwardValInput, setBaseAwardValInput] = useState<string>(() => {
    if (tender.awarded_value_cr) {
      return (tender.awarded_value_cr / 1.18).toFixed(2);
    }
    return '';
  });

  // Automatically derived milestone dates based on timeline file movements
  const derivedMilestones = useMemo(() => deriveMilestoneDatesFromTimeline(tender), [tender]);

  // Last stage entry date for calculating preview SLA
  const lastTimelineEntry =
    tender.timeline && tender.timeline.length > 0 ? tender.timeline[tender.timeline.length - 1] : null;
  const lastEntryDateStr = lastTimelineEntry?.entry_date || tender.receipt_actionable_pr;
  const previewDaysInCurrentStage = calculateElapsedDays(lastEntryDateStr, handoffDateTime);

  // Compile the assigned multi-pillar team for this tender
  const assignedTeamNames: { name: string; roleLabel: string; pillarRole: UserRole }[] = [];
  if (tender.pm_officer) {
    assignedTeamNames.push({ name: tender.pm_officer, roleLabel: 'Primary PM', pillarRole: 'PM' });
  }
  if (tender.attached_pms) {
    tender.attached_pms.forEach((pm) => {
      if (!assignedTeamNames.some((a) => a.name.toLowerCase() === pm.toLowerCase())) {
        assignedTeamNames.push({ name: pm, roleLabel: 'Co-PM', pillarRole: 'PM' });
      }
    });
  }
  if (tender.attached_fms) {
    tender.attached_fms.forEach((fm, idx) => {
      if (!assignedTeamNames.some((a) => a.name.toLowerCase() === fm.toLowerCase())) {
        assignedTeamNames.push({
          name: fm,
          roleLabel: idx === 0 ? 'Lead FM' : 'Finance Manager',
          pillarRole: 'FM'
        });
      }
    });
  }
  if (tender.attached_cec_officers) {
    tender.attached_cec_officers.forEach((cec) => {
      if (!assignedTeamNames.some((a) => a.name.toLowerCase() === cec.toLowerCase())) {
        assignedTeamNames.push({ name: cec, roleLabel: 'Estimation CEC', pillarRole: 'CEC' });
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

  const effectiveTimeline = useMemo(() => getEffectiveTimeline(tender), [tender]);

  const distinctOfficers = useMemo(() => {
    return Array.from(new Set(effectiveTimeline.map((t) => t.holder)));
  }, [effectiveTimeline]);

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

    const entriesWithDuration = effectiveTimeline.map((entry, index) => {
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
        (canonicalStage === 'BQC approval' || canonicalStage === 'BQC Preparation') &&
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

    // 1. Time between PR Indent and Actionable PR (Non-SLA time)
    const prIndentDateStr = tender.date_pr_initial_indent || derivedMilestones.date_pr_initial_indent || '';
    const actionablePrDateStr = tender.receipt_actionable_pr || derivedMilestones.receipt_actionable_pr || '';
    const prIndentDate = parseCustomDate(prIndentDateStr);
    const actionablePrDate = parseCustomDate(actionablePrDateStr);
    let preActionablePrHours = 0;
    let preActionablePrDays = 0;
    if (prIndentDate && actionablePrDate && actionablePrDate.getTime() > prIndentDate.getTime()) {
      preActionablePrHours = Math.round((workingMsBetween(prIndentDate, actionablePrDate) / (1000 * 60 * 60)) * 10) / 10;
      preActionablePrDays = Math.round((preActionablePrHours / 24) * 10) / 10;
    }

    // 2. Technical Evaluation after BQC Evaluation signing overhang (Reduced from SLA)
    const bqcSignDateStr = tender.bqc_eval_signed_on || '';
    const techEvalReceiptDateStr = tender.receipt_tech_eval || derivedMilestones.receipt_tech_eval || '';
    const bqcSignDate = parseCustomDate(bqcSignDateStr);
    const techEvalReceiptDate = parseCustomDate(techEvalReceiptDateStr);
    let techEvalAfterBqcOverhangHours = 0;
    let techEvalAfterBqcOverhangDays = 0;
    if (bqcSignDate && techEvalReceiptDate && techEvalReceiptDate.getTime() > bqcSignDate.getTime()) {
      techEvalAfterBqcOverhangHours = Math.round((workingMsBetween(bqcSignDate, techEvalReceiptDate) / (1000 * 60 * 60)) * 10) / 10;
      techEvalAfterBqcOverhangDays = Math.round((techEvalAfterBqcOverhangHours / 24) * 10) / 10;
    }

    let runningGrossHours = 0;
    let runningDeductionHours = 0;

    // Primary: Stage-wise Total Time calculated for the canonical stages with cumulative tracking & deductions
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

      runningGrossHours += s.totalHours;

      let stageDeductionHours = 0;
      let stageDeductionReason = '';

      // Stage 1 deduction: Time between PR Indent and Actionable PR
      if ((stageName === 'PR Received' || idx === 0) && preActionablePrHours > 0) {
        stageDeductionHours = preActionablePrHours;
        stageDeductionReason = 'Pre-Actionable Indent Time (Deducted from SLA)';
      }

      // Stage 3 deduction: Technical evaluation receipt after BQC signing date
      if ((stageName === 'BQC approval' || stageName === 'BQC Preparation' || idx === 2) && techEvalAfterBqcOverhangHours > 0) {
        stageDeductionHours = techEvalAfterBqcOverhangHours;
        stageDeductionReason = 'Technical evaluation receipt after BQC signing date overhang';
      }

      runningDeductionHours += stageDeductionHours;

      const stageNetSlaHours = Math.max(0, s.totalHours - stageDeductionHours);
      const stageNetSlaDays = Math.round((stageNetSlaHours / 24) * 10) / 10;

      const cumulativeGrossDays = Math.round((runningGrossHours / 24) * 10) / 10;
      const cumulativeNetSlaHours = Math.max(0, runningGrossHours - runningDeductionHours);
      const cumulativeNetSlaDays = Math.round((cumulativeNetSlaHours / 24) * 10) / 10;

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
        // Cumulative & Deduction tracking
        cumulativeGrossHours: Math.round(runningGrossHours * 10) / 10,
        cumulativeGrossDays,
        stageDeductionHours: Math.round(stageDeductionHours * 10) / 10,
        stageDeductionDays: Math.round((stageDeductionHours / 24) * 10) / 10,
        stageDeductionReason,
        stageNetSlaHours: Math.round(stageNetSlaHours * 10) / 10,
        stageNetSlaDays,
        cumulativeNetSlaHours: Math.round(cumulativeNetSlaHours * 10) / 10,
        cumulativeNetSlaDays,
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

    const totalGrossElapsedHours = Math.round(totalHours * 10) / 10;
    const totalGrossElapsedDays = totalDays;
    const totalSlaDeductionsHours = Math.round((preActionablePrHours + techEvalAfterBqcOverhangHours) * 10) / 10;
    const totalSlaDeductionsDays = Math.round((totalSlaDeductionsHours / 24) * 10) / 10;
    const finalNetSlaHours = Math.max(0, Math.round((totalGrossElapsedHours - totalSlaDeductionsHours) * 10) / 10);
    const finalNetSlaDays = Math.round((finalNetSlaHours / 24) * 10) / 10;

    return {
      stages,
      officersSummary,
      totalHours: totalGrossElapsedHours,
      totalDays: totalGrossElapsedDays,
      quickTurnaroundsCount,
      totalOfficersCount: officersSummary.length,
      entriesWithDuration,
      prIndentDateStr,
      actionablePrDateStr,
      bqcSignDateStr,
      techEvalReceiptDateStr,
      preActionablePrHours,
      preActionablePrDays,
      techEvalAfterBqcOverhangHours,
      techEvalAfterBqcOverhangDays,
      totalSlaDeductionsHours,
      totalSlaDeductionsDays,
      finalNetSlaHours,
      finalNetSlaDays,
    };
  }, [tender, derivedMilestones, effectiveTimeline]);

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
      alert('Select who to send this tender to.');
      return;
    }

    const recipientObj = USERS.find((u) => u.name === selectedRecipient);
    const role: UserRole = recipientObj ? recipientObj.role : 'PM';

    const evaluationHolders = getEvaluationHolders(tender);
    if (selectedNextStage !== EVALUATION_STAGE && evaluationHolders.length > 0) {
      alert(`Bidders are still with Finance (${evaluationHolders.join(', ')}). They must be returned first.`);
      return;
    }

    const isAdvancingToAward =
      selectedNextStage === 'Under Award Approval' ||
      selectedNextStage === 'Awarded' ||
      selectedNextStage.toLowerCase().includes('award');

    if (isAdvancingToAward) {
      const missing: string[] = [];
      if (!tender.bqc_eval_signed_on || !tender.bqc_eval_signed_on.trim()) {
        missing.push('BQC Evaluation Signed on');
      }
      if (!tender.emd_eval_signed_on || !tender.emd_eval_signed_on.trim()) {
        missing.push('EMD evaluation signed on');
      }
      if (!tender.techno_comm_signed_on || !tender.techno_comm_signed_on.trim()) {
        missing.push('Techno commercial signed on');
      }
      if (!tender.cashflow_stmt_signed_on || !tender.cashflow_stmt_signed_on.trim()) {
        missing.push('Cashflow statement signed on');
      }
      if (tender.estimate_value_cr === null || tender.estimate_value_cr === undefined || tender.estimate_value_cr <= 0) {
        missing.push('Estimate Amount');
      }
      if (!tender.tender_floated_on || !tender.tender_floated_on.trim()) {
        missing.push('Tender Floated On date');
      }
      if (!tender.tender_opened_due_on || !tender.tender_opened_due_on.trim()) {
        missing.push('Tender Opened / Due On date');
      }
      if (!tender.item_description || !tender.item_description.trim()) {
        missing.push('Item Description');
      }

      if (missing.length > 0) {
        setAwardValidationMissing(missing);
        return;
      }
    }

    let awardedVal: number | undefined = undefined;
    let savingsVal: number | undefined = undefined;

    if (selectedNextStage === 'Awarded') {
      const parsedAward = parseFloat(awardedValInput);
      if (!isNaN(parsedAward) && parsedAward > 0) {
        awardedVal = parsedAward;
        if (tender.estimate_value_cr && tender.estimate_value_cr > parsedAward) {
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

  // Estimate & Tender Edit Permissions
  const isSentForEstimate =
    tender.brief_status === 'Under Estimation' ||
    tender.current_role === 'CEC' ||
    tender.estimate_value_cr !== null ||
    (tender.timeline && tender.timeline.some((t) => t.stage.toLowerCase().includes('estimat')));

  const isEstimatePerson =
    currentUser.role === 'CEC' ||
    (tender.attached_cec_officers && tender.attached_cec_officers.includes(currentUser.name)) ||
    currentUser.role === 'ADMIN';

  // Only the person who created the tender (or Admin) can edit all tender fields (except estimate amount)
  const tenderCreatorName = tender.created_by || tender.pm_officer;
  const isTenderCreator =
    (tender.created_by && tender.created_by.toLowerCase() === currentUser.name.toLowerCase()) ||
    currentUser.role === 'ADMIN' ||
    (!tender.created_by && (
      tender.pm_officer.toLowerCase() === currentUser.name.toLowerCase() ||
      (tender.attached_pms && tender.attached_pms.some((p) => p.toLowerCase() === currentUser.name.toLowerCase()))
    ));

  const canEditTender = isTenderCreator;

  // Award validation blocker state
  const [awardValidationMissing, setAwardValidationMissing] = useState<string[] | null>(null);

  // State for Editing Tender Details & Key Milestones
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [editItemDescription, setEditItemDescription] = useState(tender.item_description);
  const [editDeliveryLocation, setEditDeliveryLocation] = useState(tender.delivery_location || '');
  const [editRequisitionerContact, setEditRequisitionerContact] = useState(tender.requisitioner_contact || '');
  const [editTargetFloatDate, setEditTargetFloatDate] = useState(tender.tender_floated_on || '');
  const [editTargetDueDate, setEditTargetDueDate] = useState(tender.tender_opened_due_on || '');
  const [editTechEvalRequired, setEditTechEvalRequired] = useState(tender.tech_eval_required || 'YES');
  const [editBqcRequired, setEditBqcRequired] = useState(tender.bqc_required || 'YES');
  const [editPriority, setEditPriority] = useState(tender.priority || 'Normal');
  const [editRemarks, setEditRemarks] = useState(tender.remarks || '');

  // 4 Key Milestone Sign-offs (Editable, non-compulsory initially, mandatory before award)
  const [editBqcEvalSignedOn, setEditBqcEvalSignedOn] = useState(tender.bqc_eval_signed_on || '');
  const [editEmdEvalSignedOn, setEditEmdEvalSignedOn] = useState(tender.emd_eval_signed_on || '');
  const [editTechnoCommSignedOn, setEditTechnoCommSignedOn] = useState(tender.techno_comm_signed_on || '');
  const [editCashflowStmtSignedOn, setEditCashflowStmtSignedOn] = useState(tender.cashflow_stmt_signed_on || '');

  useEffect(() => {
    setEditItemDescription(tender.item_description);
    setEditDeliveryLocation(tender.delivery_location || '');
    setEditRequisitionerContact(tender.requisitioner_contact || '');
    setEditTargetFloatDate(tender.tender_floated_on || '');
    setEditTargetDueDate(tender.tender_opened_due_on || '');
    setEditTechEvalRequired(tender.tech_eval_required || 'YES');
    setEditBqcRequired(tender.bqc_required || 'YES');
    setEditPriority(tender.priority || 'Normal');
    setEditRemarks(tender.remarks || '');
    setEditBqcEvalSignedOn(tender.bqc_eval_signed_on || '');
    setEditEmdEvalSignedOn(tender.emd_eval_signed_on || '');
    setEditTechnoCommSignedOn(tender.techno_comm_signed_on || '');
    setEditCashflowStmtSignedOn(tender.cashflow_stmt_signed_on || '');
  }, [tender]);

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTenderCreator) {
      alert(`Only the tender creator (${tenderCreatorName}) can edit this tender.`);
      return;
    }

    const updated: Tender = {
      ...tender,
      item_description: editItemDescription.trim() || tender.item_description,
      delivery_location: editDeliveryLocation.trim() || undefined,
      requisitioner_contact: editRequisitionerContact.trim() || undefined,
      tender_floated_on: editTargetFloatDate || tender.tender_floated_on,
      tender_opened_due_on: editTargetDueDate || tender.tender_opened_due_on,
      tech_eval_required: editTechEvalRequired,
      bqc_required: editBqcRequired,
      priority: editPriority,
      remarks: editRemarks.trim() || tender.remarks,
      bqc_eval_signed_on: editBqcEvalSignedOn || undefined,
      emd_eval_signed_on: editEmdEvalSignedOn || undefined,
      techno_comm_signed_on: editTechnoCommSignedOn || undefined,
      cashflow_stmt_signed_on: editCashflowStmtSignedOn || undefined,
    };
    if (onUpdateTender) {
      onUpdateTender(updated);
    }
    setIsEditDetailsOpen(false);
  };

  const handleSaveEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEstimatePerson) {
      alert('Only the CEC officer can change the estimate amount.');
      return;
    }
    const parsed = parseFloat(editEstimateValue);
    if (isNaN(parsed) || parsed <= 0) {
      alert('Enter an estimate value greater than 0.');
      return;
    }

    const updatedTender: Tender = {
      ...tender,
      estimate_value_cr: +parsed.toFixed(2),
      remarks: editEstimateRemarks.trim()
        ? `${tender.remarks} | Estimate added/updated: ${editEstimateRemarks.trim()}`
        : tender.remarks,
    };

    if (onUpdateTender) {
      onUpdateTender(updatedTender);
    }
    setIsEditEstimateOpen(false);
  };

  // State for Editing Award Value and Savings (Editable only by Tender Creator, and only before Award)
  const [isEditAwardSavingsOpen, setIsEditAwardSavingsOpen] = useState(false);
  const [editAwardedValue, setEditAwardedValue] = useState<string>(
    tender.awarded_value_cr !== null && tender.awarded_value_cr !== undefined ? tender.awarded_value_cr.toString() : ''
  );
  const [editSavingsValue, setEditSavingsValue] = useState<string>(
    tender.savings_due_to_negotiation_cr !== null && tender.savings_due_to_negotiation_cr !== undefined
      ? tender.savings_due_to_negotiation_cr.toString()
      : ''
  );

  useEffect(() => {
    setEditAwardedValue(
      tender.awarded_value_cr !== null && tender.awarded_value_cr !== undefined ? tender.awarded_value_cr.toString() : ''
    );
    setEditSavingsValue(
      tender.savings_due_to_negotiation_cr !== null && tender.savings_due_to_negotiation_cr !== undefined
        ? tender.savings_due_to_negotiation_cr.toString()
        : ''
    );
  }, [tender]);

  const handleSaveAwardAndSavings = (e: React.FormEvent) => {
    e.preventDefault();
    if (tender.brief_status === 'Awarded') {
      alert('Award value and savings cannot be edited after award.');
      return;
    }
    if (!isTenderCreator) {
      alert(`Only the tender creator (${tenderCreatorName}) can edit award value and savings.`);
      return;
    }
    const parsedAward = editAwardedValue.trim() ? parseFloat(editAwardedValue) : null;
    const parsedSavings = editSavingsValue.trim() ? parseFloat(editSavingsValue) : null;

    const updated: Tender = {
      ...tender,
      awarded_value_cr: parsedAward !== null && !isNaN(parsedAward) ? +parsedAward.toFixed(2) : null,
      savings_due_to_negotiation_cr: parsedSavings !== null && !isNaN(parsedSavings) ? +parsedSavings.toFixed(2) : null,
    };

    if (onUpdateTender) {
      onUpdateTender(updated);
    }
    setIsEditAwardSavingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col w-full h-full overflow-hidden animate-fadeIn">
      <div className="bg-white w-full flex flex-col h-full overflow-hidden">
        {/* Page-level Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back</span>
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
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
                  {tender.tender_type}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {tender.user_function}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Created by: {tenderCreatorName}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-4xl">
                {tender.item_description}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {tender.current_holder && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Currently with: <strong>{tender.current_holder} ({tender.current_role})</strong></span>
              </span>
            )}
            {/* Advance / Send File Button */}
            {tender.brief_status !== 'Awarded' && tender.brief_status !== 'Cancelled' && (
              <button
                onClick={() => setIsHandoffOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            )}

            {/* Edit Tender Details Button (Available ONLY to person who created tender, or Admin) */}
            {canEditTender ? (
              <button
                onClick={() => setIsEditDetailsOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit Details"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Edit Details</span>
              </button>
            ) : (
              <div
                className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1"
                title="Only the creator can edit"
              >
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            )}

            {/* Cancel Tender Button (Available at ANY stage) */}
            {tender.brief_status !== 'Cancelled' && onCancelTender && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cancel Tender"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Cancel Tender</span>
              </button>
            )}
            {/* Expand / Minimize Full Page Toggle */}
            <button
              onClick={() => setIsExpandedFullPage(!isExpandedFullPage)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isExpandedFullPage
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100'
              }`}
              title={isExpandedFullPage ? "Show Stages" : "Hide Stages"}
            >
              {isExpandedFullPage ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Stepper Bar across Stages */}
        {!isExpandedFullPage && (
          <div className="p-3 px-4 sm:px-6 bg-white border-b border-slate-200 shrink-0 animate-fadeIn">
            <div className="w-full max-w-[1800px] mx-auto">
              <div className="flex items-center w-full justify-between relative px-2 overflow-x-auto py-1">
                {STAGE_STEPS.map((stage, idx) => {
                  const tenderIdx = getStageStepIndex(tender.brief_status);
                  const isPast = tenderIdx > idx || tender.brief_status === 'Awarded';
                  const isCurrent = tender.brief_status === stage;

                  return (
                    <div key={stage} className="flex-1 flex flex-col items-center relative group min-w-[70px]">
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
                        className={`text-[10px] mt-1.5 text-center leading-tight font-medium max-w-[100px] ${
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
          </div>
        )}

        {/* Tab Navigation & Expand Controls */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 shrink-0">
          <div className="flex items-center justify-between w-full max-w-[1800px] mx-auto">
            <div className="flex items-center">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2.5 px-4 sm:px-5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('excel-fields')}
                className={`py-2.5 px-4 sm:px-5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'excel-fields'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Fields
              </button>
              {canViewTimeline && (
                <button
                  onClick={() => setActiveTab('audit-log')}
                  className={`py-2.5 px-4 sm:px-5 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'audit-log'
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Timeline</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold">
                    {effectiveTimeline.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('team')}
                className={`py-2.5 px-4 sm:px-5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'team'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Team
              </button>
            </div>

            <div className="flex items-center gap-2 py-1 shrink-0">
              <button
                onClick={() => setIsExpandedFullPage(!isExpandedFullPage)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isExpandedFullPage
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isExpandedFullPage ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Show Stages</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Hide Stages</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/50">
          <div className="w-full max-w-[1800px] mx-auto space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* CANCELLATION BANNER (IF CANCELLED) */}
              {tender.brief_status === 'Cancelled' && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 shadow-xs space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs shrink-0">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-rose-950">
                          Tender Cancelled
                        </h3>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/80 p-3 rounded-lg border border-rose-200">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Cancelled On</span>
                          <span className="font-semibold text-slate-800">{tender.cancellation_info?.cancelled_on || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Cancelled By</span>
                          <span className="font-semibold text-slate-800">
                            {tender.cancellation_info?.cancelled_by || tender.pm_officer} ({tender.cancellation_info?.cancelled_role || 'PM'})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Stage At Cancellation</span>
                          <span className="font-semibold text-rose-700">{tender.cancellation_info?.stage_at_cancellation || '—'}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 text-xs text-rose-950">
                        <strong>Reason:</strong>{' '}
                        <span className="font-medium">{tender.cancellation_info?.reason || '—'}</span>
                      </div>
                      {tender.cancellation_info?.remarks && (
                        <p className="mt-1 text-xs text-rose-800 italic bg-rose-100/50 p-2 rounded border border-rose-200">
                          &quot;{tender.cancellation_info.remarks}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* POST-AWARD PROCEDURAL WORKFLOW & STEPS (IF AWARDED) */}
              {tender.brief_status === 'Awarded' && onAddPostAwardStep && onTogglePostAwardStep && onDeletePostAwardStep && onCloseTender && (
                <PostAwardStepsSection
                  tender={tender}
                  currentUser={currentUser}
                  onAddStep={onAddPostAwardStep}
                  onToggleStep={onTogglePostAwardStep}
                  onDeleteStep={onDeletePostAwardStep}
                  onCloseTender={onCloseTender}
                />
              )}

              {/* EMD & BQC EVALUATION (PARALLEL WORK OF TENDER CREATOR AND FINANCE) */}
              {onUpdateTender &&
                (tender.brief_status === EVALUATION_STAGE || (tender.evaluation?.bidders?.length ?? 0) > 0) && (
                  <EvaluationSection tender={tender} currentUser={currentUser} onUpdateTender={onUpdateTender} />
                )}

              {/* Financial KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Estimated Value</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditEstimateValue(tender.estimate_value_cr !== null && tender.estimate_value_cr !== undefined ? tender.estimate_value_cr.toString() : '');
                        setEditEstimateRemarks('');
                        setIsEditEstimateOpen(true);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-blue-600" />
                      <span>{tender.estimate_value_cr ? 'Edit' : '+ Add Estimate'}</span>
                    </button>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                    {tender.estimate_value_cr !== null && tender.estimate_value_cr !== undefined ? (
                      formatCurrencyCr(tender.estimate_value_cr)
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Awarded Value</div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
                    {tender.awarded_value_cr ? formatCurrencyCr(tender.awarded_value_cr) : '—'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Negotiated Savings</div>
                  <div className="text-lg sm:text-xl font-bold text-blue-700 mt-1">
                    {tender.savings_due_to_negotiation_cr
                      ? formatCurrencyCr(tender.savings_due_to_negotiation_cr)
                      : '—'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Net SLA</div>
                  <div className="text-lg sm:text-xl font-bold text-amber-700 mt-1">
                    {stageAnalysisData.finalNetSlaDays !== undefined
                      ? `${stageAnalysisData.finalNetSlaDays} Days`
                      : tender.sla_days
                      ? `${tender.sla_days} Days`
                      : '—'}
                  </div>
                  {stageAnalysisData.totalSlaDeductionsDays > 0 && (
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                      Deductions: -{stageAnalysisData.totalSlaDeductionsDays}d
                    </div>
                  )}
                </div>
              </div>

              {/* Time Breakdown by Role */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                  Days Held by Role
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-center">
                    <div className="text-xs text-blue-700 font-semibold">Procurement (PM)</div>
                    <div className="text-2xl font-bold text-blue-900 mt-1">
                      {tender.days_by_role?.PM || 0} <span className="text-xs font-normal">days</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-center">
                    <div className="text-xs text-emerald-700 font-semibold">Finance (FM)</div>
                    <div className="text-2xl font-bold text-emerald-900 mt-1">
                      {tender.days_by_role?.FM || 0} <span className="text-xs font-normal">days</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg text-center">
                    <div className="text-xs text-amber-700 font-semibold">Estimation (CEC)</div>
                    <div className="text-2xl font-bold text-amber-900 mt-1">
                      {tender.days_by_role?.CEC || 0} <span className="text-xs font-normal">days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks and Status */}
              {tender.remarks && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <MessageSquareQuote className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Remarks</div>
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
                <div className="font-bold text-blue-700 uppercase tracking-wider mb-3">
                  1. Identification & Indent
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Sr No</span>
                    <span className="font-semibold text-slate-900">{tender.sr_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">PR No / Email Reference</span>
                    <span className="font-semibold text-slate-900 font-mono">{tender.pr_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">CRFQ No</span>
                    <span className="font-semibold text-slate-900 font-mono">{tender.crfq_no || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">User Function</span>
                    <span className="font-semibold text-slate-900">{tender.user_function}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Procuring Officer</span>
                    <span className="font-semibold text-slate-900">{tender.pm_officer}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tender Type</span>
                    <span className="font-semibold text-slate-900">{tender.tender_type}</span>
                  </div>
                </div>
              </div>

              {/* Group 2: Key Milestones & Mandatory Sign-offs */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="font-bold text-blue-700 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span>2. Milestones & Sign-offs</span>
                  </div>
                  {isTenderCreator && (
                    <button
                      type="button"
                      onClick={() => setIsEditDetailsOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Milestones</span>
                    </button>
                  )}
                </div>

                {/* Sub-section: 4 Critical Sign-offs Required Before Award */}
                <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                      <span>Sign-offs</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {[
                        tender.bqc_eval_signed_on,
                        tender.emd_eval_signed_on,
                        tender.techno_comm_signed_on,
                        tender.cashflow_stmt_signed_on,
                      ].filter(Boolean).length}{' '}
                      of 4 signed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        BQC Evaluation Signed on
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {tender.bqc_eval_signed_on ? (
                          <span className="text-emerald-700 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {tender.bqc_eval_signed_on}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending</span>
                        )}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        EMD Evaluation Signed on
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {tender.emd_eval_signed_on ? (
                          <span className="text-emerald-700 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {tender.emd_eval_signed_on}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending</span>
                        )}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Techno Commercial Signed on
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {tender.techno_comm_signed_on ? (
                          <span className="text-emerald-700 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {tender.techno_comm_signed_on}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending</span>
                        )}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Cashflow Statement Signed on
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {tender.cashflow_stmt_signed_on ? (
                          <span className="text-emerald-700 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {tender.cashflow_stmt_signed_on}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Milestones Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Date of PR Initial Indent</span>
                    <span className="font-medium text-slate-800">
                      {tender.date_pr_initial_indent || derivedMilestones.date_pr_initial_indent || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Receipt of Actionable PR</span>
                    <span className="font-medium text-slate-800">
                      {tender.receipt_actionable_pr || derivedMilestones.receipt_actionable_pr || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Date Receipt Estimate from CEC</span>
                    <span className="font-medium text-slate-800">
                      {tender.date_receipt_estimate_cec || derivedMilestones.date_receipt_estimate_cec || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tender Floated On</span>
                    <span className="font-medium text-slate-800">
                      {tender.tender_floated_on || derivedMilestones.tender_floated_on || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tender Opened / Due On</span>
                    <span className="font-medium text-slate-800">
                      {tender.tender_opened_due_on || derivedMilestones.tender_opened_due_on || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tender Sent for Tech Eval</span>
                    <span className="font-medium text-slate-800">
                      {tender.tender_sent_tech_eval || derivedMilestones.tender_sent_tech_eval || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Receipt of Tech Evaluation</span>
                    <span className="font-medium text-slate-800">
                      {tender.receipt_tech_eval || derivedMilestones.receipt_tech_eval || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 3: Financials & Commercials */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
                  <div className="font-bold text-blue-700 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span>3. Value & Savings</span>
                  </div>
                  {/* Edit Award & Savings button for Tender Creator before Award */}
                  {isTenderCreator && tender.brief_status !== 'Awarded' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditAwardedValue(tender.awarded_value_cr !== null && tender.awarded_value_cr !== undefined ? tender.awarded_value_cr.toString() : '');
                        setEditSavingsValue(tender.savings_due_to_negotiation_cr !== null && tender.savings_due_to_negotiation_cr !== undefined ? tender.savings_due_to_negotiation_cr.toString() : '');
                        setIsEditAwardSavingsOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Award & Savings</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Estimate Value - entered only by estimate officer */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 block text-[11px]">Estimate Value (Rs Cr)</span>
                      {isSentForEstimate && isEstimatePerson && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditEstimateValue(
                              tender.estimate_value_cr !== null && tender.estimate_value_cr !== undefined
                                ? tender.estimate_value_cr.toString()
                                : ''
                            );
                            setEditEstimateRemarks('');
                            setIsEditEstimateOpen(true);
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          {tender.estimate_value_cr ? 'Edit' : '+ Add Estimate'}
                        </button>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {tender.estimate_value_cr !== null && tender.estimate_value_cr !== undefined ? (
                        formatCurrencyCr(tender.estimate_value_cr)
                      ) : !isSentForEstimate ? (
                        <span className="text-xs text-slate-400 italic">—</span>
                      ) : isEstimatePerson ? (
                        <span className="text-xs text-amber-700 italic">Pending</span>
                      ) : (
                        <span className="text-xs text-amber-600 italic">
                          Pending with {tender.attached_cec_officers?.[0] || 'CEC'}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Awarded Value - editable only by tender creator, locked once awarded */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 block text-[11px]">Awarded Value (Rs Cr, Inclusive of Taxes)</span>
                      {tender.brief_status === 'Awarded' ? (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                          Locked
                        </span>
                      ) : isTenderCreator ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditAwardedValue(tender.awarded_value_cr !== null && tender.awarded_value_cr !== undefined ? tender.awarded_value_cr.toString() : '');
                            setEditSavingsValue(tender.savings_due_to_negotiation_cr !== null && tender.savings_due_to_negotiation_cr !== undefined ? tender.savings_due_to_negotiation_cr.toString() : '');
                            setIsEditAwardSavingsOpen(true);
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          {tender.awarded_value_cr ? 'Edit' : '+ Enter'}
                        </button>
                      ) : null}
                    </div>
                    <span className="font-bold text-emerald-700 block mt-0.5">
                      {tender.awarded_value_cr !== null && tender.awarded_value_cr !== undefined
                        ? formatCurrencyCr(tender.awarded_value_cr)
                        : <span className="text-xs text-slate-400 italic">Pending</span>}
                    </span>
                  </div>

                  {/* Savings Due to Negotiation - editable only by tender creator, locked once awarded */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 block text-[11px]">Savings Due to Negotiation (Rs Cr)</span>
                      {tender.brief_status === 'Awarded' ? (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                          Locked
                        </span>
                      ) : isTenderCreator ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditAwardedValue(tender.awarded_value_cr !== null && tender.awarded_value_cr !== undefined ? tender.awarded_value_cr.toString() : '');
                            setEditSavingsValue(tender.savings_due_to_negotiation_cr !== null && tender.savings_due_to_negotiation_cr !== undefined ? tender.savings_due_to_negotiation_cr.toString() : '');
                            setIsEditAwardSavingsOpen(true);
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          {tender.savings_due_to_negotiation_cr ? 'Edit' : '+ Enter'}
                        </button>
                      ) : null}
                    </div>
                    <span className="font-bold text-blue-700 block mt-0.5">
                      {tender.savings_due_to_negotiation_cr !== null && tender.savings_due_to_negotiation_cr !== undefined
                        ? formatCurrencyCr(tender.savings_due_to_negotiation_cr)
                        : <span className="text-xs text-slate-400 italic">Pending</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL LOG WITH 2 SWITCHES */}
          {activeTab === 'audit-log' && canViewTimeline && (
            <div className="space-y-4">
              {/* Header Card with the 2 Switches */}
              {/* TIMELINE & TRANSIT INTELLIGENCE BANNER */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Timeline</span>
                  </h3>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-mono font-bold bg-white text-slate-800 px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      Total Elapsed: {formatDurationWithUnit(stageAnalysisData.totalHours, durationUnitMode)}
                    </span>
                  </div>
                </div>

                {/* THE 2 SWITCHES */}
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
                    <span className="truncate">File Movement Log</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                        timelineViewMode === 'movement'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {effectiveTimeline.length}
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
                    <span className="truncate">Stage-wise Breakdown</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 flex items-center gap-1 ${
                        timelineViewMode === 'stage-officer-breakdown'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span>{STAGE_STEPS.length} Stages</span>
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
                        <option value="ALL">All Stages ({effectiveTimeline.length})</option>
                        {distinctStages.map((st, idx) => (
                          <option key={st} value={st}>
                            Stage {idx + 1}: {st}
                          </option>
                        ))}
                      </select>

                      <select
                        value={movementOfficerFilter}
                        onChange={(e) => setMovementOfficerFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-md px-2 py-1.5 font-medium focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ALL">All Officers ({distinctOfficers.length})</option>
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
                          <b>{filteredMovementEntries.length}</b> of {effectiveTimeline.length} movements
                        </span>
                      </div>
                      {stageAnalysisData.quickTurnaroundsCount > 0 && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <Zap className="w-2.5 h-2.5 text-amber-600" />
                          <span>{stageAnalysisData.quickTurnaroundsCount} under 24h</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Movements Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                          <th className="py-2.5 px-3 w-10 text-slate-400">#</th>
                          <th className="py-2.5 px-3">Stage</th>
                          <th className="py-2.5 px-3">Officer</th>
                          <th className="py-2.5 px-3 font-mono">Entry Date</th>
                          <th className="py-2.5 px-3 font-mono">Exit Date</th>
                          <th className="py-2.5 px-3 text-right">Duration</th>
                          <th className="py-2.5 px-3">Remarks</th>
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
                              <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                                {item.index + 1}
                              </td>

                              {/* Stage */}
                              <td className="py-3 px-3 font-medium text-slate-900">
                                {(() => {
                                  const canonicalStage = normalizeToNineStages(item.entry.stage);
                                  const stageIdx = getStageStepIndex(canonicalStage);
                                  const isBqcFinance =
                                    (canonicalStage === 'BQC approval' || canonicalStage === 'BQC Preparation') &&
                                    (item.entry.role === 'FM' ||
                                      (item.entry.remarks && item.entry.remarks.toLowerCase().includes('finance')) ||
                                      (item.entry.stage && item.entry.stage.toLowerCase().includes('finance')));

                                  return (
                                    <div>
                                      <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                        <span>{canonicalStage}</span>
                                        {item.entry.sub_stage && (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                                            {item.entry.sub_stage}
                                          </span>
                                        )}
                                        {isBqcFinance && (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                            Finance Review of BQC
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        Stage {stageIdx + 1} of {STAGE_STEPS.length}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* Officer */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${roleB.bg} ${roleB.text} ${roleB.border} border`}
                                  >
                                    {item.entry.role}
                                  </span>
                                  <div>
                                    <div className="font-semibold text-slate-900">{item.entry.holder}</div>
                                    <div className="text-[10px] text-slate-500">{group}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Entry Date */}
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                                {item.entry.entry_date}
                              </td>

                              {/* Exit Date */}
                              <td className="py-3 px-3 font-mono text-[11px]">
                                {item.entry.exit_date ? (
                                  <span className="text-slate-600">{item.entry.exit_date}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Current
                                  </span>
                                )}
                              </td>

                              {/* Time Spent */}
                              <td className="py-3 px-3 text-right">
                                {isCurrent ? (
                                  <div className="inline-flex flex-col items-end">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                      Active ({item.formattedDisplay})
                                    </span>
                                  </div>
                                ) : isQuick ? (
                                  <div className="inline-flex flex-col items-end">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-50 text-amber-900 border border-amber-300">
                                      <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                                      {item.formattedDisplay}
                                    </span>
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
                              <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs">
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
                  {/* Stage-wise Time Breakdown Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Stage-wise Time Breakdown
                    </h3>
                    <div className="text-right shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Elapsed</div>
                      <div className="text-sm font-black font-mono text-blue-900">
                        {stageAnalysisData.totalDays} Days ({formatNumber(stageAnalysisData.totalHours)} hrs)
                      </div>
                    </div>
                  </div>

                  {/* Compact Granularity Controls & Quick Action Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                    {/* Unit Switcher */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-blue-600" />
                        <span>Unit:</span>
                      </span>
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px]">
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
                          className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3 text-slate-500" />
                          <span>Expand All</span>
                        </button>
                        <button
                          type="button"
                          onClick={collapseAllStages}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Minimize2 className="w-3 h-3 text-slate-500" />
                          <span>Collapse All</span>
                        </button>
                      </div>

                      <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        <strong className="text-slate-800">{stageAnalysisData.totalOfficersCount}</strong> officers
                      </span>

                      {stageAnalysisData.quickTurnaroundsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600" />
                          <span>{stageAnalysisData.quickTurnaroundsCount} under 24h</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ONE-VIEW STAGES ACCORDION: Click any stage to inspect officer breakdown */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-200">
                    {/* Header Row for One-View Table */}
                    <div className="bg-slate-50 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden md:grid md:grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">Stage</div>
                      <div className="col-span-2 text-right">Gross Time</div>
                      <div className="col-span-2 text-right">Deductions</div>
                      <div className="col-span-1 text-right">Net SLA</div>
                      <div className="col-span-1 text-right">Cumul. Gross</div>
                      <div className="col-span-1 text-right text-emerald-800">Cumul. SLA</div>
                      <div className="col-span-1 text-center">Inspect</div>
                    </div>

                    {stageAnalysisData.stages.map((stage, sIdx) => {
                      const isExpanded = expandedStages[stage.stageName] === true;

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
                            className="p-3 sm:px-3.5 sm:py-2.5 cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-2 items-start md:items-center select-none"
                          >
                            {/* Col 1: Stage Number & Name & Status */}
                            <div className="flex items-center gap-2.5 md:col-span-4 min-w-0">
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
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Done
                                    </span>
                                  )}

                                  {stage.status === 'in-progress' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                      Active
                                    </span>
                                  )}

                                  {stage.status === 'pending' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>{stage.officers.length} officer(s)</span>
                                  <span>•</span>
                                  <span>{stage.percentageOfTotal}% of pipeline</span>
                                </div>
                              </div>
                            </div>

                            {/* Col 2: Stage Gross Time */}
                            <div className="flex md:justify-end items-center gap-1.5 md:col-span-2 text-right w-full md:w-auto justify-between">
                              <span className="text-xs md:hidden font-semibold text-slate-500">Gross Time:</span>
                              <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
                                {stage.hasData
                                  ? formatDurationWithUnit(stage.totalHours, durationUnitMode)
                                  : '0 d'}
                              </span>
                            </div>

                            {/* Col 3: Non-SLA Deductions */}
                            <div className="flex md:justify-end items-center gap-1.5 md:col-span-2 text-right w-full md:w-auto justify-between">
                              <span className="text-xs md:hidden font-semibold text-slate-500">Deductions:</span>
                              {stage.stageDeductionHours > 0 ? (
                                <span className="text-xs font-bold font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  -{formatDurationWithUnit(stage.stageDeductionHours, durationUnitMode)}
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-slate-300">—</span>
                              )}
                            </div>

                            {/* Col 4: Stage Net SLA */}
                            <div className="flex md:justify-end items-center gap-1.5 md:col-span-1 text-right w-full md:w-auto justify-between">
                              <span className="text-xs md:hidden font-semibold text-slate-500">Net SLA:</span>
                              <span className="text-xs font-black font-mono text-blue-900">
                                {stage.hasData
                                  ? formatDurationWithUnit(stage.stageNetSlaHours, durationUnitMode)
                                  : '0 d'}
                              </span>
                            </div>

                            {/* Col 5: Cumulative Gross Total */}
                            <div className="flex md:justify-end items-center gap-1.5 md:col-span-1 text-right w-full md:w-auto justify-between">
                              <span className="text-xs md:hidden font-semibold text-slate-500">Cumul. Gross:</span>
                              <span className="text-xs font-bold font-mono text-slate-700">
                                {stage.cumulativeGrossDays} d
                              </span>
                            </div>

                            {/* Col 6: Cumulative Net SLA */}
                            <div className="flex md:justify-end items-center gap-1.5 md:col-span-1 text-right w-full md:w-auto justify-between">
                              <span className="text-xs md:hidden font-semibold text-slate-500">Cumul. SLA:</span>
                              <span className="text-xs font-black font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                                {stage.cumulativeNetSlaDays} d
                              </span>
                            </div>

                            {/* Col 7: Action (Inspect / Expand) */}
                            <div className="flex md:justify-center items-center gap-1 md:col-span-1 self-end md:self-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStageExpand(stage.stageName);
                                }}
                                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
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
                                    <span className="md:hidden">Breakdown</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* EXPANDED OFFICER BREAKDOWN: Shown after clicking into it */}
                          {isExpanded && (
                            <div className="p-3.5 sm:p-4 bg-slate-50/60 border-t border-slate-200 space-y-3">
                              {/* STAGE 1 DEDICATED BREAK-UP: Time Between PR Indent & Actionable PR */}
                              {stage.stageNumber === 1 && (
                                <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                                    <div className="flex items-center gap-2">
                                      <Timer className="w-4 h-4 text-amber-700 shrink-0" />
                                      <span className="font-bold text-xs text-amber-950">
                                        PR Indent to Actionable PR
                                      </span>
                                    </div>
                                    <div className="text-xs font-mono font-bold text-amber-900">
                                      {stageAnalysisData.preActionablePrDays} Days ({formatNumber(stageAnalysisData.preActionablePrHours)} hrs)
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                                    <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Date of PR Initial Indent</span>
                                      <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                                        {stageAnalysisData.prIndentDateStr || tender.date_pr_initial_indent || '—'}
                                      </span>
                                    </div>

                                    <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Receipt of Actionable PR</span>
                                      <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                                        {stageAnalysisData.actionablePrDateStr || tender.receipt_actionable_pr || '—'}
                                      </span>
                                    </div>

                                    <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                                      <span className="text-[10px] font-bold uppercase text-amber-700 block">SLA Deduction</span>
                                      <span className="font-semibold text-slate-800 mt-0.5 block">
                                        {stageAnalysisData.preActionablePrDays > 0 ? (
                                          <span className="text-amber-800 font-bold">
                                            -{stageAnalysisData.preActionablePrDays} days
                                          </span>
                                        ) : (
                                          <span className="text-slate-500">0 days</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* STAGE 3 DEDICATED CALCULATION: Technical Evaluation Overhang SLA Reduction */}
                              {stage.stageNumber === 3 && (
                                <div className="bg-purple-50/90 border border-purple-300 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/80 pb-2">
                                    <div className="flex items-center gap-2">
                                      <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                                      <span className="font-bold text-xs text-purple-950">
                                        Tech Evaluation Overhang
                                      </span>
                                    </div>
                                    {stageAnalysisData.techEvalAfterBqcOverhangDays > 0 ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-mono">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>SLA Deduction: -{stageAnalysisData.techEvalAfterBqcOverhangDays} Days</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-medium text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                                        No SLA Deduction
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                                    <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                                      <span className="text-[10px] font-bold uppercase text-slate-400 block">BQC Evaluation Signed On</span>
                                      <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                                        {stageAnalysisData.bqcSignDateStr || tender.bqc_eval_signed_on ? (
                                          <span className="text-emerald-700 flex items-center gap-1 font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            {stageAnalysisData.bqcSignDateStr || tender.bqc_eval_signed_on}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">Pending</span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Receipt of Tech Evaluation</span>
                                      <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                                        {stageAnalysisData.techEvalReceiptDateStr || tender.receipt_tech_eval ? (
                                          <span className="text-blue-700 font-bold">
                                            {stageAnalysisData.techEvalReceiptDateStr || tender.receipt_tech_eval}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">Pending</span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                                      <span className="text-[10px] font-bold uppercase text-purple-700 block">Overhang</span>
                                      <span className="font-semibold text-slate-800 mt-0.5 block">
                                        {stageAnalysisData.techEvalAfterBqcOverhangDays > 0 ? (
                                          <span className="text-emerald-700 font-bold">
                                            {stageAnalysisData.techEvalAfterBqcOverhangDays} days ({formatNumber(stageAnalysisData.techEvalAfterBqcOverhangHours)} hrs)
                                          </span>
                                        ) : stageAnalysisData.bqcSignDateStr && stageAnalysisData.techEvalReceiptDateStr ? (
                                          <span className="text-slate-600">
                                            0 days
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">—</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {!stage.hasData ? (
                                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 italic flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span>Not started</span>
                                </div>
                              ) : (
                                <>
                                  {/* Visual Distribution Bar of Officer Time */}
                                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                                    <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Time by Officer</span>
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

                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-500">
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
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleB.bg} ${roleB.text} ${roleB.border} border shrink-0`}
                                              >
                                                {off.role}
                                              </span>
                                              <div className="min-w-0">
                                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                                  <span>{off.holder}</span>
                                                  <span className="text-[10px] font-medium text-slate-500">
                                                    ({off.group})
                                                  </span>
                                                  {off.isFinanceReviewOfBqc && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                                      Finance Review of BQC
                                                    </span>
                                                  )}
                                                  {isCurrentlyHolding && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                      Current
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                  {off.stints.length === 1
                                                    ? '1 stint'
                                                    : `${off.stints.length} stints`}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Time spent by this officer */}
                                            <div className="text-right shrink-0">
                                              <div className="flex items-center justify-end gap-1.5">
                                                <span
                                                  className={`text-sm font-black font-mono ${
                                                    isQuick ? 'text-amber-900' : 'text-slate-900'
                                                  }`}
                                                >
                                                  {formatDurationWithUnit(off.totalHours, durationUnitMode)}
                                                </span>
                                                {isQuick && (
                                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                                    <Zap className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                                    <span>&lt;24h</span>
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-slate-500 font-medium">
                                                <b>{off.shareOfStage}%</b> of stage time
                                              </div>
                                            </div>
                                          </div>

                                          {/* Handover stints & notes */}
                                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                            {off.stints.map((stint, stIdx) => (
                                              <div
                                                key={stIdx}
                                                className="text-[11px] text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-1 bg-slate-50/80 px-2 py-1 rounded"
                                              >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-[10px] font-mono text-slate-400">
                                                    #{stIdx + 1}
                                                  </span>
                                                  <span className="font-mono text-slate-700">
                                                    {stint.entry.entry_date}
                                                  </span>
                                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                                  <span className="font-mono text-slate-700">
                                                    {stint.entry.exit_date || 'Ongoing'}
                                                  </span>
                                                  <span className="font-mono font-bold text-slate-900 bg-white px-1 py-0.2 rounded border border-slate-200 text-[10px]">
                                                    {stint.formattedDisplay}
                                                  </span>
                                                </div>

                                                {stint.entry.remarks && (
                                                  <div className="text-[10px] text-slate-500 italic max-w-xs truncate">
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

                    {/* TOTAL FOOTER ROW ACROSS ALL STAGES */}
                    <div className="bg-slate-100/95 border-t-2 border-slate-300 p-3 sm:px-3.5 sm:py-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-2 items-center font-bold text-xs select-none">
                      <div className="md:col-span-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-mono text-xs flex items-center justify-center font-bold">
                          Σ
                        </span>
                        <div>
                          <div className="text-slate-900 font-extrabold uppercase tracking-wide text-xs">
                            Total
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 text-right">
                        <span className="text-[10px] text-slate-400 block font-normal md:hidden">Gross Time:</span>
                        <span className="font-mono font-extrabold text-slate-900 text-xs sm:text-sm">
                          {stageAnalysisData.totalDays} Days
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 font-normal">
                          {formatNumber(stageAnalysisData.totalHours)} hrs
                        </div>
                      </div>

                      <div className="md:col-span-2 text-right">
                        <span className="text-[10px] text-slate-400 block font-normal md:hidden">Deductions:</span>
                        {stageAnalysisData.totalSlaDeductionsDays > 0 ? (
                          <>
                            <span className="font-mono font-extrabold text-amber-700 text-xs sm:text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              -{stageAnalysisData.totalSlaDeductionsDays} Days
                            </span>
                            <div className="text-[10px] font-mono text-amber-800 font-normal mt-0.5">
                              -{formatNumber(stageAnalysisData.totalSlaDeductionsHours)} hrs
                            </div>
                          </>
                        ) : (
                          <span className="font-mono text-slate-400">0 Days</span>
                        )}
                      </div>

                      <div className="md:col-span-1 text-right">
                        <span className="text-[10px] text-slate-400 block font-normal md:hidden">Net SLA:</span>
                        <span className="font-mono font-black text-emerald-800 text-xs sm:text-sm bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                          {stageAnalysisData.finalNetSlaDays} d
                        </span>
                      </div>

                      <div className="md:col-span-1 text-right">
                        <span className="text-[10px] text-slate-400 block font-normal md:hidden">Cumul. Gross:</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {stageAnalysisData.totalDays} d
                        </span>
                      </div>

                      <div className="md:col-span-1 text-right">
                        <span className="text-[10px] text-slate-400 block font-normal md:hidden">Cumul. SLA:</span>
                        <span className="font-mono font-extrabold text-emerald-700 text-xs">
                          {stageAnalysisData.finalNetSlaDays} d
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FINAL CALCULATED SLA SUMMARY CARD */}
                  <div className="bg-white border-2 border-emerald-300 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            SLA Summary
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Net SLA</span>
                          <span className="text-lg sm:text-xl font-black font-mono text-emerald-700">
                            {stageAnalysisData.finalNetSlaDays} Days
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          ({formatNumber(stageAnalysisData.finalNetSlaHours)} hrs)
                        </span>
                      </div>
                    </div>

                    {/* Step by step deduction arithmetic */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Time</span>
                        <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                          {stageAnalysisData.totalDays} Days
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatNumber(stageAnalysisData.totalHours)} hrs
                        </span>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                        <span className="text-[10px] uppercase font-bold text-amber-700 block">PR Indent to Actionable PR</span>
                        <span className="text-base font-black font-mono text-amber-800 mt-1 block">
                          -{stageAnalysisData.preActionablePrDays} Days
                        </span>
                      </div>

                      <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200">
                        <span className="text-[10px] uppercase font-bold text-purple-700 block">Tech Evaluation Overhang</span>
                        <span className="text-base font-black font-mono text-purple-800 mt-1 block">
                          -{stageAnalysisData.techEvalAfterBqcOverhangDays} Days
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Net SLA</span>
                        <span className="text-base font-black font-mono text-emerald-800 mt-1 block">
                          {stageAnalysisData.finalNetSlaDays} Days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEAM & ATTACHED REVIEWERS */}
          {activeTab === 'team' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PMs */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    Procurement Managers
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                      <div className="font-semibold text-slate-900">{tender.pm_officer}</div>
                      <div className="text-[10px] text-blue-700 font-medium">Primary PM</div>
                    </div>
                    {tender.attached_pms &&
                      tender.attached_pms.map((pm, i) => (
                        <div key={i} className="p-2.5 bg-white/70 rounded-lg border border-slate-200">
                          <div className="font-medium text-slate-800">{pm}</div>
                          <div className="text-[10px] text-slate-500">Co-PM</div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* FMs */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Finance Managers
                  </div>
                  <div className="space-y-2">
                    {tender.attached_fms && tender.attached_fms.length > 0 ? (
                      tender.attached_fms.map((fm, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                          <div className="font-semibold text-slate-900">{fm}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No FM assigned</div>
                    )}
                  </div>
                </div>

                {/* CEC */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Estimation Officers
                  </div>
                  <div className="space-y-2">
                    {tender.attached_cec_officers && tender.attached_cec_officers.length > 0 ? (
                      tender.attached_cec_officers.map((cec, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                          <div className="font-semibold text-slate-900">{cec}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No CEC assigned</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
            {tender.brief_status !== 'Awarded' && tender.brief_status !== 'Cancelled' && (
              <button
                onClick={() => setIsHandoffOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
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
                <span>Send Tender</span>
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
                  1. Next Stage
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
                    } else if (
                      newStage === 'BQC approval' ||
                      newStage === 'BQC Preparation' ||
                      newStage === 'Cashflow report Preparation' ||
                      newStage === 'Under Award Approval' ||
                      newStage === 'Under Award TEC'
                    ) {
                      if (tender.attached_fms && tender.attached_fms.length > 0) {
                        setRecipientPillarFilter('ASSIGNED');
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="PR Received">1. PR Received</option>
                  <option value="Under Estimation">2. Under Estimation</option>
                  <option value="BQC approval">3. BQC approval</option>
                  <option value="To be Floated">4. To be Floated</option>
                  <option value="Under Bidding">5. Under Bidding</option>
                  <option value="Under BQC / Tech Evaluation">6. Under BQC / Tech Evaluation</option>
                  <option value="Cashflow report Preparation">7. Cashflow report Preparation</option>
                  <option value="Under Negotiation">8. Under Negotiation</option>
                  <option value="Under Award Approval">9. Under Award Approval</option>
                  <option value="Awarded">10. Awarded</option>
                  <option value="Under Discussion with User">Under Discussion with User</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Recipient Selection Section with Multi-Pillar Filters */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. Recipient</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold">
                    {filteredOfficers.length} officers
                  </span>
                </div>

                {/* Attached Team Members */}
                {assignedTeamNames.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">
                      Assigned Team:
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
                            <span className="text-[10px] opacity-75 font-bold">[{member.roleLabel}]</span>
                            <span>{member.name}</span>
                            {isSelected && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Role Filter Selector Tabs */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                    Role:
                  </span>
                  <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('ALL')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'ALL'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({USERS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('FM')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'FM'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      FM ({fmUsers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('CEC')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'CEC'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      CEC ({cecUsers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientPillarFilter('PM')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        recipientPillarFilter === 'PM'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      PM ({pmUsers.length})
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
                    <option value="">Select officer</option>
                    {recipientPillarFilter === 'ALL' ? (
                      <>
                        <optgroup label="Finance Managers">
                          {fmUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              [FM] {u.name} — {u.designation}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Estimation Officers">
                          {cecUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              [CEC] {u.name} — {u.designation}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Procurement Managers">
                          {pmUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              [PM] {u.name} — {u.designation}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Management">
                          {adminUsers.map((u) => (
                            <option key={u.id} value={u.name}>
                              [ADMIN] {u.name}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    ) : (
                      filteredOfficers.map((u) => (
                        <option key={u.id} value={u.name}>
                          [{u.role}] {u.name} — {u.designation} ({u.pillar})
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
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              selectedOfficerObj.role === 'FM'
                                ? 'bg-emerald-100 text-emerald-800'
                                : selectedOfficerObj.role === 'CEC'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {selectedOfficerObj.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {selectedOfficerObj.designation} • {selectedOfficerObj.pillar}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Awarded Contract Value & GST Input Tabs (if advancing to Awarded stage) */}
              {selectedNextStage === 'Awarded' && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-emerald-950 font-bold text-xs">
                      Award Value *
                    </label>
                  </div>

                  {/* GST Rate Input Tabs */}
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-900 block mb-1.5">
                      GST Rate:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {[
                        { id: '0', label: '0%' },
                        { id: '5', label: '5%' },
                        { id: '12', label: '12%' },
                        { id: '18', label: '18%' },
                        { id: '28', label: '28%' },
                        { id: 'custom', label: 'Custom' },
                      ].map((tab) => {
                        const isSelected = gstRateTab === tab.id;
                        return (
                          <button
                            type="button"
                            key={tab.id}
                            onClick={() => {
                              setGstRateTab(tab.id as any);
                              const rate =
                                tab.id === 'custom'
                                  ? parseFloat(customGstRate) || 0
                                  : parseFloat(tab.id);
                              const base = parseFloat(baseAwardValInput) || 0;
                              const total = +(base * (1 + rate / 100)).toFixed(2);
                              setAwardedValInput(total > 0 ? total.toString() : '');
                            }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100/60'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {gstRateTab === 'custom' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] text-emerald-900 font-medium">Custom GST Rate:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={customGstRate}
                          onChange={(e) => {
                            setCustomGstRate(e.target.value);
                            const rate = parseFloat(e.target.value) || 0;
                            const base = parseFloat(baseAwardValInput) || 0;
                            const total = +(base * (1 + rate / 100)).toFixed(2);
                            setAwardedValInput(total > 0 ? total.toString() : '');
                          }}
                          className="w-20 bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                        />
                        <span className="text-xs text-emerald-900 font-bold">%</span>
                      </div>
                    )}
                  </div>

                  {/* Dual Inputs: Base vs Total Inclusive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Base Value (Rs Cr, Excl. GST)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 100.00"
                        value={baseAwardValInput}
                        onChange={(e) => {
                          setBaseAwardValInput(e.target.value);
                          const base = parseFloat(e.target.value) || 0;
                          const rate =
                            gstRateTab === 'custom'
                              ? parseFloat(customGstRate) || 0
                              : parseFloat(gstRateTab);
                          const total = +(base * (1 + rate / 100)).toFixed(2);
                          setAwardedValInput(total > 0 ? total.toString() : '');
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        Final Award Value (Rs Cr, Inclusive of Taxes) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 118.00"
                        value={awardedValInput}
                        onChange={(e) => {
                          setAwardedValInput(e.target.value);
                          const total = parseFloat(e.target.value) || 0;
                          const rate =
                            gstRateTab === 'custom'
                              ? parseFloat(customGstRate) || 0
                              : parseFloat(gstRateTab);
                          const base = +(total / (1 + rate / 100)).toFixed(2);
                          setBaseAwardValInput(base > 0 ? base.toString() : '');
                        }}
                        className="w-full bg-white border-2 border-emerald-500 rounded-lg px-3 py-2 text-xs text-emerald-950 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Breakdown Display */}
                  <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200 text-[11px] flex items-center justify-between flex-wrap gap-2">
                    <span className="text-slate-600">
                      Estimate:{' '}
                      <strong className="text-slate-900">{formatCurrencyCr(tender.estimate_value_cr)}</strong>
                    </span>
                    {parseFloat(awardedValInput) > 0 && (
                      <span className="text-emerald-800 font-bold">
                        GST:{' '}
                        {formatCurrencyCr(
                          (parseFloat(awardedValInput) || 0) - (parseFloat(baseAwardValInput) || 0)
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Date and Time of File Movement & SLA Calculator */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>3. Date & Time</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setHandoffDateTime(toDateTimeLocalInput(new Date()))}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  >
                    Now
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
                  </div>

                  {/* Calculated SLA Preview Card */}
                  <div className="bg-white border border-blue-200/80 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Stage Entry:</span>
                      <span className="font-mono text-slate-700 font-semibold truncate max-w-[130px]" title={lastEntryDateStr}>
                        {lastEntryDateStr}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 mt-1">
                      <span className="text-slate-700 font-bold">Stage SLA:</span>
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
                  4. Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Forwarded for BQC concurrence"
                  value={handoffRemarks}
                  onChange={(e) => setHandoffRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                ></textarea>
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

      {/* MODAL: ADD / EDIT ESTIMATE VALUE IN FUTURE */}
      {isEditEstimateOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {tender.estimate_value_cr ? 'Update Estimate Value' : 'Add Estimate Value'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    PR: {tender.pr_no} • {tender.item_description.slice(0, 40)}...
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditEstimateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEstimate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estimate Value (Rs. Cr) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 24.50"
                    value={editEstimateValue}
                    onChange={(e) => setEditEstimateValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white text-sm"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-medium">Rs Cr</span>
                </div>
                {editEstimateValue && !isNaN(parseFloat(editEstimateValue)) && (
                  <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                    Formatted: {formatCurrencyCr(parseFloat(editEstimateValue))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Based on recent market quotation"
                  value={editEstimateRemarks}
                  onChange={(e) => setEditEstimateRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditEstimateOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT AWARD VALUE & SAVINGS (CREATOR ONLY, BEFORE AWARD) */}
      {isEditAwardSavingsOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Award & Savings
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    PR: {tender.pr_no} • Creator: {tenderCreatorName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditAwardSavingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAwardAndSavings} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Awarded Value (Rs. Cr, Inclusive of Taxes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 18.25"
                    value={editAwardedValue}
                    onChange={(e) => setEditAwardedValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white text-sm"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-medium">Rs Cr</span>
                </div>
                {editAwardedValue && !isNaN(parseFloat(editAwardedValue)) && (
                  <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                    Formatted: {formatCurrencyCr(parseFloat(editAwardedValue))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Savings Due to Negotiation (Rs. Cr)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2.75"
                    value={editSavingsValue}
                    onChange={(e) => setEditSavingsValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white text-sm"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-medium">Rs Cr</span>
                </div>
                {editSavingsValue && !isNaN(parseFloat(editSavingsValue)) && (
                  <div className="mt-1 text-[11px] text-blue-700 font-medium">
                    Formatted: {formatCurrencyCr(parseFloat(editSavingsValue))}
                  </div>
                )}
              </div>

              {tender.estimate_value_cr && editAwardedValue && !isNaN(parseFloat(editAwardedValue)) && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Difference from Estimate:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrencyCr(tender.estimate_value_cr - parseFloat(editAwardedValue))}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditAwardSavingsOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TENDER DETAILS (BY PM / CASE HOLDER / ADMIN) */}
      {isEditDetailsOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl p-6 overflow-hidden my-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Details
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    PR: {tender.pr_no} • {tender.group} • PM: {tender.pm_officer}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDetailsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editItemDescription}
                  onChange={(e) => setEditItemDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Float Date
                  </label>
                  <input
                    type="date"
                    value={editTargetFloatDate}
                    onChange={(e) => setEditTargetFloatDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    value={editTargetDueDate}
                    onChange={(e) => setEditTargetDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Technical Evaluation Required?
                  </label>
                  <select
                    value={editTechEvalRequired}
                    onChange={(e) => setEditTechEvalRequired(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    BQC Criteria Required?
                  </label>
                  <select
                    value={editBqcRequired}
                    onChange={(e) => setEditBqcRequired(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Delivery Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bargarh Plant, Odisha"
                    value={editDeliveryLocation}
                    onChange={(e) => setEditDeliveryLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requisitioner Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. S. Sen, ext 4291"
                    value={editRequisitionerContact}
                    onChange={(e) => setEditRequisitionerContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Key Milestone Sign-offs (Editable, non-compulsory until sending for award) */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-900 block flex items-center gap-1.5 text-xs">
                    <FileCheck className="w-4 h-4 text-purple-600" />
                    <span>Sign-offs</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      BQC Evaluation Signed on
                    </label>
                    <input
                      type="date"
                      value={editBqcEvalSignedOn}
                      onChange={(e) => setEditBqcEvalSignedOn(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      EMD Evaluation Signed on
                    </label>
                    <input
                      type="date"
                      value={editEmdEvalSignedOn}
                      onChange={(e) => setEditEmdEvalSignedOn(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Techno Commercial Signed on
                    </label>
                    <input
                      type="date"
                      value={editTechnoCommSignedOn}
                      onChange={(e) => setEditTechnoCommSignedOn(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cashflow Statement Signed on
                    </label>
                    <input
                      type="date"
                      value={editCashflowStmtSignedOn}
                      onChange={(e) => setEditCashflowStmtSignedOn(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditDetailsOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AWARD VALIDATION BLOCKER */}
      {awardValidationMissing && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-rose-300 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Required Before Award
                </h3>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-bold text-rose-900 flex items-center justify-between">
                <span>Missing ({awardValidationMissing.length}):</span>
              </div>
              <ul className="space-y-1.5 pt-1 text-slate-700">
                {awardValidationMissing.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="font-semibold text-rose-950">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-slate-500">
              {isTenderCreator
                ? 'The estimate amount is entered by the CEC officer. Enter the rest in Edit Details.'
                : `To be completed by the tender creator (${tenderCreatorName}) or the CEC officer.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAwardValidationMissing(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              {isTenderCreator && (
                <button
                  type="button"
                  onClick={() => {
                    setAwardValidationMissing(null);
                    setIsEditDetailsOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Tender Modal */}
      {isCancelModalOpen && onCancelTender && (
        <CancelTenderModal
          tender={tender}
          currentUser={currentUser}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirmCancel={(tId, reason, rem) => {
            onCancelTender(tId, reason, rem);
            setIsCancelModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
