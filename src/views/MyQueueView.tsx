import React, { useState } from 'react';
import { Tender, UserProfile, TenderStage, UserRole } from '../types';
import { formatCurrencyCr, formatDaysShort, getTenderCurrentStageDays, isPrimaryOfficer, roleName } from '../utils/tenderUtils';
import { USERS } from '../data/seedData';
import { Inbox, Send, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { Button, Card, EmptyState, Field, PageHeader, PriorityBadge, RoleBadge, SearchInput, SectionHeading, SegmentedControl, StageBadge, StatCard, cx, inputClass } from '../components/ui';

interface MyQueueViewProps {
  currentUser: UserProfile;
  tenders: Tender[];
  onOpenTender: (tender: Tender) => void;
  onAdvanceStage: (
    tenderId: number,
    nextStage: TenderStage,
    nextHolder: string,
    nextRole: UserRole,
    remarks: string,
    awardedValue?: number,
    savings?: number
  ) => void;
}

export const MyQueueView: React.FC<MyQueueViewProps> = ({ currentUser, tenders, onOpenTender }) => {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  // Management can look at any officer's queue
  const [adminSelectedOfficerId, setAdminSelectedOfficerId] = useState<string>('pm-1');

  const viewedUser: UserProfile =
    currentUser.role === 'ADMIN' ? USERS.find((u) => u.id === adminSelectedOfficerId) || USERS[1] : currentUser;
  const isOwnQueue = viewedUser.id === currentUser.id;

  const matchesFilters = (t: Tender) => {
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        t.item_description.toLowerCase().includes(term) ||
        t.pr_no.toLowerCase().includes(term) ||
        (t.crfq_no || '').toLowerCase().includes(term)
      );
    }
    return true;
  };

  // Only tenders where this person is the responsible officer count; being a second reviewer does not.
  const mine = tenders.filter((t) => isPrimaryOfficer(t, viewedUser.name, viewedUser.role));
  const isWithViewedUser = (t: Tender) => t.current_holder?.toLowerCase() === viewedUser.name.toLowerCase();

  const waiting = mine.filter((t) => isWithViewedUser(t) && matchesFilters(t));
  const elsewhere = mine.filter((t) => !isWithViewedUser(t) && matchesFilters(t));
  const inProgressElsewhere = elsewhere.filter((t) => t.brief_status !== 'Awarded' && t.brief_status !== 'Cancelled');
  const finished = elsewhere.filter((t) => t.brief_status === 'Awarded' || t.brief_status === 'Cancelled');

  const totalValue = mine.reduce((sum, t) => sum + (t.estimate_value_cr || 0), 0);
  const you = isOwnQueue ? 'you' : viewedUser.name.split(' ')[0];
  const filtersActive = priorityFilter !== 'ALL' || searchTerm.trim() !== '';

  return (
    <div className="pb-12">
      <PageHeader
        icon={Inbox}
        title={isOwnQueue ? 'My queue' : `${viewedUser.name}’s queue`}
        description={
          isOwnQueue
            ? 'Tenders waiting for you, and the ones you are responsible for that are with someone else.'
            : `Tenders waiting for ${viewedUser.name}, and the ones they are responsible for that are with someone else.`
        }
      />

      {currentUser.role === 'ADMIN' && (
        <Card className="mb-6">
          <Field label="Show the queue for" htmlFor="admin-officer-select" hint="As management you can look at anyone’s queue.">
            <select
              id="admin-officer-select"
              value={adminSelectedOfficerId}
              onChange={(e) => setAdminSelectedOfficerId(e.target.value)}
              className={`${inputClass} max-w-md cursor-pointer`}
            >
              {(['PM', 'FM', 'CEC'] as UserRole[]).map((role) => (
                <optgroup key={role} label={roleName(role)}>
                  {USERS.filter((u) => u.role === role).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={`Waiting for ${you}`} value={waiting.length} tone={waiting.length > 0 ? 'amber' : 'green'} icon={Clock} />
        <StatCard label="With someone else" value={inProgressElsewhere.length} hint="Still in progress" />
        <StatCard label="Total value" value={formatCurrencyCr(totalValue)} hint={`${mine.length} tenders in all`} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by PR number, CRFQ or description" className="flex-1 max-w-md" />
        <SegmentedControl
          label="Show"
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'High', label: 'High priority only' },
          ]}
        />
      </div>

      <section className="mb-8" aria-labelledby="waiting-heading">
        <SectionHeading title={`Waiting for ${you} (${waiting.length})`} description="The file is on this desk. Open it to review and send it on." />
        {waiting.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={CheckCircle2}
              title={filtersActive ? 'Nothing matches these filters' : 'Nothing is waiting'}
              description={
                filtersActive
                  ? 'Try a different search or show all priorities.'
                  : inProgressElsewhere.length > 0
                  ? `${inProgressElsewhere.length} of your tenders are with other people right now. They are listed below.`
                  : 'When a tender is sent to you it will appear here.'
              }
              action={
                filtersActive ? (
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setPriorityFilter('ALL');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waiting.map((tender) => {
              const days = getTenderCurrentStageDays(tender);
              const overdue = days > 15;
              return (
                <div key={tender.sr_no} className={cx('bg-white border rounded-xl p-5', overdue ? 'border-amber-300' : 'border-slate-200')}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-blue-700">{tender.pr_no}</span>
                    <StageBadge stage={tender.brief_status} />
                    <PriorityBadge priority={tender.priority} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTender(tender)}
                    className="text-left text-base font-semibold text-slate-900 hover:text-blue-700 leading-snug line-clamp-2 cursor-pointer"
                  >
                    {tender.item_description}
                  </button>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Estimated value</dt>
                      <dd className="font-medium text-slate-900">{formatCurrencyCr(tender.estimate_value_cr)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Requested by</dt>
                      <dd className="text-slate-800">{tender.user_function}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Procurement manager</dt>
                      <dd className="text-slate-800 truncate">{tender.pm_officer}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">On this desk for</dt>
                      <dd className={overdue ? 'font-medium text-amber-700' : 'text-slate-800'}>
                        {formatDaysShort(days)} <span className="text-xs text-slate-500">(working days)</span>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button onClick={() => onOpenTender(tender)}>Open</Button>
                    <Button variant="primary" icon={Send} onClick={() => onOpenTender(tender)}>
                      Send to next person
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="elsewhere-heading">
        <SectionHeading
          title={`With someone else (${inProgressElsewhere.length})`}
          description={`Tenders ${you === 'you' ? 'you are' : `${you} is`} responsible for that another person is working on right now.`}
        />
        {inProgressElsewhere.length === 0 ? (
          <Card padded={false}>
            <EmptyState title="None in progress elsewhere" description="Everything of yours is either on your desk or already finished." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressElsewhere.map((tender) => (
              <button
                key={tender.sr_no}
                type="button"
                onClick={() => onOpenTender(tender)}
                className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-colors cursor-pointer flex flex-col group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-mono text-blue-700">{tender.pr_no}</span>
                  <StageBadge stage={tender.brief_status} />
                </div>
                <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 line-clamp-2">{tender.item_description}</div>
                <div className="mt-3 text-sm text-slate-600 flex items-center justify-between gap-2">
                  <span>{formatCurrencyCr(tender.estimate_value_cr)}</span>
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="truncate">With {tender.current_holder}</span>
                    <RoleBadge role={tender.current_role} />
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-sm text-blue-700 flex items-center justify-between">
                  <span>Open</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}

        {finished.length > 0 && (
          <p className="text-sm text-slate-500 mt-4">
            {finished.length} more {finished.length === 1 ? 'tender is' : 'tenders are'} finished (awarded or cancelled). Find them under All tenders.
          </p>
        )}
      </section>
    </div>
  );
};
