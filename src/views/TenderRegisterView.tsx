import React, { useState, useMemo } from 'react';
import { Tender, TenderStage } from '../types';
import { formatCurrencyCr, getStageBadgeColor, exportTendersToCSV } from '../utils/tenderUtils';
import {
  TableProperties,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';

interface TenderRegisterViewProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
}

type SortField =
  | 'sr_no'
  | 'pr_no'
  | 'item_description'
  | 'pm_officer'
  | 'user_function'
  | 'tender_type'
  | 'estimate_value_cr'
  | 'awarded_value_cr'
  | 'sla_days'
  | 'brief_status';

export const TenderRegisterView: React.FC<TenderRegisterViewProps> = ({ tenders, onOpenTender }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('sr_no');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSorted = useMemo(() => {
    return tenders
      .filter((t) => {
        if (stageFilter === 'Awarded & Closed') {
          return t.brief_status === 'Awarded' && t.is_closed;
        }
        if (stageFilter === 'In Pipeline') {
          return t.brief_status !== 'Awarded' && t.brief_status !== 'Cancelled';
        }
        if (stageFilter !== 'ALL' && t.brief_status !== stageFilter) return false;
        if (
          searchTerm &&
          !t.item_description.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !t.pr_no.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(t.crfq_no || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
          !t.pm_officer.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !t.user_function.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [tenders, searchTerm, stageFilter, sortField, sortAsc]);

  const stagesList = [
    'ALL',
    'In Pipeline',
    'Awarded',
    'Awarded & Closed',
    'Cancelled',
    'PR Received',
    'Under Estimation',
    'BQC approval',
    'To be Floated',
    'Under Bidding',
    'Under BQC / Tech Evaluation',
    'Cashflow report Preparation',
    'Under Negotiation',
    'Under Award Approval',
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Export CTA */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <TableProperties className="w-5 h-5" />
          </span>
          <h2 className="text-base font-bold text-slate-800 leading-tight">
            All Tenders
          </h2>
        </div>

        <button
          onClick={() => exportTendersToCSV(filteredAndSorted)}
          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            <strong className="text-slate-800">{filteredAndSorted.length}</strong> of{' '}
            <strong className="text-slate-600">{tenders.length}</strong> tenders
          </div>
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1">
            Stage:
          </span>
          {stagesList.map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-2.5 py-1 rounded-lg shrink-0 text-xs font-semibold cursor-pointer transition-colors ${
                stageFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th
                  onClick={() => handleSort('sr_no')}
                  className="py-3 px-3.5 font-bold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Sr #</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pr_no')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>PR No / Ref</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('item_description')}
                  className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Item Description</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('user_function')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>User Function</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pm_officer')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>PM Officer</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('tender_type')}
                  className="py-3 px-2.5 font-bold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('estimate_value_cr')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Estimate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('awarded_value_cr')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Awarded Value</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('brief_status')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Stage</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-bold text-slate-600">Current Holder</th>
                <th
                  onClick={() => handleSort('sla_days')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>SLA</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-bold text-center text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAndSorted.map((tender) => {
                const stageBadge = getStageBadgeColor(tender.brief_status);
                return (
                  <tr
                    key={`${tender.sr_no}-${tender.pr_no}`}
                    onClick={() => onOpenTender(tender)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3.5 text-slate-500 font-mono font-medium">
                      {tender.sr_no}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-blue-700">{tender.pr_no}</div>
                      {tender.crfq_no && (
                        <div className="font-mono text-[10px] text-slate-400">{tender.crfq_no}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors max-w-xs truncate">
                        {tender.item_description}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        Floated: {tender.tender_floated_on || '—'} • Due: {tender.tender_opened_due_on || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {tender.user_function}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{tender.pm_officer}</div>
                      {tender.attached_pms && tender.attached_pms.length > 0 && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          +{tender.attached_pms.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="text-slate-600 font-medium">{tender.tender_type}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                      {formatCurrencyCr(tender.estimate_value_cr)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono">
                      {tender.awarded_value_cr ? (
                        <span className="text-emerald-600">
                          {formatCurrencyCr(tender.awarded_value_cr)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {tender.brief_status === 'Awarded' ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${stageBadge.dot}`}></span>
                            Awarded
                          </span>
                          {tender.is_closed ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded border border-emerald-300">
                              Closed
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.2 rounded border border-amber-300">
                              Post-Award Pending
                            </span>
                          )}
                        </div>
                      ) : tender.brief_status === 'Cancelled' ? (
                        <div className="flex flex-col gap-0.5 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${stageBadge.dot}`}></span>
                            Cancelled
                          </span>
                          {tender.cancellation_info?.reason && (
                            <span
                              className="text-[10px] text-rose-700 truncate max-w-[130px] font-medium"
                              title={tender.cancellation_info.reason}
                            >
                              {tender.cancellation_info.reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${stageBadge.dot}`}></span>
                          {tender.brief_status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {tender.current_holder ? (
                        <div className="flex items-center gap-1 text-amber-700 font-semibold">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span className="truncate max-w-[120px]">{tender.current_holder}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {tender.sla_days ? (
                        <span
                          className={
                            tender.sla_days > 150
                              ? 'text-rose-600'
                              : tender.sla_days > 100
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {tender.sla_days} d
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenTender(tender)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
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
  );
};
