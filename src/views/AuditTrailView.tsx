import React, { useState, useMemo } from 'react';
import { Tender, TimelineLogEntry, UserRole } from '../types';
import { formatDaysShort, formatFriendlyDate, getTimelineEntryDuration, parseCustomDate } from '../utils/tenderUtils';
import { History, SearchX } from 'lucide-react';
import { Button, EmptyState, PageHeader, RoleBadge, SearchInput, SegmentedControl, StatCard, cx } from '../components/ui';

interface AuditTrailViewProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
}

interface LogRow extends TimelineLogEntry {
  tender: Tender;
  sortKey: number;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ tenders, onOpenTender }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // One row per hand-off across every tender, newest first
  const allRows: LogRow[] = useMemo(() => {
    const rows: LogRow[] = [];
    tenders.forEach((tender) => {
      tender.timeline.forEach((log) => {
        rows.push({ ...log, tender, sortKey: parseCustomDate(log.entry_date)?.getTime() ?? 0 });
      });
    });
    return rows.sort((a, b) => b.sortKey - a.sortKey);
  }, [tenders]);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allRows.filter((row) => {
      if (roleFilter !== 'ALL' && row.role !== roleFilter) return false;
      if (!term) return true;
      return (
        row.tender.pr_no.toLowerCase().includes(term) ||
        row.holder.toLowerCase().includes(term) ||
        row.stage.toLowerCase().includes(term) ||
        row.tender.item_description.toLowerCase().includes(term) ||
        (row.remarks || '').toLowerCase().includes(term)
      );
    });
  }, [allRows, searchTerm, roleFilter]);

  const openNow = allRows.filter((r) => !r.exit_date).length;
  const filtersActive = searchTerm.trim() !== '' || roleFilter !== 'ALL';

  return (
    <div className="pb-12">
      <PageHeader icon={History} title="Activity log" description="Every hand-off across all tenders, newest first. Click a row to open the tender." />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Hand-offs recorded" value={allRows.length} />
        <StatCard label="Files on a desk right now" value={openNow} />
        <StatCard label="Tenders" value={tenders.length} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by PR number, officer, stage or note" className="flex-1 max-w-lg" />
        <SegmentedControl
          label="Team"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'PM', label: 'Procurement' },
            { value: 'FM', label: 'Finance' },
            { value: 'CEC', label: 'Estimation' },
          ]}
        />
        <span className="text-sm text-slate-500 sm:ml-auto">
          Showing <strong className="text-slate-900 font-medium">{rows.length}</strong> of {allRows.length}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No activity matches"
            description="Try a different search, or show all teams."
            action={
              filtersActive ? (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('ALL');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Phones: one card per hand-off */}
            <ul className="md:hidden divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const duration = getTimelineEntryDuration(row);
                const held = duration.totalHours < 24 ? duration.formattedDisplay : formatDaysShort(duration.totalDays);
                return (
                  <li key={`${row.tender.sr_no}-${idx}`}>
                    <button type="button" onClick={() => onOpenTender(row.tender)} className="w-full text-left p-4 hover:bg-blue-50/40 cursor-pointer">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm text-blue-700">{row.tender.pr_no}</span>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{formatFriendlyDate(row.entry_date)}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 mt-1">{row.stage}</div>
                      <div className="text-sm text-slate-700 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{row.holder}</span>
                        <RoleBadge role={row.role} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5">
                        {row.exit_date ? `Held ${held}, passed on ${formatFriendlyDate(row.exit_date)}` : `Still with them (${held})`}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-225">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th scope="col" className="py-3 px-3 font-medium">
                    Tender
                  </th>
                  <th scope="col" className="py-3 px-3 font-medium">
                    Stage
                  </th>
                  <th scope="col" className="py-3 px-3 font-medium">
                    Handled by
                  </th>
                  <th scope="col" className="py-3 px-3 font-medium whitespace-nowrap">
                    Received
                  </th>
                  <th scope="col" className="py-3 px-3 font-medium whitespace-nowrap">
                    Passed on
                  </th>
                  <th scope="col" className="py-3 px-3 font-medium text-right whitespace-nowrap">
                    Time held
                  </th>
                  <th scope="col" className="py-3 px-3 font-medium">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((row, idx) => {
                  const duration = getTimelineEntryDuration(row);
                  const days = duration.totalDays;
                  return (
                    <tr
                      key={`${row.tender.sr_no}-${idx}`}
                      onClick={() => onOpenTender(row.tender)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenTender(row.tender);
                        }
                      }}
                      className="hover:bg-blue-50/40 focus-visible:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <div className="font-mono text-blue-700">{row.tender.pr_no}</div>
                        <div className="text-xs text-slate-500 max-w-xs truncate" title={row.tender.item_description}>
                          {row.tender.item_description}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-900">{row.stage}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900">{row.holder}</span>
                          <RoleBadge role={row.role} />
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">{formatFriendlyDate(row.entry_date)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {row.exit_date ? <span className="text-slate-600">{formatFriendlyDate(row.exit_date)}</span> : <span className="text-amber-700">Still with them</span>}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={cx(days > 15 ? 'text-rose-700 font-medium' : days > 7 ? 'text-amber-700' : 'text-slate-900')}>
                          {duration.totalHours < 24 ? duration.formattedDisplay : formatDaysShort(days)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-sm">
                        <span className="line-clamp-2" title={row.remarks || undefined}>
                          {row.remarks || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-2">Time held counts working days only (Monday to Friday).</p>
    </div>
  );
};
