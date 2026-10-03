import React from 'react';
import { UserProfile, Tender } from '../types';
import { isPrimaryOfficer, holdsEvaluationBidders } from '../utils/tenderUtils';
import {
  LayoutDashboard,
  Inbox,
  TableProperties,
  KanbanSquare,
  History,
  PlusCircle,
  Sliders,
  MessageSquare
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'assistant'
  | 'my-queue'
  | 'tenders-register'
  | 'stage-kanban'
  | 'audit-trail'
  | 'masters';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  tenders: Tender[];
  onOpenCreateTender: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  tenders,
  onOpenCreateTender,
}) => {
  // Inbox count for the current persona: files held as primary officer, plus bidders received
  // for EMD / BQC evaluation
  const myActionCount = tenders.filter((t) => {
    if (holdsEvaluationBidders(t, currentUser.name)) return true;
    const isHolder = t.current_holder?.toLowerCase() === currentUser.name.toLowerCase();
    if (!isHolder) return false;
    if (currentUser.role !== 'ADMIN') {
      return isPrimaryOfficer(t, currentUser.name, currentUser.role);
    }
    return true;
  }).length;

  const inProcessCount = tenders.filter(
    (t) => t.brief_status !== 'Awarded' && t.brief_status !== 'Cancelled'
  ).length;

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'assistant' as NavTab,
      label: 'Assistant',
      icon: MessageSquare,
      badge: null,
    },
    {
      id: 'my-queue' as NavTab,
      label: 'My Action Queue',
      icon: Inbox,
      badge: myActionCount > 0 ? myActionCount : null,
      badgeColor: 'bg-red-500 text-white font-bold',
    },
    {
      id: 'tenders-register' as NavTab,
      label: 'All Tenders',
      icon: TableProperties,
      badge: tenders.length,
      badgeColor: 'bg-slate-800 text-slate-300 border border-slate-700',
    },
    {
      id: 'stage-kanban' as NavTab,
      label: 'Stage Pipeline',
      icon: KanbanSquare,
      badge: inProcessCount > 0 ? `${inProcessCount}` : null,
      badgeColor: 'bg-blue-500/30 text-blue-300 border border-blue-400/40',
    },
    {
      id: 'audit-trail' as NavTab,
      label: 'Timeline & Audit',
      icon: History,
      badge: null,
    },
    {
      id: 'masters' as NavTab,
      label: 'Masters',
      icon: Sliders,
      badge: null,
    },
  ];

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <h1 className="text-white font-bold text-base tracking-tight flex items-center gap-1">
          <span>CPO</span>
          <span className="text-blue-400 font-extrabold">PORTAL</span>
        </h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="text-xs font-semibold truncate">{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                    isActive ? 'bg-white text-blue-900' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Initiate CTA for Procurement */}
      {(currentUser.role === 'PM' || currentUser.role === 'ADMIN') && (
        <div className="px-3 pb-2">
          <button
            onClick={onOpenCreateTender}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Tender</span>
          </button>
        </div>
      )}

      {/* Current User Card at bottom */}
      <div className="p-3.5 bg-slate-800/90 mx-3 mb-3 rounded-xl border border-slate-700/60 shadow-xs">
        <div className="text-[10px] uppercase text-slate-400 mb-2 font-bold tracking-wider">
          Current User
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 bg-blue-400 shrink-0 shadow-xs`}
          >
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">{currentUser.name}</p>
            <p className="text-[10px] text-slate-300 truncate mt-0.5">
              {currentUser.designation}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
