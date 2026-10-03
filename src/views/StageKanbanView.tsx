import React, { useState } from 'react';
import { Tender, TenderStage } from '../types';
import { formatCurrencyCr, getStageBadgeColor, STAGE_STEPS } from '../utils/tenderUtils';
import {
  KanbanSquare,
  Clock,
  ArrowRight,
  Send,
  PlusCircle,
  AlertTriangle,
  Building2,
  DollarSign
} from 'lucide-react';

interface StageKanbanViewProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
  onOpenCreateTender: () => void;
}

export const StageKanbanView: React.FC<StageKanbanViewProps> = ({
  tenders,
  onOpenTender,
  onOpenCreateTender,
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'PM' | 'FM' | 'CEC'>('ALL');

  const filteredTenders = tenders.filter((t) => {
    if (selectedRoleFilter === 'ALL') return true;
    return t.current_role === selectedRoleFilter;
  });

  const kanbanColumns: TenderStage[] = [
    ...STAGE_STEPS,
    'Under Discussion with User',
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <KanbanSquare className="w-5 h-5" />
          </span>
          <h2 className="text-base font-bold text-slate-800 leading-tight">
            Stage Pipeline
          </h2>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Role:</span>
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedRoleFilter('PM')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'PM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PM
            </button>
            <button
              onClick={() => setSelectedRoleFilter('FM')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'FM' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FM
            </button>
            <button
              onClick={() => setSelectedRoleFilter('CEC')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                selectedRoleFilter === 'CEC' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CEC
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrolling Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[calc(100vh-16rem)]">
        {kanbanColumns.map((stage, colIdx) => {
          const colTenders = filteredTenders.filter((t) => t.brief_status === stage);
          const colValue = colTenders.reduce((acc, t) => acc + (t.estimate_value_cr || 0), 0);
          const isTerminal = stage === 'Awarded';
          const stageBadge = getStageBadgeColor(stage);

          return (
            <div
              key={stage}
              className="w-76 xl:w-80 shrink-0 bg-slate-100/70 border border-slate-200 rounded-xl flex flex-col max-h-[calc(100vh-13rem)] shadow-xs"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                      {colIdx + 1}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 truncate" title={stage}>
                      {stage}
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {colTenders.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Total Value:</span>
                  <span className="font-bold text-slate-800">{formatCurrencyCr(colValue)}</span>
                </div>
              </div>

              {/* Cards List */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {colTenders.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white/50">
                    No tenders
                  </div>
                ) : (
                  colTenders.map((tender) => {
                    return (
                      <div
                        key={`${tender.sr_no}-${tender.pr_no}`}
                        onClick={() => onOpenTender(tender)}
                        className="bg-white border border-slate-200 hover:border-blue-400 rounded-lg p-3 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
                      >
                        {/* PR & Priority */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {tender.pr_no}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[110px]">
                            {tender.user_function}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                          {tender.item_description}
                        </h4>

                        {/* Value & SLA */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">
                            {formatCurrencyCr(tender.estimate_value_cr)}
                          </span>
                          {tender.sla_days ? (
                            <span className="text-amber-700 font-mono font-bold text-[10px]">
                              {tender.sla_days}d SLA
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </div>

                        {/* Current Holder pill */}
                        {tender.current_holder && (
                          <div className="mt-2 p-1.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1 text-slate-700 truncate font-medium">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  tender.current_role === 'PM'
                                    ? 'bg-blue-600'
                                    : tender.current_role === 'FM'
                                    ? 'bg-emerald-600'
                                    : 'bg-amber-500'
                                }`}
                              ></span>
                              <span className="truncate">{tender.current_holder}</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white text-slate-600 font-bold border border-slate-200">
                              {tender.current_role}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
