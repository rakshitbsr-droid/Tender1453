import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, Tender, UserRole } from '../types';
import { USERS } from '../data/seedData';
import { isPrimaryOfficer, roleName } from '../utils/tenderUtils';
import { ChevronDown, PlusCircle, CheckCircle2, Menu } from 'lucide-react';
import { Button, RoleBadge, SearchInput, cx } from './ui';

interface HeaderProps {
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onOpenCreateTender: () => void;
  onOpenComparison?: () => void;
  onOpenWalkthrough?: () => void;
  onResetData?: () => void;
  onOpenNav?: () => void;
  tenders?: Tender[];
}

const ROLE_ORDER: UserRole[] = ['ADMIN', 'PM', 'FM', 'CEC'];

export const Header: React.FC<HeaderProps> = ({ currentUser, onSelectUser, onOpenCreateTender, onOpenNav, tenders = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user menu on Escape or when clicking anywhere else
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [isOpen]);

  const term = userSearch.trim().toLowerCase();
  const matches = (u: UserProfile) =>
    !term || u.name.toLowerCase().includes(term) || roleName(u.role).toLowerCase().includes(term) || u.pillar.toLowerCase().includes(term);

  const waitingFor = (u: UserProfile) =>
    tenders.filter((t) => t.current_holder?.toLowerCase() === u.name.toLowerCase() && (u.role === 'ADMIN' || isPrimaryOfficer(t, u.name, u.role)))
      .length;

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {onOpenNav && (
            <button
              type="button"
              onClick={onOpenNav}
              aria-label="Open menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <span className="lg:hidden text-base font-semibold text-slate-900 truncate">Tender Tracker</span>
          <span className="hidden lg:inline text-sm text-slate-500 truncate">Prototype with demo data. Nothing here is a real tender.</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {(currentUser.role === 'PM' || currentUser.role === 'ADMIN') && (
            <Button variant="primary" icon={PlusCircle} onClick={onOpenCreateTender} aria-label="New tender">
              <span className="hidden sm:inline">New tender</span>
            </Button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpen((o) => !o)}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-slate-900 bg-blue-300">
                {initials(currentUser.name)}
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-sm font-medium text-slate-900">{currentUser.name}</div>
                <div className="text-xs text-slate-500">{roleName(currentUser.role)}</div>
              </div>
              <ChevronDown className={cx('w-4 h-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-200">
                  <div className="text-sm font-semibold text-slate-900 mb-2">Switch user</div>
                  <p className="text-xs text-slate-500 mb-2">This demo lets you see the app as anyone on the team.</p>
                  <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search by name or team" />
                </div>

                <div className="max-h-96 overflow-y-auto p-1.5">
                  {ROLE_ORDER.map((role) => {
                    const people = USERS.filter((u) => u.role === role && matches(u));
                    if (people.length === 0) return null;
                    return (
                      <div key={role} className="p-1">
                        <div className="text-xs font-medium text-slate-500 px-2 py-1">{roleName(role)}</div>
                        {people.map((u) => {
                          const isCurrent = currentUser.id === u.id;
                          const waiting = waitingFor(u);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                onSelectUser(u);
                                setIsOpen(false);
                              }}
                              className={cx(
                                'w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-sm transition-colors cursor-pointer',
                                isCurrent ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                              )}
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 truncate">{u.name}</div>
                                <div className="text-xs text-slate-500 truncate">{u.designation}</div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {waiting > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                    {waiting} waiting
                                  </span>
                                )}
                                {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  {USERS.filter(matches).length === 0 && <p className="text-sm text-slate-500 text-center py-6">No one matches “{userSearch}”.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Kept for callers that still want the badge on its own.
export { RoleBadge };
