import React, { useState, useMemo } from 'react';
import { Tender, TimelineLogEntry } from '../types';
import { getRoleBadge, getEffectiveTimeline, getTimelineEntryDuration } from '../utils/tenderUtils';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  Clock,
  UserCheck,
  Building2,
  FileCheck2,
  Calendar
} from 'lucide-react';

interface AuditTrailViewProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
}

interface FlattenedAuditEntry extends TimelineLogEntry {
  tenderSrNo: number;
  prNo: string;
  itemDescription: string;
  estimateValueCr: number | null;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ tenders, onOpenTender }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pillarFilter, setPillarFilter] = useState<'ALL' | 'PM' | 'FM' | 'CEC'>('ALL');

  // Flatten all timeline entries (including parallel evaluation work) with parent tender metadata
  const allLogs: FlattenedAuditEntry[] = useMemo(() => {
    const logs: FlattenedAuditEntry[] = [];
    tenders.forEach((tender) => {
      getEffectiveTimeline(tender).forEach((log) => {
        logs.push({
          ...log,
          tenderSrNo: tender.sr_no,
          prNo: tender.pr_no,
          itemDescription: tender.item_description,
          estimateValueCr: tender.estimate_value_cr,
        });
      });
    });
    return logs;
  }, [tenders]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (pillarFilter !== 'ALL' && log.role !== pillarFilter) return false;
      if (
        searchTerm &&
        !log.prNo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.holder.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.stage.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(log.sub_stage || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(log.remarks || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [allLogs, searchTerm, pillarFilter]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <History className="w-5 h-5" />
          </span>
          <h2 className="text-base font-bold text-slate-800 leading-tight">
            Timeline & Audit
          </h2>
        </div>

        <div className="text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2 font-mono">
          <FileCheck2 className="w-4 h-4 text-emerald-600" />
          <span>Transitions: <strong className="text-slate-900">{allLogs.length}</strong></span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Role:</span>
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
              <button
                onClick={() => setPillarFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  pillarFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPillarFilter('PM')}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  pillarFilter === 'PM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PM
              </button>
              <button
                onClick={() => setPillarFilter('FM')}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  pillarFilter === 'FM' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FM
              </button>
              <button
                onClick={() => setPillarFilter('CEC')}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  pillarFilter === 'CEC' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                CEC
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-3.5 font-bold">PR No</th>
                <th className="py-3 px-3 font-bold">Item Description</th>
                <th className="py-3 px-3 font-bold">Stage</th>
                <th className="py-3 px-2.5 font-bold">Role</th>
                <th className="py-3 px-3 font-bold">Officer</th>
                <th className="py-3 px-3 font-bold font-mono whitespace-nowrap">Entry Date</th>
                <th className="py-3 px-3 font-bold font-mono whitespace-nowrap">Exit Date</th>
                <th className="py-3 px-3 font-bold text-right font-mono">Duration</th>
                <th className="py-3 px-4 font-bold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((log, idx) => {
                const roleBadge = getRoleBadge(log.role);
                const parentTender = tenders.find((t) => t.sr_no === log.tenderSrNo);

                return (
                  <tr
                    key={idx}
                    onClick={() => parentTender && onOpenTender(parentTender)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-700">
                      {log.prNo}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate font-semibold text-slate-900">
                      {log.itemDescription}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {log.stage}
                      {log.sub_stage && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                          {log.sub_stage}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                      >
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{log.holder}</td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.entry_date}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.exit_date || (
                        <span className="text-amber-700 font-bold">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                      {log.days_spent !== null ? (
                        <span
                          className={
                            log.days_spent > 15
                              ? 'text-rose-600'
                              : log.days_spent > 7
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {getTimelineEntryDuration(log).compactDisplay}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold">In Hand</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] max-w-sm truncate">
                      {log.remarks || '—'}
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
