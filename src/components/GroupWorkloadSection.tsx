import React, { useState, useMemo } from 'react';
import { Tender, TenderStage, UserProfile } from '../types';
import { USERS } from '../data/seedData';
import {
  GROUPS,
  GroupName,
  getOfficersInGroup,
  isWorkingTender,
  getOfficerWorkingTenders,
  formatCurrencyCr,
  formatNumber,
  getStageBadgeColor,
  roleName,
} from '../utils/tenderUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Users,
  Briefcase,
  Layers,
  Clock,
  ChevronRight,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  Search,
  FileText,
  UserCheck,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface GroupWorkloadSectionProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
}

export const GroupWorkloadSection: React.FC<GroupWorkloadSectionProps> = ({
  tenders,
  onOpenTender,
}) => {
  // Default to 'Group 4' as specifically requested by user, or allow selecting any group / 'ALL'
  const [selectedGroup, setSelectedGroup] = useState<string>('Group 4');
  const [officerSearch, setOfficerSearch] = useState<string>('');
  const [selectedOfficerModal, setSelectedOfficerModal] = useState<{
    officer: UserProfile;
    workingTenders: Tender[];
  } | null>(null);

  // 1. Group statistics summary across ALL groups
  const allGroupsSummary = useMemo(() => {
    return GROUPS.map((grp) => {
      const officers = getOfficersInGroup(grp);
      const pms = officers.filter((o) => o.role === 'PM');
      const cecs = officers.filter((o) => o.role === 'CEC');
      const fms = officers.filter((o) => o.role === 'FM');

      // Tenders handled by any officer in this group (Not awarded)
      const officerNames = new Set(officers.map((o) => o.name));
      
      const workingTendersForGroup = tenders.filter(
        (t) =>
          isWorkingTender(t) &&
          (officerNames.has(t.pm_officer) ||
            t.attached_pms?.some((name) => officerNames.has(name)) ||
            t.attached_fms?.some((name) => officerNames.has(name)) ||
            t.attached_cec_officers?.some((name) => officerNames.has(name)) ||
            (t.current_holder && officerNames.has(t.current_holder)))
      );

      const holdingTendersCount = tenders.filter(
        (t) => isWorkingTender(t) && t.current_holder && officerNames.has(t.current_holder)
      ).length;

      const totalWorkingValueCr = workingTendersForGroup.reduce(
        (acc, t) => acc + (t.estimate_value_cr || 0),
        0
      );

      const avgTendersPerOfficer =
        officers.length > 0
          ? +(workingTendersForGroup.length / officers.length).toFixed(1)
          : 0;

      return {
        groupName: grp,
        totalOfficers: officers.length,
        pmCount: pms.length,
        cecCount: cecs.length,
        fmCount: fms.length,
        totalWorkingTenders: workingTendersForGroup.length,
        holdingTendersCount,
        totalWorkingValueCr: +totalWorkingValueCr.toFixed(2),
        avgTendersPerOfficer,
      };
    });
  }, [tenders]);

  // 2. Compute individual officer workload for the SELECTED group
  const selectedGroupOfficers = useMemo(() => {
    if (selectedGroup === 'ALL') {
      return USERS.filter((u) => u.role !== 'ADMIN');
    }
    return getOfficersInGroup(selectedGroup);
  }, [selectedGroup]);

  const officerWorkloadData = useMemo(() => {
    return selectedGroupOfficers.map((officer) => {
      const {
        activeWorkingTenders,
        currentlyHoldingTenders,
        totalWorkingCount,
        totalWorkingValueCr,
      } = getOfficerWorkingTenders(officer.name, tenders);

      // Stage distribution for this officer's working tenders
      const stageCounts: Record<string, number> = {};
      activeWorkingTenders.forEach((t) => {
        stageCounts[t.brief_status] = (stageCounts[t.brief_status] || 0) + 1;
      });

      return {
        officer,
        workingCount: totalWorkingCount,
        holdingCount: currentlyHoldingTenders.length,
        workingValueCr: totalWorkingValueCr,
        activeWorkingTenders,
        currentlyHoldingTenders,
        stageCounts,
      };
    });
  }, [selectedGroupOfficers, tenders]);

  // Filtered officers for search within group
  const filteredOfficerWorkload = useMemo(() => {
    if (!officerSearch.trim()) return officerWorkloadData;
    const q = officerSearch.toLowerCase();
    return officerWorkloadData.filter(
      (item) =>
        item.officer.name.toLowerCase().includes(q) ||
        item.officer.designation.toLowerCase().includes(q) ||
        item.officer.role.toLowerCase().includes(q)
    );
  }, [officerWorkloadData, officerSearch]);

  // Selected Group Summary Metrics
  const currentGroupSummary = useMemo(() => {
    const totalOfficers = selectedGroupOfficers.length;
    const pmOfficers = selectedGroupOfficers.filter((o) => o.role === 'PM');
    const cecOfficers = selectedGroupOfficers.filter((o) => o.role === 'CEC');
    const fmOfficers = selectedGroupOfficers.filter((o) => o.role === 'FM');

    // Deduplicated working tenders in this group
    const allWorkingTendersSet = new Set<string>();
    const allWorkingTendersList: Tender[] = [];

    officerWorkloadData.forEach((item) => {
      item.activeWorkingTenders.forEach((t) => {
        const key = `${t.sr_no}-${t.pr_no}`;
        if (!allWorkingTendersSet.has(key)) {
          allWorkingTendersSet.add(key);
          allWorkingTendersList.push(t);
        }
      });
    });

    const totalWorkingTendersCount = allWorkingTendersList.length;
    const totalWorkingValueCr = allWorkingTendersList.reduce(
      (acc, t) => acc + (t.estimate_value_cr || 0),
      0
    );
    const avgTendersPerOfficer =
      totalOfficers > 0 ? +(totalWorkingTendersCount / totalOfficers).toFixed(1) : 0;

    // Stage breakdown within group
    const stageCounts: Record<string, number> = {};
    allWorkingTendersList.forEach((t) => {
      stageCounts[t.brief_status] = (stageCounts[t.brief_status] || 0) + 1;
    });

    const stageBreakdownArray = Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
      percent:
        totalWorkingTendersCount > 0
          ? Math.round((count / totalWorkingTendersCount) * 100)
          : 0,
    }));

    return {
      groupName: selectedGroup,
      totalOfficers,
      pmCount: pmOfficers.length,
      cecCount: cecOfficers.length,
      fmCount: fmOfficers.length,
      totalWorkingTendersCount,
      totalWorkingValueCr: +totalWorkingValueCr.toFixed(2),
      avgTendersPerOfficer,
      workingTendersList: allWorkingTendersList,
      stageBreakdownArray,
    };
  }, [selectedGroup, selectedGroupOfficers, officerWorkloadData]);

  // Chart Data: Working Tenders per Officer in Group
  const officerChartData = useMemo(() => {
    return officerWorkloadData
      .map((item) => ({
        name: item.officer.name.split(' ')[0] + ' ' + (item.officer.name.split(' ')[1]?.[0] || '') + '.',
        fullName: item.officer.name,
        role: item.officer.role,
        workingCount: item.workingCount,
        holdingCount: item.holdingCount,
        workingValueCr: item.workingValueCr,
        color:
          item.officer.role === 'PM'
            ? '#3b82f6'
            : item.officer.role === 'CEC'
            ? '#d97706'
            : '#10b981',
      }))
      .sort((a, b) => b.workingCount - a.workingCount);
  }, [officerWorkloadData]);

  // Stage distribution donut data for group
  const groupStageDonutData = useMemo(() => {
    const STAGE_PIE_COLORS = [
      '#8b5cf6',
      '#3b82f6',
      '#6366f1',
      '#06b6d4',
      '#a855f7',
      '#0d9488',
      '#f97316',
      '#64748b',
    ];

    return currentGroupSummary.stageBreakdownArray.map((item, idx) => ({
      name: item.stage,
      value: item.count,
      percent: item.percent,
      color: STAGE_PIE_COLORS[idx % STAGE_PIE_COLORS.length],
    }));
  }, [currentGroupSummary]);

  return (
    <div id="group-workload-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-md font-semibold text-xs">
            03
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span>Workload by group</span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                Open tenders only
              </span>
            </h2>
          </div>
        </div>
        
      </div>

      {/* Group Selector Navigation Pills */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>Group</span>
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Pick a group to see its officers and what each one is working on.
            </p>
          </div>

          {/* Quick Search within Group Officers */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search officers in this group"
              value={officerSearch}
              onChange={(e) => setOfficerSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Group Selector Tabs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {GROUPS.map((grp) => {
            const summary = allGroupsSummary.find((s) => s.groupName === grp);
            const isSelected = selectedGroup === grp;

            return (
              <button
                key={grp}
                onClick={() => {
                  setSelectedGroup(grp);
                  setOfficerSearch('');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-md ring-2 ring-indigo-300'
                    : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {grp}
                  </span>
                  {grp === 'Group 4' && (
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-white text-indigo-700'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      Target
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-0.5">
                  <div
                    className={`text-xs font-semibold flex items-center justify-between ${
                      isSelected ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    <span>Officers:</span>
                    <strong className={isSelected ? 'text-white' : 'text-slate-800'}>
                      {summary?.totalOfficers || 0}
                    </strong>
                  </div>
                  <div
                    className={`text-xs font-semibold flex items-center justify-between ${
                      isSelected ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    <span>Working:</span>
                    <strong
                      className={`font-semibold ${
                        isSelected ? 'text-amber-300' : 'text-amber-700'
                      }`}
                    >
                      {summary?.totalWorkingTenders || 0}
                    </strong>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELECTED GROUP SUMMARY: METRICS + CHARTS                                  */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Top 4 Metrics for Selected Group */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Officers in Group */}
          <div className="bg-white border-2 border-indigo-500/80 rounded-xl p-4 shadow-xs bg-gradient-to-br from-indigo-50/50 to-white">
            <div className="text-xs font-medium text-indigo-700 flex items-center justify-between">
              <span>Officers in {currentGroupSummary.groupName}</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-semibold text-slate-900 mt-1">
              {currentGroupSummary.totalOfficers}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-blue-700">
                {currentGroupSummary.pmCount} PMs
              </span>
              <span>•</span>
              <span className="font-bold text-emerald-700">
                {currentGroupSummary.fmCount} FMs
              </span>
              <span>•</span>
              <span className="font-bold text-amber-700">
                {currentGroupSummary.cecCount} CECs
              </span>
            </div>
          </div>

          {/* 2. Total Working Tenders (Not Awarded) */}
          <div className="bg-white border-2 border-amber-500/70 rounded-xl p-4 shadow-xs bg-gradient-to-br from-amber-50/40 to-white">
            <div className="text-xs font-bold text-amber-800  flex items-center justify-between">
              <span>Working Tenders (Not Awarded)</span>
              <Briefcase className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-semibold text-amber-600 mt-1">
              {currentGroupSummary.totalWorkingTendersCount}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Active in-pipeline assignments across {currentGroupSummary.groupName} officers
            </div>
          </div>

          {/* 3. Total In-Progress Working Value */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Active Working Value (₹ Cr)</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-semibold text-emerald-700 mt-1 font-mono">
              {formatCurrencyCr(currentGroupSummary.totalWorkingValueCr)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Benchmark estimate volume in execution
            </div>
          </div>

          {/* 4. Average Workload per Officer */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Avg. Workload / Officer</span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-semibold text-purple-700 mt-1">
              {currentGroupSummary.avgTendersPerOfficer}{' '}
              <span className="text-xs font-normal text-slate-500">tenders/officer</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Average per officer
            </div>
          </div>
        </div>

        {/* Infographics Grid: Officer Workload Bar Chart + Stage Breakdown Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Chart (8 cols): Working Tenders per Officer in this Group */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {currentGroupSummary.groupName}: open tenders per officer
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Number of active in-pipeline tenders currently handled by each officer
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1 text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> PM
                </span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> FM
                </span>
                <span className="flex items-center gap-1 text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> CEC
                </span>
              </div>
            </div>

            {officerChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No officers found for {currentGroupSummary.groupName}
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={officerChartData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      allowDecimals={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 z-50 border border-slate-700">
                              <div className="font-bold flex items-center justify-between gap-4 text-slate-100 border-b border-slate-800 pb-1">
                                <span>{data.fullName}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                                  {roleName(data.role)}
                                </span>
                              </div>
                              <div className="text-amber-300 font-bold">
                                Working Tenders (Not Awarded): {data.workingCount}
                              </div>
                              <div className="text-slate-300 text-xs">
                                Currently on Desk: <strong>{data.holdingCount}</strong>
                              </div>
                              <div className="text-emerald-400 text-xs font-mono">
                                Active Value: {formatCurrencyCr(data.workingValueCr)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="workingCount" radius={[6, 6, 0, 0]}>
                      {officerChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right Chart (4 cols): Stage Distribution for Group 4 */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <PieIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Open tenders by stage</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Active stages in {currentGroupSummary.groupName}
                  </p>
                </div>
              </div>

              {groupStageDonutData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                  No active working tenders in this group
                </div>
              ) : (
                <div className="h-44 w-full relative mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={groupStageDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {groupStageDonutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg">
                                <div className="font-bold text-slate-200">{d.name}</div>
                                <div className="text-amber-400">
                                  {d.value} tenders ({d.percent}%)
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-semibold text-slate-800">
                      {currentGroupSummary.totalWorkingTendersCount}
                    </span>
                    <span className="text-xs text-slate-500">
                      Working
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Mini Legend */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-28 overflow-y-auto">
              {currentGroupSummary.stageBreakdownArray.map((item, idx) => (
                <div
                  key={item.stage}
                  className="flex items-center justify-between text-xs text-slate-600"
                >
                  <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          groupStageDonutData[idx]?.color || '#3b82f6',
                      }}
                    ></span>
                    <span className="truncate">{item.stage}</span>
                  </span>
                  <span className="font-bold text-slate-800">
                    {item.count}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      ({item.percent}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OFFICER-BY-OFFICER WORKLOAD CARDS & DETAILED ALLOCATION GRID              */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {currentGroupSummary.groupName}: officers
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Each officer, their team, and the open tenders they are working on
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
              {filteredOfficerWorkload.length} Officers Listed
            </span>
          </div>

          {/* Officers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredOfficerWorkload.map((item) => {
              const { officer, workingCount, holdingCount, workingValueCr, activeWorkingTenders } = item;

              const roleBadge =
                officer.role === 'PM'
                  ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Procurement (PM)' }
                  : officer.role === 'CEC'
                  ? { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Estimation (CEC)' }
                  : { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Finance (FM)' };

              return (
                <div
                  key={officer.id}
                  className="bg-slate-50/60 hover:bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-4 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between space-y-3 group"
                >
                  {/* Top: Officer Profile Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                          officer.role === 'PM'
                            ? 'bg-blue-600'
                            : officer.role === 'CEC'
                            ? 'bg-amber-600'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {officer.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {officer.name}
                        </h4>
                        <div className="text-xs text-slate-500 font-medium">
                          {officer.designation}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold border shrink-0 ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                    >
                      {officer.role}
                    </span>
                  </div>

                  {/* Middle: Workload Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div>
                      <div className="text-xs text-slate-500">
                        Working Tenders (Not Awarded)
                      </div>
                      <div className="text-base font-semibold text-indigo-700 flex items-center gap-1.5 mt-0.5">
                        <span>{workingCount}</span>
                        <span className="text-xs font-normal text-slate-500">
                          {workingCount === 1 ? 'tender' : 'tenders'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        Active Value (₹ Cr)
                      </div>
                      <div className="text-xs font-semibold text-slate-900 font-mono mt-1">
                        {formatCurrencyCr(workingValueCr)}
                      </div>
                    </div>
                  </div>

                  {/* Desk Status & Working Tenders Preview Chips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Currently on Desk: <strong className="text-slate-800">{holdingCount}</strong></span>
                      <span>Assigned in Pipeline: <strong className="text-indigo-700">{workingCount}</strong></span>
                    </div>

                    {/* Mini Chips of Working Tenders */}
                    {activeWorkingTenders.length > 0 ? (
                      <div className="space-y-1">
                        {activeWorkingTenders.slice(0, 2).map((tender) => {
                          const badge = getStageBadgeColor(tender.brief_status);
                          return (
                            <div
                              key={`${tender.sr_no}-${tender.pr_no}`}
                              onClick={() => onOpenTender(tender)}
                              className="p-1.5 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded text-xs flex items-center justify-between gap-1.5 cursor-pointer transition-colors"
                              title={`Click to open ${tender.pr_no}: ${tender.item_description}`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="font-mono font-bold text-blue-700">
                                  {tender.pr_no}
                                </span>
                                <span className="text-slate-600 truncate max-w-[130px]">
                                  {tender.item_description}
                                </span>
                              </div>
                              <span
                                className={`px-1.5 py-0.2 rounded text-xs font-bold shrink-0 border ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {tender.brief_status.replace('Under ', 'U/')}
                              </span>
                            </div>
                          );
                        })}

                        {activeWorkingTenders.length > 2 && (
                          <div className="text-xs text-center text-slate-400 font-semibold">
                            +{activeWorkingTenders.length - 2} more working tenders
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic py-1 text-center bg-white rounded border border-slate-100">
                        No active in-pipeline tenders currently
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Button */}
                  <button
                    onClick={() =>
                      setSelectedOfficerModal({
                        officer,
                        workingTenders: activeWorkingTenders,
                      })
                    }
                    className="w-full py-1.5 bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>Inspect Officer's Tenders ({workingCount})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ALL GROUPS COMPARATIVE EXECUTIVE OVERVIEW MATRIX                          */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                <span>All groups compared</span>
              </h3>
              <p className="text-xs text-slate-500">
                Officers, open tenders and value in progress for every group
              </p>
            </div>
            <span className="text-xs text-slate-400">All 6 Sourcing Groups</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200 text-xs ">
                  <th className="py-2.5 px-3">Sourcing Group</th>
                  <th className="py-2.5 px-3 text-center">Total Officers</th>
                  <th className="py-2.5 px-3 text-center">PM Officers</th>
                  <th className="py-2.5 px-3 text-center">FM Officers</th>
                  <th className="py-2.5 px-3 text-center">CEC Officers</th>
                  <th className="py-2.5 px-3 text-center">Working Tenders (Not Awarded)</th>
                  <th className="py-2.5 px-3 text-center">On Desk (Action Pending)</th>
                  <th className="py-2.5 px-3 text-right">Active Working Value (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-center">Avg. Load / Officer</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allGroupsSummary.map((grp) => {
                  const isCurrent = selectedGroup === grp.groupName;
                  return (
                    <tr
                      key={grp.groupName}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-indigo-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCurrent ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                          ></span>
                          <span className="font-bold text-slate-900">
                            {grp.groupName}
                          </span>
                          {grp.groupName === 'Group 4' && (
                            <span className="text-xs font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded">
                              Group 4 Focus
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {grp.totalOfficers}
                      </td>

                      <td className="py-2.5 px-3 text-center text-blue-700 font-semibold">
                        {grp.pmCount}
                      </td>

                      <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                        {grp.fmCount}
                      </td>

                      <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">
                        {grp.cecCount}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          {grp.totalWorkingTenders}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        {grp.holdingTendersCount}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrencyCr(grp.totalWorkingValueCr)}
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {grp.avgTendersPerOfficer}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedGroup(grp.groupName);
                            setOfficerSearch('');
                            const el = document.getElementById('group-workload-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700'
                          }`}
                        >
                          {isCurrent ? 'Viewing' : 'Select Group'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICER WORKING TENDERS DETAIL MODAL                                      */}
      {/* ========================================================================= */}
      {selectedOfficerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    selectedOfficerModal.officer.role === 'PM'
                      ? 'bg-blue-600'
                      : selectedOfficerModal.officer.role === 'CEC'
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {selectedOfficerModal.officer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedOfficerModal.officer.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800">
                      {roleName(selectedOfficerModal.officer.role)} · {selectedOfficerModal.officer.group || selectedGroup}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedOfficerModal.workingTenders.length} open tenders
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOfficerModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: List of Working Tenders */}
            <div className="p-4 overflow-y-auto space-y-2.5 max-h-[60vh]">
              {selectedOfficerModal.workingTenders.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active working (not awarded) tenders assigned to this officer.
                </div>
              ) : (
                selectedOfficerModal.workingTenders.map((tender) => {
                  const badge = getStageBadgeColor(tender.brief_status);
                  const isCurrentHolder = tender.current_holder === selectedOfficerModal.officer.name;

                  return (
                    <div
                      key={`${tender.sr_no}-${tender.pr_no}`}
                      onClick={() => {
                        setSelectedOfficerModal(null);
                        onOpenTender(tender);
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="space-y-1 max-w-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {tender.pr_no}
                          </span>
                          {tender.crfq_no && (
                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              CRFQ: {tender.crfq_no}
                            </span>
                          )}
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {tender.brief_status}
                          </span>
                          {isCurrentHolder && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> On Desk
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {tender.item_description}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Function: <strong>{tender.user_function}</strong></span>
                          <span>•</span>
                          <span>Lead PM: <strong>{tender.pm_officer}</strong></span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-900 font-mono">
                            {formatCurrencyCr(tender.estimate_value_cr)}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            Estimate Value
                          </div>
                        </div>
                        <span className="text-xs text-indigo-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Open Tender <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedOfficerModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
