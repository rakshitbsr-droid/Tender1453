import React, { useState } from 'react';
import { Tender, TenderStage, UserRole } from '../types';
import { formatCurrencyCr, formatDaysShort, getTenderCurrentStageDays, STAGE_STEPS } from '../utils/tenderUtils';
import { KanbanSquare, PlusCircle } from 'lucide-react';
import { Button, PageHeader, PriorityBadge, RoleBadge, SegmentedControl, cx } from '../components/ui';

interface StageKanbanViewProps {
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
  onOpenCreateTender: () => void;
}

const COLUMNS: TenderStage[] = [...STAGE_STEPS, 'Under Discussion with User'];

export const StageKanbanView: React.FC<StageKanbanViewProps> = ({ tenders, onOpenTender, onOpenCreateTender }) => {
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const visible = tenders.filter((t) => roleFilter === 'ALL' || t.current_role === roleFilter);

  return (
    <div className="pb-6">
      <PageHeader
        icon={KanbanSquare}
        title="Pipeline board"
        description="Every tender by stage, left to right. Click a card to open it."
        actions={
          <Button variant="primary" icon={PlusCircle} onClick={onOpenCreateTender}>
            New tender
          </Button>
        }
      />

      <div className="mb-4">
        <SegmentedControl
          label="Currently with"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'ALL', label: 'Anyone' },
            { value: 'PM', label: 'Procurement' },
            { value: 'FM', label: 'Finance' },
            { value: 'CEC', label: 'Estimation' },
          ]}
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 items-start snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {COLUMNS.map((stage, colIdx) => {
          const colTenders = visible.filter((t) => t.brief_status === stage);
          const colValue = colTenders.reduce((acc, t) => acc + (t.estimate_value_cr || 0), 0);
          const isDone = stage === 'Awarded';
          const isSideStep = stage === 'Under Discussion with User';

          return (
            <section key={stage} aria-label={stage} className="w-[85vw] sm:w-72 shrink-0 snap-start bg-slate-100/70 border border-slate-200 rounded-xl flex flex-col max-h-[calc(100vh-15rem)]">
              <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 truncate flex items-center gap-2" title={stage}>
                    {!isSideStep && <span className="text-slate-400 tabular-nums">{colIdx + 1}.</span>}
                    <span className="truncate">{stage}</span>
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tabular-nums shrink-0">{colTenders.length}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{colTenders.length > 0 ? formatCurrencyCr(colValue) : 'Empty'}</div>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {colTenders.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white/50">No tenders here</div>
                ) : (
                  colTenders.map((tender) => {
                    const days = getTenderCurrentStageDays(tender);
                    const slow = !isDone && days > 15;
                    return (
                      <button
                        key={tender.sr_no}
                        type="button"
                        onClick={() => onOpenTender(tender)}
                        className={cx(
                          'w-full text-left bg-white border rounded-lg p-3 transition-colors cursor-pointer group',
                          slow ? 'border-amber-300 hover:border-amber-400' : 'border-slate-200 hover:border-blue-400'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-mono text-blue-700">{tender.pr_no}</span>
                          <PriorityBadge priority={tender.priority} />
                        </div>
                        <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700 line-clamp-2 leading-snug">{tender.item_description}</div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                          <span className="text-slate-900">{formatCurrencyCr(tender.estimate_value_cr)}</span>
                          {isDone ? (
                            <span className="text-xs text-emerald-700">Done</span>
                          ) : (
                            <span className={cx('text-xs', slow ? 'text-amber-700 font-medium' : 'text-slate-500')}>{formatDaysShort(days)} here</span>
                          )}
                        </div>
                        {tender.current_holder && (
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
                            <span className="truncate">With {tender.current_holder}</span>
                            <RoleBadge role={tender.current_role} />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
