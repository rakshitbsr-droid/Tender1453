import React, { useState, useMemo } from 'react';
import { Tender } from '../types';
import { formatCurrencyCr, formatDaysShort, formatFriendlyDate, exportTendersToCSV, STAGE_STEPS } from '../utils/tenderUtils';
import { TableProperties, Download, ArrowUp, ArrowDown, ArrowUpDown, SearchX } from 'lucide-react';
import { Button, EmptyState, PageHeader, RoleBadge, SearchInput, StageBadge, cx, inputClass } from '../components/ui';

interface TenderRegisterViewProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
}

type SortField = 'pr_no' | 'item_description' | 'pm_officer' | 'estimate_value_cr' | 'awarded_value_cr' | 'sla_days' | 'brief_status';

const STAGE_FILTERS = [...STAGE_STEPS, 'Under Discussion with User', 'Cancelled'];

export const TenderRegisterView: React.FC<TenderRegisterViewProps> = ({ tenders, onOpenTender }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('pr_no');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tenders
      .filter((t) => {
        if (stageFilter !== 'ALL' && t.brief_status !== stageFilter) return false;
        if (!term) return true;
        return (
          t.item_description.toLowerCase().includes(term) ||
          t.pr_no.toLowerCase().includes(term) ||
          (t.crfq_no || '').toLowerCase().includes(term) ||
          t.pm_officer.toLowerCase().includes(term) ||
          (t.current_holder || '').toLowerCase().includes(term) ||
          t.user_function.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') return sortAsc ? valA - valB : valB - valA;
        return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
  }, [tenders, searchTerm, stageFilter, sortField, sortAsc]);

  const filtersActive = searchTerm.trim() !== '' || stageFilter !== 'ALL';

  const SortHeader = ({ field, children, align = 'left' }: { field: SortField; children: React.ReactNode; align?: 'left' | 'right' }) => {
    const active = sortField === field;
    const Icon = active ? (sortAsc ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th scope="col" aria-sort={active ? (sortAsc ? 'ascending' : 'descending') : 'none'} className={cx('py-3 px-3 font-medium', align === 'right' && 'text-right')}>
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={cx('inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer whitespace-nowrap', active && 'text-slate-900')}
        >
          <span>{children}</span>
          <Icon className={cx('w-3.5 h-3.5', active ? 'text-blue-600' : 'text-slate-400')} />
        </button>
      </th>
    );
  };

  return (
    <div className="pb-12">
      <PageHeader
        icon={TableProperties}
        title="All tenders"
        description="Every tender in the register. Click a row to open it."
        actions={
          <Button icon={Download} onClick={() => exportTendersToCSV(rows)}>
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by PR number, description, officer or department" className="flex-1 max-w-lg" />
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <span className="whitespace-nowrap">Stage</span>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={`${inputClass} w-auto cursor-pointer`}>
            <option value="ALL">All stages</option>
            {STAGE_FILTERS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm text-slate-500 sm:ml-auto">
          Showing <strong className="text-slate-900 font-medium">{rows.length}</strong> of {tenders.length}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No tenders match"
            description="Try a different search, or show all stages."
            action={
              filtersActive ? (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStageFilter('ALL');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Phones: one card per tender */}
            <ul className="md:hidden divide-y divide-slate-100">
              {rows.map((tender) => (
                <li key={tender.sr_no}>
                  <button type="button" onClick={() => onOpenTender(tender)} className="w-full text-left p-4 hover:bg-blue-50/40 cursor-pointer">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm text-blue-700">{tender.pr_no}</span>
                      <StageBadge stage={tender.brief_status} />
                    </div>
                    <div className="text-sm font-medium text-slate-900 mt-1.5 leading-snug">{tender.item_description}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {tender.user_function} · {tender.pm_officer}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-900">{formatCurrencyCr(tender.estimate_value_cr)}</span>
                      {tender.current_holder ? (
                        <span className="text-xs text-slate-600 truncate">With {tender.current_holder}</span>
                      ) : tender.sla_days ? (
                        <span className="text-xs text-slate-500">{formatDaysShort(tender.sla_days)}</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-250">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <SortHeader field="pr_no">PR number</SortHeader>
                  <SortHeader field="item_description">Description</SortHeader>
                  <SortHeader field="pm_officer">Procurement manager</SortHeader>
                  <SortHeader field="estimate_value_cr" align="right">
                    Estimate
                  </SortHeader>
                  <SortHeader field="awarded_value_cr" align="right">
                    Awarded
                  </SortHeader>
                  <SortHeader field="brief_status">Stage</SortHeader>
                  <th scope="col" className="py-3 px-3 font-medium">
                    Currently with
                  </th>
                  <SortHeader field="sla_days" align="right">
                    Working days
                  </SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((tender) => (
                  <tr
                    key={tender.sr_no}
                    onClick={() => onOpenTender(tender)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenTender(tender);
                      }
                    }}
                    className="hover:bg-blue-50/40 focus-visible:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono text-blue-700">{tender.pr_no}</div>
                      {tender.crfq_no && <div className="font-mono text-xs text-slate-400">{tender.crfq_no}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 max-w-md truncate" title={tender.item_description}>
                        {tender.item_description}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {tender.user_function} · {tender.tender_type} tender
                        {tender.tender_floated_on && <> · Floated {formatFriendlyDate(tender.tender_floated_on)}</>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-900">{tender.pm_officer}</div>
                      {tender.attached_pms?.length > 0 && (
                        <div className="text-xs text-slate-500 truncate max-w-40" title={tender.attached_pms.join(', ')}>
                          with {tender.attached_pms.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap text-slate-900">{formatCurrencyCr(tender.estimate_value_cr)}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {tender.awarded_value_cr ? <span className="text-emerald-700">{formatCurrencyCr(tender.awarded_value_cr)}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      <StageBadge stage={tender.brief_status} />
                    </td>
                    <td className="py-3 px-3">
                      {tender.current_holder ? (
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-35">{tender.current_holder}</span>
                          <RoleBadge role={tender.current_role} />
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {tender.sla_days ? (
                        <span className={tender.sla_days > 150 ? 'text-rose-700 font-medium' : tender.sla_days > 100 ? 'text-amber-700' : 'text-slate-900'}>
                          {formatDaysShort(tender.sla_days)}
                        </span>
                      ) : (
                        <span className="text-slate-400">In progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-2">Working days count Monday to Friday only; weekends are not included.</p>
    </div>
  );
};
