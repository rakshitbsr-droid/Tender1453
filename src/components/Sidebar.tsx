import React from 'react';
import { UserProfile, Tender } from '../types';
import { isPrimaryOfficer, roleName } from '../utils/tenderUtils';
import { LayoutDashboard, Inbox, TableProperties, KanbanSquare, History, FileSpreadsheet, HelpCircle } from 'lucide-react';
import { cx } from './ui';

export type NavTab =
  | 'dashboard'
  | 'my-queue'
  | 'tenders-register'
  | 'stage-kanban'
  | 'audit-trail'
  | 'excel-comparison';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  tenders: Tender[];
  onOpenCreateTender: () => void;
  onOpenWalkthrough?: () => void;
}

/** Tenders sitting with this person right now, where they are the responsible officer. */
export function countWaitingFor(user: UserProfile, tenders: Tender[]): number {
  return tenders.filter((t) => {
    if (t.current_holder?.toLowerCase() !== user.name.toLowerCase()) return false;
    return user.role === 'ADMIN' || isPrimaryOfficer(t, user.name, user.role);
  }).length;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, currentUser, tenders, onOpenWalkthrough }) => {
  const waitingCount = countWaitingFor(currentUser, tenders);
  const openCount = tenders.filter((t) => t.brief_status !== 'Awarded' && t.brief_status !== 'Cancelled').length;

  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; badgeTone?: 'alert' | 'muted' }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-queue', label: 'My queue', icon: Inbox, badge: waitingCount || undefined, badgeTone: 'alert' },
    { id: 'tenders-register', label: 'All tenders', icon: TableProperties, badge: tenders.length, badgeTone: 'muted' },
    { id: 'stage-kanban', label: 'Pipeline board', icon: KanbanSquare, badge: openCount || undefined, badgeTone: 'muted' },
    { id: 'audit-trail', label: 'Activity log', icon: History },
    { id: 'excel-comparison', label: 'Why replace Excel?', icon: FileSpreadsheet },
  ];

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="text-white font-semibold text-base tracking-tight">Tender Tracker</div>
        <div className="text-xs text-slate-400 mt-0.5">Chief Procurement Office</div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cx(
                'w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-sm',
                isActive ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className={cx('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={cx(
                    'text-xs px-1.5 py-0.5 rounded-full font-medium tabular-nums min-w-6 text-center',
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.badgeTone === 'alert'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-300'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {onOpenWalkthrough && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onOpenWalkthrough}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Help and tour</span>
          </button>
        </div>
      )}

      <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
        <div className="text-xs text-slate-400 mb-1.5">Signed in as</div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-slate-900 bg-blue-300 shrink-0">
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{currentUser.name}</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">{roleName(currentUser.role)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
