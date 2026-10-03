import React, { useState } from 'react';
import { UserProfile, Tender, EntityLeadershipSettings } from '../types';
import { USERS } from '../data/seedData';
import { isPrimaryOfficer, holdsEvaluationBidders, DEFAULT_LEADERSHIP_SETTINGS } from '../utils/tenderUtils';
import { 
  Menu,
  ChevronDown, 
  UserCheck, 
  PlusCircle, 
  Search,
  CheckCircle2,
  Crown,
  Eye,
  Building2,
  ShieldCheck,
  Clock
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onOpenCreateTender: () => void;
  onOpenNav?: () => void;
  tenders?: Tender[];
  users?: UserProfile[];
  leadershipSettings?: EntityLeadershipSettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectUser,
  onOpenCreateTender,
  onOpenNav,
  tenders = [],
  users,
  leadershipSettings = DEFAULT_LEADERSHIP_SETTINGS,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const userList = users && users.length > 0 ? users : USERS;

  // Inbox count: files an officer holds as primary officer, plus bidders received for evaluation
  const inboxCountFor = (u: UserProfile) =>
    tenders.filter((t) => {
      if (holdsEvaluationBidders(t, u.name)) return true;
      const isHolder = t.current_holder?.toLowerCase() === u.name.toLowerCase();
      if (!isHolder) return false;
      return u.role === 'ADMIN' || isPrimaryOfficer(t, u.name, u.role);
    }).length;

  const myInboxCount = inboxCountFor(currentUser);

  const isEntityHead = leadershipSettings.entityHeadName.toLowerCase() === currentUser.name.toLowerCase();
  const isFinanceHead = leadershipSettings.financeHeadName.toLowerCase() === currentUser.name.toLowerCase();
  const isEstimateHead = leadershipSettings.estimateHeadName.toLowerCase() === currentUser.name.toLowerCase();

  const filteredUsers = userList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.pillar && u.pillar.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.group && u.group.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const pmUsers = filteredUsers.filter((u) => u.role === 'PM');
  const fmUsers = filteredUsers.filter((u) => u.role === 'FM');
  const cecUsers = filteredUsers.filter((u) => u.role === 'CEC');
  const adminUsers = filteredUsers.filter((u) => u.role === 'ADMIN');

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Header Title */}
        <div className="flex items-center space-x-3 min-w-0">
          {onOpenNav && (
            <button
              type="button"
              onClick={onOpenNav}
              aria-label="Menu"
              className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-bold text-slate-800 text-sm tracking-wide truncate">
            Workflow Management System
          </h2>
        </div>

        {/* Right: Quick Create & User Persona Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Quick Create Tender (Anyone can create tender including FM and CEC) */}
          <button
            onClick={onOpenCreateTender}
            aria-label="Create Tender"
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create Tender</span>
          </button>

          {/* Access Scope Indicator Badge */}
          {isEntityHead || currentUser.role === 'ADMIN' ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>Entity Head • All Tenders ({tenders.length})</span>
            </span>
          ) : isFinanceHead ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Finance Head • All Tenders ({tenders.length})</span>
            </span>
          ) : isEstimateHead ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Estimate Head • All Tenders ({tenders.length})</span>
            </span>
          ) : currentUser.visibilityScope === 'ALL' ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>All Tenders ({tenders.length})</span>
            </span>
          ) : currentUser.isGroupLeader ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>{currentUser.group || 'Group'} Leader • {tenders.length} Tenders</span>
            </span>
          ) : currentUser.visibilityScope === 'GROUP' ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{currentUser.group || 'Group'} • {tenders.length} Tenders</span>
            </span>
          ) : (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Assigned Tenders ({tenders.length})</span>
            </span>
          )}

          {/* User Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer"
              aria-expanded={isDropdownOpen}
            >
              <div className="relative">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900 bg-blue-300`}
                >
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                {myInboxCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {myInboxCount}
                  </span>
                )}
              </div>

              <div className="text-left hidden md:block leading-tight">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      currentUser.role === 'PM'
                        ? 'bg-blue-100 text-blue-700'
                        : currentUser.role === 'FM'
                        ? 'bg-emerald-100 text-emerald-700'
                        : currentUser.role === 'CEC'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                  {currentUser.visibilityScope === 'ALL' && currentUser.role !== 'ADMIN' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      All Access
                    </span>
                  )}
                </div>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Persona Switcher Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-slate-800">
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      Switch User
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search user..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-1">
                  {/* Management */}
                  {adminUsers.length > 0 && (
                    <div className="p-1.5">
                      <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider px-2 py-1">
                        Management
                      </div>
                      {adminUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSelectUser(u);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            currentUser.id === u.id
                              ? 'bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <div>
                              <div className="font-semibold text-slate-800">{u.name}</div>
                              <div className="text-[10px] text-slate-500">{u.designation}</div>
                            </div>
                          </div>
                          {currentUser.id === u.id && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Procurement Managers (PMs) */}
                  {pmUsers.length > 0 && (
                    <div className="p-1.5">
                      <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider px-2 py-1">
                        Procurement Managers
                      </div>
                      <div className="space-y-0.5">
                        {pmUsers.map((u) => {
                          const inbox = inboxCountFor(u);
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                onSelectUser(u);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                currentUser.id === u.id
                                  ? 'bg-blue-50 text-blue-800 font-semibold border border-blue-200'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                                    <span>{u.name}</span>
                                    {u.isGroupLeader && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        Leader
                                      </span>
                                    )}
                                    {u.visibilityScope === 'ALL' && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        All Tenders
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                                    <span>{u.group || 'Group 1'}</span>
                                    {u.canEditMasters && (
                                      <span className="text-[9px] text-indigo-600 font-bold">• Masters</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {inbox > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    {inbox} inbox
                                  </span>
                                )}
                                {currentUser.id === u.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Finance Managers (FMs) */}
                  {fmUsers.length > 0 && (
                    <div className="p-1.5">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider px-2 py-1">
                        Finance Managers
                      </div>
                      <div className="space-y-0.5">
                        {fmUsers.map((u) => {
                          const inbox = inboxCountFor(u);
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                onSelectUser(u);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                currentUser.id === u.id
                                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                                    <span>{u.name}</span>
                                    {leadershipSettings.financeHeadName.toLowerCase() === u.name.toLowerCase() && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Finance Head
                                      </span>
                                    )}
                                    {u.isGroupLeader && leadershipSettings.financeHeadName.toLowerCase() !== u.name.toLowerCase() && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        Leader
                                      </span>
                                    )}
                                    {u.visibilityScope === 'ALL' && leadershipSettings.financeHeadName.toLowerCase() !== u.name.toLowerCase() && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        All Tenders
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                                    <span>{u.group || 'Finance Group'}</span>
                                    {u.canEditMasters && (
                                      <span className="text-[9px] text-indigo-600 font-bold">• Masters</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {inbox > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    {inbox} inbox
                                  </span>
                                )}
                                {currentUser.id === u.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Estimation Officers (CEC) */}
                  {cecUsers.length > 0 && (
                    <div className="p-1.5">
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider px-2 py-1">
                        Estimation Officers
                      </div>
                      <div className="space-y-0.5">
                        {cecUsers.map((u) => {
                          const inbox = inboxCountFor(u);
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                onSelectUser(u);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                currentUser.id === u.id
                                  ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                                    <span>{u.name}</span>
                                    {leadershipSettings.estimateHeadName.toLowerCase() === u.name.toLowerCase() && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        Estimate Head
                                      </span>
                                    )}
                                    {u.isGroupLeader && leadershipSettings.estimateHeadName.toLowerCase() !== u.name.toLowerCase() && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        Leader
                                      </span>
                                    )}
                                    {u.visibilityScope === 'ALL' && leadershipSettings.estimateHeadName.toLowerCase() !== u.name.toLowerCase() && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        All Tenders
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                                    <span>{u.group || 'Estimation Group'}</span>
                                    {u.canEditMasters && (
                                      <span className="text-[9px] text-indigo-600 font-bold">• Masters</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {inbox > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    {inbox} inbox
                                  </span>
                                )}
                                {currentUser.id === u.id && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
