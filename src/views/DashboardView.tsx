import React, { useState, useMemo } from 'react';
import { Tender, TenderStage, UserRole, UserProfile } from '../types';
import { formatCurrencyCr, formatNumber, getStageBadgeColor } from '../utils/tenderUtils';
import { USERS } from '../data/seedData';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line
} from 'recharts';
import {
  Layers,
  Award,
  Filter,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Briefcase,
  Calculator,
  Building,
  UserCheck,
  ChevronRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  ListFilter,
  Ban,
  X,
  FileWarning
} from 'lucide-react';
import { GroupWorkloadSection } from '../components/GroupWorkloadSection';

interface DashboardViewProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
}

// Standard procurement stages in sequential order
const ORDERED_STAGES: { stage: TenderStage; stepNo: number; defaultRole: UserRole | 'TEC'; iconName: string }[] = [
  { stage: 'PR Received', stepNo: 1, defaultRole: 'PM', iconName: 'Layers' },
  { stage: 'Under Estimation', stepNo: 2, defaultRole: 'CEC', iconName: 'Calculator' },
  { stage: 'BQC approval', stepNo: 3, defaultRole: 'PM', iconName: 'Briefcase' },
  { stage: 'To be Floated', stepNo: 4, defaultRole: 'PM', iconName: 'TrendingUp' },
  { stage: 'Under Bidding', stepNo: 5, defaultRole: 'PM', iconName: 'Clock' },
  { stage: 'Under BQC / Tech Evaluation', stepNo: 6, defaultRole: 'PM', iconName: 'UserCheck' },
  { stage: 'Cashflow report Preparation', stepNo: 7, defaultRole: 'FM', iconName: 'DollarSign' },
  { stage: 'Under Negotiation', stepNo: 8, defaultRole: 'PM', iconName: 'TrendingDown' },
  { stage: 'Under Award Approval', stepNo: 9, defaultRole: 'PM', iconName: 'Award' },
  { stage: 'Awarded', stepNo: 10, defaultRole: 'PM', iconName: 'CheckCircle2' },
];

const STAGE_COLORS: Record<TenderStage, string> = {
  'PR Received': '#64748b',
  'Under Estimation': '#8b5cf6',
  'BQC approval': '#3b82f6',
  'BQC Preparation': '#3b82f6',
  'To be Floated': '#6366f1',
  'Under Bidding': '#06b6d4',
  'Under BQC / Tech Evaluation': '#a855f7',
  'Cashflow report Preparation': '#0284c7',
  'Under Award TEC': '#0d9488',
  'Under Negotiation': '#f97316',
  'Under Award Approval': '#0d9488',
  'Awarded': '#10b981',
  'Cancelled': '#ef4444',
  'Under Discussion with User': '#f59e0b',
};

const PIE_PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#6366f1',
  '#0d9488',
  '#f97316',
  '#10b981',
  '#64748b',
  '#f59e0b',
];

export const DashboardView: React.FC<DashboardViewProps> = ({ tenders, onOpenTender }) => {
  // 1. Pillar and Officer Filters State
  const [selectedPillar, setSelectedPillar] = useState<'ALL' | 'PM' | 'CEC' | 'FM'>('ALL');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStageModal, setSelectedStageModal] = useState<TenderStage | null>(null);
  const [isCancelledModalOpen, setIsCancelledModalOpen] = useState<boolean>(false);

  // Grouped Officers List
  const officersByPillar = useMemo(() => {
    const pms = USERS.filter((u) => u.role === 'PM');
    const cecs = USERS.filter((u) => u.role === 'CEC');
    const fms = USERS.filter((u) => u.role === 'FM');
    return { pms, cecs, fms };
  }, []);

  // Filtered Officers for Dropdown based on Pillar tab
  const availableOfficers = useMemo(() => {
    if (selectedPillar === 'PM') return officersByPillar.pms;
    if (selectedPillar === 'CEC') return officersByPillar.cecs;
    if (selectedPillar === 'FM') return officersByPillar.fms;
    return USERS.filter((u) => u.role !== 'ADMIN');
  }, [selectedPillar, officersByPillar]);

  // Handle Pillar change
  const handlePillarChange = (pillar: 'ALL' | 'PM' | 'CEC' | 'FM') => {
    setSelectedPillar(pillar);
    if (selectedOfficer !== 'ALL') {
      const officerObj = USERS.find((u) => u.name === selectedOfficer);
      if (pillar !== 'ALL' && officerObj && officerObj.role !== pillar) {
        setSelectedOfficer('ALL');
      }
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedPillar('ALL');
    setSelectedOfficer('ALL');
    setSearchQuery('');
  };

  // Find user details of selected officer
  const currentOfficerProfile: UserProfile | undefined = useMemo(() => {
    if (selectedOfficer === 'ALL') return undefined;
    return USERS.find((u) => u.name === selectedOfficer);
  }, [selectedOfficer]);

  // Compute Filtered Tenders based on Pillar, Officer, and Search
  const filteredTenders = useMemo(() => {
    return tenders.filter((t) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          t.pr_no.toLowerCase().includes(q) ||
          (t.crfq_no || '').toLowerCase().includes(q) ||
          t.item_description.toLowerCase().includes(q) ||
          t.pm_officer.toLowerCase().includes(q) ||
          (t.current_holder || '').toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      // 2. Specific Officer Filter
      if (selectedOfficer !== 'ALL') {
        const matchesPrimaryPm = t.pm_officer === selectedOfficer;
        const matchesAttachedPm = t.attached_pms?.includes(selectedOfficer);
        const matchesAttachedFm = t.attached_fms?.includes(selectedOfficer);
        const matchesAttachedCec = t.attached_cec_officers?.includes(selectedOfficer);
        const matchesCurrentHolder = t.current_holder === selectedOfficer;
        const matchesTimeline = t.timeline?.some((log) => log.holder === selectedOfficer);

        if (
          !matchesPrimaryPm &&
          !matchesAttachedPm &&
          !matchesAttachedFm &&
          !matchesAttachedCec &&
          !matchesCurrentHolder &&
          !matchesTimeline
        ) {
          return false;
        }
      } else if (selectedPillar !== 'ALL') {
        // 3. Pillar-wide Filter (if no specific officer selected)
        if (selectedPillar === 'PM') {
          // Procurement Pillar
          const hasPmRole = t.current_role === 'PM' || t.pm_officer || (t.attached_pms && t.attached_pms.length > 0);
          if (!hasPmRole) return false;
        } else if (selectedPillar === 'CEC') {
          // Cost Estimation Pillar
          const hasCecRole =
            t.current_role === 'CEC' ||
            (t.attached_cec_officers && t.attached_cec_officers.length > 0) ||
            t.brief_status === 'Under Estimation' ||
            t.timeline?.some((l) => l.role === 'CEC');
          if (!hasCecRole) return false;
        } else if (selectedPillar === 'FM') {
          // Finance Pillar
          const hasFmRole =
            t.current_role === 'FM' ||
            (t.attached_fms && t.attached_fms.length > 0) ||
            t.brief_status === 'Under Negotiation' ||
            t.timeline?.some((l) => l.role === 'FM');
          if (!hasFmRole) return false;
        }
      }

      return true;
    });
  }, [tenders, selectedPillar, selectedOfficer, searchQuery]);

  // Section 1 Computations: Total Tenders & Stage Bifurcation
  const totalTendersGoingOn = filteredTenders.length;
  const awardedTenders = useMemo(() => filteredTenders.filter((t) => t.brief_status === 'Awarded'), [filteredTenders]);
  const activePipelineTenders = useMemo(
    () => filteredTenders.filter((t) => t.brief_status !== 'Awarded' && t.brief_status !== 'Cancelled'),
    [filteredTenders]
  );
  const cancelledTenders = useMemo(() => filteredTenders.filter((t) => t.brief_status === 'Cancelled'), [filteredTenders]);

  // Section 2 Computations: Value Basis
  const totalAwardedValueCr = useMemo(
    () => awardedTenders.reduce((acc, t) => acc + (t.awarded_value_cr || 0), 0),
    [awardedTenders]
  );
  const totalPipelineValueCr = useMemo(
    () => activePipelineTenders.reduce((acc, t) => acc + (t.estimate_value_cr || 0), 0),
    [activePipelineTenders]
  );
  const totalCancelledValueCr = useMemo(
    () => cancelledTenders.reduce((acc, t) => acc + (t.estimate_value_cr || 0), 0),
    [cancelledTenders]
  );
  const totalPortfolioValueCr = useMemo(
    () => filteredTenders.reduce((acc, t) => acc + (t.estimate_value_cr || 0), 0),
    [filteredTenders]
  );
  const totalSavingsCr = useMemo(
    () => awardedTenders.reduce((acc, t) => acc + (t.savings_due_to_negotiation_cr || 0), 0),
    [awardedTenders]
  );

  // Stage-by-Stage Detailed Bifurcation (Count and Value)
  const stageBifurcationData = useMemo(() => {
    return ORDERED_STAGES.map(({ stage, stepNo, defaultRole }) => {
      const stageTenders = filteredTenders.filter((t) => t.brief_status === stage);
      const count = stageTenders.length;
      const countSharePercent = totalTendersGoingOn > 0 ? (count / totalTendersGoingOn) * 100 : 0;

      // Value calculation: for Awarded stage use awarded_value_cr (or estimate fallback), for in-pipeline use estimate_value_cr
      const totalStageValueCr = stageTenders.reduce((acc, t) => {
        if (stage === 'Awarded') {
          return acc + (t.awarded_value_cr !== null && t.awarded_value_cr !== undefined ? t.awarded_value_cr : t.estimate_value_cr || 0);
        }
        return acc + (t.estimate_value_cr || 0);
      }, 0);

      const valueSharePercent = totalPortfolioValueCr > 0 ? (totalStageValueCr / totalPortfolioValueCr) * 100 : 0;
      const avgValuePerTenderCr = count > 0 ? totalStageValueCr / count : 0;

      return {
        stepNo,
        stage,
        shortStage: stage.replace(' / ', '/').replace('Under ', 'U/'),
        count,
        countSharePercent: +countSharePercent.toFixed(1),
        totalStageValueCr: +totalStageValueCr.toFixed(2),
        valueSharePercent: +valueSharePercent.toFixed(1),
        avgValuePerTenderCr: +avgValuePerTenderCr.toFixed(2),
        defaultRole,
        color: STAGE_COLORS[stage] || '#3b82f6',
        tenders: stageTenders,
      };
    });
  }, [filteredTenders, totalTendersGoingOn, totalPortfolioValueCr]);

  // Donut chart data for stages with value > 0
  const stageValueDonutData = useMemo(() => {
    return stageBifurcationData
      .filter((s) => s.totalStageValueCr > 0)
      .map((s) => ({
        name: s.stage,
        value: s.totalStageValueCr,
        count: s.count,
        color: s.color,
      }));
  }, [stageBifurcationData]);

  // Active tenders for the currently selected stage modal inspect
  const modalStageTenders = useMemo(() => {
    if (!selectedStageModal) return [];
    return filteredTenders.filter((t) => t.brief_status === selectedStageModal);
  }, [filteredTenders, selectedStageModal]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Pillar / Person Filter Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">
              Dashboard
            </h1>
          </div>

          {/* Reset Filters button */}
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Role & Officer Filter Controls */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filters</span>
            </span>
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-800 font-bold">{totalTendersGoingOn}</strong> of{' '}
              <strong className="text-slate-600">{tenders.length}</strong> tenders
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* 1. Role Selection Tabs */}
            <div className="md:col-span-5 flex items-center p-1 bg-slate-100/80 rounded-lg border border-slate-200">
              <button
                onClick={() => handlePillarChange('ALL')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center ${
                  selectedPillar === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handlePillarChange('PM')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  selectedPillar === 'PM'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>PM</span>
              </button>
              <button
                onClick={() => handlePillarChange('CEC')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  selectedPillar === 'CEC'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>CEC</span>
              </button>
              <button
                onClick={() => handlePillarChange('FM')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  selectedPillar === 'FM'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>FM</span>
              </button>
            </div>

            {/* 2. Specific Officer Dropdown */}
            <div className="md:col-span-4 relative">
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white cursor-pointer shadow-2xs"
              >
                <option value="ALL">
                  {selectedPillar === 'ALL'
                    ? 'All Officers'
                    : selectedPillar === 'PM'
                    ? 'All Procurement Managers'
                    : selectedPillar === 'CEC'
                    ? 'All Cost Estimation Officers'
                    : 'All Finance Managers'}
                </option>

                {selectedPillar === 'ALL' ? (
                  <>
                    <optgroup label="Procurement Managers">
                      {officersByPillar.pms.map((u) => {
                        const count = tenders.filter(
                          (t) =>
                            t.pm_officer === u.name ||
                            t.attached_pms?.includes(u.name) ||
                            t.current_holder === u.name
                        ).length;
                        return (
                          <option key={u.id} value={u.name}>
                            {u.name} ({count} tenders)
                          </option>
                        );
                      })}
                    </optgroup>

                    <optgroup label="Cost Estimation Officers">
                      {officersByPillar.cecs.map((u) => {
                        const count = tenders.filter(
                          (t) =>
                            t.attached_cec_officers?.includes(u.name) ||
                            t.current_holder === u.name ||
                            t.timeline?.some((l) => l.holder === u.name)
                        ).length;
                        return (
                          <option key={u.id} value={u.name}>
                            {u.name} ({count} tenders)
                          </option>
                        );
                      })}
                    </optgroup>

                    <optgroup label="Finance Managers">
                      {officersByPillar.fms.map((u) => {
                        const count = tenders.filter(
                          (t) =>
                            t.attached_fms?.includes(u.name) ||
                            t.current_holder === u.name ||
                            t.timeline?.some((l) => l.holder === u.name)
                        ).length;
                        return (
                          <option key={u.id} value={u.name}>
                            {u.name} ({count} tenders)
                          </option>
                        );
                      })}
                    </optgroup>
                  </>
                ) : (
                  availableOfficers.map((u) => {
                    const count = tenders.filter(
                      (t) =>
                        t.pm_officer === u.name ||
                        t.attached_pms?.includes(u.name) ||
                        t.attached_fms?.includes(u.name) ||
                        t.attached_cec_officers?.includes(u.name) ||
                        t.current_holder === u.name ||
                        t.timeline?.some((l) => l.holder === u.name)
                    ).length;
                    return (
                      <option key={u.id} value={u.name}>
                        {u.name} ({count} tenders)
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* 3. Text Search */}
            <div className="md:col-span-3 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Tender #, PR, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Active Officer Highlight Banner if an officer is selected */}
          {currentOfficerProfile && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                    currentOfficerProfile.role === 'PM'
                      ? 'bg-blue-600'
                      : currentOfficerProfile.role === 'CEC'
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {currentOfficerProfile.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{currentOfficerProfile.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        currentOfficerProfile.role === 'PM'
                          ? 'bg-blue-100 text-blue-800'
                          : currentOfficerProfile.role === 'CEC'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {currentOfficerProfile.role}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">({currentOfficerProfile.designation})</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {totalTendersGoingOn} tenders • {formatCurrencyCr(totalPortfolioValueCr)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOfficer('ALL')}
                className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer self-start sm:self-center"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: STAGE VOLUME */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Stage Volume
            </h2>
          </div>
        </div>

        {/* Top 5 Number Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Main Total Tenders Metric */}
          <div className="bg-white border-2 border-blue-500/80 rounded-xl p-4 shadow-xs bg-gradient-to-br from-blue-50/40 to-white">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
              <span>Total Tenders</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalTendersGoingOn}</div>
          </div>

          {/* Active In-Pipeline Tenders */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>In Pipeline</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">{activePipelineTenders.length}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium truncate">
              {formatCurrencyCr(totalPipelineValueCr)}
            </div>
          </div>

          {/* Awarded Tenders */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Awarded</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{awardedTenders.length}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium truncate">
              {formatCurrencyCr(totalAwardedValueCr)}
            </div>
          </div>

          {/* Cancelled Tenders Metric Card (Clickable to view reasons & files) */}
          <div
            onClick={() => cancelledTenders.length > 0 && setIsCancelledModalOpen(true)}
            className={`rounded-xl p-4 border transition-all cursor-pointer ${
              cancelledTenders.length > 0
                ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300 hover:shadow-xs shadow-2xs group'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
              <span>Cancelled</span>
              <Ban className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{cancelledTenders.length}</div>
            <div className="text-[11px] text-rose-700 mt-1 font-medium flex items-center justify-between">
              <span>{formatCurrencyCr(totalCancelledValueCr)}</span>
              {cancelledTenders.length > 0 && (
                <span className="text-[10px] font-bold underline group-hover:text-rose-900">
                  View Reasons
                </span>
              )}
            </div>
          </div>

          {/* Active Stages Span */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Active Stages</span>
              <Briefcase className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {stageBifurcationData.filter((s) => s.count > 0).length} / {ORDERED_STAGES.length}
            </div>
          </div>
        </div>

        {/* Step-by-Step Volume Bifurcation Cards Grid */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Tenders by Stage</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2.5">
            {stageBifurcationData.map((s) => {
              const isZero = s.count === 0;
              return (
                <div
                  key={s.stage}
                  onClick={() => s.count > 0 && setSelectedStageModal(s.stage)}
                  className={`rounded-xl p-3 border transition-all flex flex-col justify-between relative group ${
                    isZero
                      ? 'bg-slate-50/50 border-slate-200 opacity-60'
                      : s.stage === 'Awarded'
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 hover:shadow-xs cursor-pointer'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs cursor-pointer'
                  }`}
                >
                  <div>
                    {/* Step No and Responsible Role */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black font-mono text-slate-400">
                        {String(s.stepNo).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          s.defaultRole === 'PM'
                            ? 'bg-blue-100 text-blue-800'
                            : s.defaultRole === 'CEC'
                            ? 'bg-amber-100 text-amber-800'
                            : s.defaultRole === 'FM'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {s.defaultRole}
                      </span>
                    </div>

                    {/* Stage Name */}
                    <div className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight min-h-[30px]" title={s.stage}>
                      {s.stage}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100">
                    {/* Big Count */}
                    <div className="flex items-baseline justify-between">
                      <span className={`text-xl font-black ${isZero ? 'text-slate-400' : s.stage === 'Awarded' ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {s.count}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {s.count === 1 ? 'tender' : 'tenders'}
                      </span>
                    </div>

                    {/* Percentage Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.countSharePercent}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-400 text-right mt-0.5 font-medium">
                      {s.countSharePercent}% of total
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage-wise Tender Count Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Stage Distribution
            </h3>
            <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold">
              Total: {totalTendersGoingOn}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageBifurcationData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortStage"
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  label={{ value: 'No. of Tenders', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: '#0f172a',
                  }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} tenders (${item.payload.countSharePercent}%)`,
                    item.payload.stage,
                  ]}
                />
                <Bar dataKey="count" name="Tenders Count" radius={[4, 4, 0, 0]}>
                  {stageBifurcationData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 2: VALUE ANALYTICS */}
      <div className="space-y-4 pt-4 border-t-2 border-slate-200">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Value Analytics
            </h2>
          </div>
        </div>

        {/* 4 Value Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Value Awarded */}
          <div className="bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-xs bg-gradient-to-br from-emerald-50/40 to-white">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>Awarded Value</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1 truncate">
              {formatCurrencyCr(totalAwardedValueCr)}
            </div>
          </div>

          {/* Total Pipeline Value (Under Stages 1-8) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Pipeline Value</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 mt-1 truncate">
              {formatCurrencyCr(totalPipelineValueCr)}
            </div>
          </div>

          {/* Total Overall Portfolio Value */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Value</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 truncate">
              {formatCurrencyCr(totalPortfolioValueCr)}
            </div>
          </div>

          {/* Direct Negotiation Savings */}
          <div className="bg-white border border-blue-200 bg-blue-50/40 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
              <span>Negotiated Savings</span>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 mt-1 truncate">
              {formatCurrencyCr(totalSavingsCr)}
            </div>
          </div>
        </div>

        {/* Charts Row: Value vs Counts Composed Chart + Stage Value Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. Dual-Axis Composed Chart (Value in Cr + Number of Tenders per Stage) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Value & Volume by Stage
              </h3>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stageBifurcationData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortStage"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#10b981"
                    tick={{ fontSize: 10, fill: '#059669' }}
                    label={{ value: 'Value (₹ Cr)', angle: -90, position: 'insideLeft', fill: '#059669', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    stroke="#2563eb"
                    tick={{ fontSize: 10, fill: '#2563eb' }}
                    label={{ value: 'Tenders Count', angle: 90, position: 'insideRight', fill: '#2563eb', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      color: '#0f172a',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      item.dataKey === 'totalStageValueCr'
                        ? `₹ ${value} Cr (${item.payload.valueSharePercent}%)`
                        : `${value} tenders`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="totalStageValueCr"
                    name="Stage Value (₹ Cr)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="count"
                    name="No. of Tenders"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart: Value Share */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Value Share</span>
              </h3>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stageValueDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stageValueDonutData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || PIE_PALETTE[index % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      color: '#0f172a',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `₹ ${value} Cr (${item.payload.count} tenders)`,
                      item.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs border-t border-slate-100 pt-2">
              {stageValueDonutData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate max-w-[140px]" title={item.name}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 text-[10px]">{item.count}t</span>
                    <span className="font-bold text-slate-800">₹{item.value}Cr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stage-Wise Value & Number Breakdown Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5 text-blue-600" />
              <span>Stage Summary</span>
            </h3>
            <span className="text-xs font-bold text-slate-700">
              Total: {formatCurrencyCr(totalPortfolioValueCr)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4 text-center">Tenders</th>
                  <th className="py-2.5 px-4 text-right">Volume Share</th>
                  <th className="py-2.5 px-4 text-right">Value</th>
                  <th className="py-2.5 px-4 text-right">Value Share</th>
                  <th className="py-2.5 px-4 text-right">Avg / Tender</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stageBifurcationData.map((s) => {
                  const stageBadge = getStageBadgeColor(s.stage);
                  return (
                    <tr
                      key={s.stage}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => s.count > 0 && setSelectedStageModal(s.stage)}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-400">
                        {String(s.stepNo).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="font-bold text-slate-800">{s.stage}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            s.defaultRole === 'PM'
                              ? 'bg-blue-100 text-blue-800'
                              : s.defaultRole === 'CEC'
                              ? 'bg-amber-100 text-amber-800'
                              : s.defaultRole === 'FM'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {s.defaultRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            s.count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {s.count}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {s.countSharePercent}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrencyCr(s.totalStageValueCr)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {s.valueSharePercent}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {s.count > 0 ? formatCurrencyCr(s.avgValuePerTenderCr) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          disabled={s.count === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStageModal(s.stage);
                          }}
                          className={`text-[11px] px-2 py-1 rounded font-semibold transition-all ${
                            s.count > 0
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                              : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100/90 font-bold border-t border-slate-200 text-slate-800 text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-4 uppercase text-[10px] tracking-wider text-slate-600">
                    Total
                  </td>
                  <td className="py-3 px-4 text-center font-black text-blue-700 text-sm">
                    {totalTendersGoingOn}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">100.0%</td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                    {formatCurrencyCr(totalPortfolioValueCr)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">100.0%</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {totalTendersGoingOn > 0
                      ? formatCurrencyCr(totalPortfolioValueCr / totalTendersGoingOn)
                      : '—'}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: GROUP-WISE WORKLOAD & OFFICER BREAKDOWN (NOT AWARDED)          */}
      {/* ========================================================================= */}
      <GroupWorkloadSection tenders={tenders} onOpenTender={onOpenTender} />

      {/* ========================================================================= */}
      {/* POPUP MODAL: Inspect Tenders in Selected Stage                           */}
      {/* ========================================================================= */}
      {selectedStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[96vw] xl:max-w-[1550px] w-full h-[92vh] max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: STAGE_COLORS[selectedStageModal] || '#3b82f6' }}
                />
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {selectedStageModal} ({modalStageTenders.length})
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                    <span>
                      Total: <strong>{formatCurrencyCr(
                        modalStageTenders.reduce(
                          (acc, t) =>
                            acc +
                            (selectedStageModal === 'Awarded'
                              ? t.awarded_value_cr || t.estimate_value_cr || 0
                              : t.estimate_value_cr || 0),
                          0
                        )
                      )}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedStageModal(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Body: Full data table like all pages */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              {modalStageTenders.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  No tenders
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">PR / CRFQ No</th>
                        <th className="py-3 px-4 min-w-[260px]">Description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Lead PM</th>
                        <th className="py-3 px-4">Current Holder</th>
                        <th className="py-3 px-4 text-right">Value</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {modalStageTenders.map((tender, idx) => (
                        <tr
                          key={`${tender.sr_no}-${tender.pr_no}`}
                          onClick={() => {
                            setSelectedStageModal(null);
                            onOpenTender(tender);
                          }}
                          className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">
                            <div>{tender.pr_no}</div>
                            {tender.crfq_no && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                {tender.crfq_no}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-700 line-clamp-2">
                              {tender.item_description}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {tender.user_function}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {tender.tender_type}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {tender.pm_officer}
                          </td>
                          <td className="py-3 px-4">
                            {tender.current_holder ? (
                              <span className="font-semibold text-amber-700">
                                {tender.current_holder} ({tender.current_role})
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrencyCr(
                              selectedStageModal === 'Awarded' && tender.awarded_value_cr
                                ? tender.awarded_value_cr
                                : tender.estimate_value_cr
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStageModal(null);
                                onOpenTender(tender);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg transition-colors cursor-pointer"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Tenders Inspection Modal */}
      {isCancelledModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-rose-200 bg-rose-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                    <span>Cancelled Tenders</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-200 text-rose-900">
                      {cancelledTenders.length}
                    </span>
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsCancelledModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {cancelledTenders.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-600">No cancelled tenders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cancelledTenders.map((tender) => {
                    const cInfo = tender.cancellation_info;
                    return (
                      <div
                        key={`cancelled-tender-${tender.sr_no}`}
                        className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50/60 transition-colors shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-white text-blue-700 px-2 py-0.5 rounded border border-slate-200">
                              {tender.pr_no}
                            </span>
                            {tender.crfq_no && (
                              <span className="font-mono text-xs text-slate-500">
                                {tender.crfq_no}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Cancelled at: {cInfo?.stage_at_cancellation || '—'}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-900">
                            Estimate: {formatCurrencyCr(tender.estimate_value_cr)}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {tender.item_description}
                          </h4>
                        </div>

                        {/* Cancellation Details */}
                        <div className="p-2.5 bg-white rounded-lg border border-rose-100 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              <strong>Cancelled By:</strong> {cInfo?.cancelled_by || tender.pm_officer} ({cInfo?.cancelled_role || 'PM'})
                            </span>
                            <span>
                              <strong>Date:</strong> {cInfo?.cancelled_on || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-rose-800 block">
                              Reason:
                            </span>
                            <p className="text-xs font-medium text-slate-800">
                              {cInfo?.reason || '—'}
                            </p>
                          </div>
                          {cInfo?.remarks && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                Justification Note:
                              </span>
                              <p className="text-[11px] text-slate-600 italic">
                                &quot;{cInfo.remarks}&quot;
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Footer Action */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              setIsCancelledModalOpen(false);
                              onOpenTender(tender);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsCancelledModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
