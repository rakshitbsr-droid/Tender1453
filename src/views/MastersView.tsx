import React, { useState } from 'react';
import {
  Building2,
  Users,
  Layers,
  Tag,
  Building,
  DollarSign,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';
import {
  StageMasterItem,
  UserProfile,
  Tender,
  GroupMasterItem,
  EntityLeadershipSettings,
  UserFunctionMasterItem,
  TenderTypeMasterItem,
  SlaMasterRules,
} from '../types';
import {
  DEFAULT_GROUPS,
  DEFAULT_STAGE_MASTERS,
  DEFAULT_USER_FUNCTIONS,
  DEFAULT_TENDER_TYPES,
  DEFAULT_SLA_RULES,
} from '../utils/tenderUtils';

import { GroupsMasterTab } from '../components/masters/GroupsMasterTab';
import { OfficersMasterTab } from '../components/masters/OfficersMasterTab';
import { CecFinanceMasterTab } from '../components/masters/CecFinanceMasterTab';
import { UserFunctionsMasterTab } from '../components/masters/UserFunctionsMasterTab';
import { TenderTypesMasterTab } from '../components/masters/TenderTypesMasterTab';
import { TenderStagesMasterTab } from '../components/masters/TenderStagesMasterTab';
import { HolidaysMasterTab } from '../components/masters/HolidaysMasterTab';

export type MasterTab =
  | 'groups'
  | 'officers'
  | 'cec-finance'
  | 'user-functions'
  | 'tender-types'
  | 'stages'
  | 'holidays';

interface MastersViewProps {
  stages: StageMasterItem[];
  onUpdateStages: (newStages: StageMasterItem[]) => void;
  users: UserProfile[];
  onUpdateUsers: (newUsers: UserProfile[]) => void;
  groups?: GroupMasterItem[];
  onUpdateGroups?: (newGroups: GroupMasterItem[]) => void;
  userFunctions?: UserFunctionMasterItem[];
  onUpdateUserFunctions?: (newFunctions: UserFunctionMasterItem[]) => void;
  tenderTypes?: TenderTypeMasterItem[];
  onUpdateTenderTypes?: (newTypes: TenderTypeMasterItem[]) => void;
  leadershipSettings?: EntityLeadershipSettings;
  onUpdateLeadershipSettings?: (newSettings: EntityLeadershipSettings) => void;
  slaRules?: SlaMasterRules;
  onUpdateSlaRules?: (newRules: SlaMasterRules) => void;
  tenders: Tender[];
  currentUser: UserProfile;
  showToast: (msg: string) => void;
}

export const MastersView: React.FC<MastersViewProps> = ({
  stages = DEFAULT_STAGE_MASTERS,
  onUpdateStages,
  users,
  onUpdateUsers,
  groups = DEFAULT_GROUPS,
  onUpdateGroups = () => {},
  userFunctions = DEFAULT_USER_FUNCTIONS,
  onUpdateUserFunctions = () => {},
  tenderTypes = DEFAULT_TENDER_TYPES,
  onUpdateTenderTypes = () => {},
  slaRules = DEFAULT_SLA_RULES,
  onUpdateSlaRules = () => {},
  tenders,
  currentUser,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<MasterTab>('groups');

  const navTabs = [
    {
      id: 'groups' as MasterTab,
      label: 'Groups',
      icon: Building2,
      count: groups.length,
      color: 'text-blue-600',
    },
    {
      id: 'officers' as MasterTab,
      label: 'Officers',
      icon: Users,
      count: users.length,
      color: 'text-indigo-600',
    },
    {
      id: 'cec-finance' as MasterTab,
      label: 'CEC & Finance Groups',
      icon: DollarSign,
      count: users.filter((u) => u.role === 'FM' || u.role === 'CEC').length,
      color: 'text-emerald-600',
    },
    {
      id: 'user-functions' as MasterTab,
      label: 'User Functions',
      icon: Building,
      count: userFunctions.length,
      color: 'text-purple-600',
    },
    {
      id: 'tender-types' as MasterTab,
      label: 'Tender Types',
      icon: Tag,
      count: tenderTypes.length,
      color: 'text-sky-600',
    },
    {
      id: 'stages' as MasterTab,
      label: 'Tender Stages',
      icon: Layers,
      count: stages.length,
      color: 'text-rose-600',
    },
    {
      id: 'holidays' as MasterTab,
      label: 'Holidays',
      icon: CalendarDays,
      count: slaRules.holidays.length,
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Masters Header & Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center gap-2">
          <span className="p-2 bg-slate-900 text-white rounded-lg shadow-xs">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </span>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Masters</h2>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1 p-2 bg-slate-100/70 border-b border-slate-200 overflow-x-auto text-xs">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Panel */}
      <div>
        {activeTab === 'groups' && (
          <GroupsMasterTab
            groups={groups}
            onUpdateGroups={onUpdateGroups}
            users={users}
            onUpdateUsers={onUpdateUsers}
            tenders={tenders}
            showToast={showToast}
          />
        )}

        {activeTab === 'officers' && (
          <OfficersMasterTab
            users={users}
            onUpdateUsers={onUpdateUsers}
            groups={groups}
            tenders={tenders}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'cec-finance' && (
          <CecFinanceMasterTab
            groups={groups}
            onUpdateGroups={onUpdateGroups}
            users={users}
            onUpdateUsers={onUpdateUsers}
            showToast={showToast}
          />
        )}

        {activeTab === 'user-functions' && (
          <UserFunctionsMasterTab
            userFunctions={userFunctions}
            onUpdateUserFunctions={onUpdateUserFunctions}
            tenders={tenders}
            showToast={showToast}
          />
        )}

        {activeTab === 'tender-types' && (
          <TenderTypesMasterTab
            tenderTypes={tenderTypes}
            onUpdateTenderTypes={onUpdateTenderTypes}
            tenders={tenders}
            showToast={showToast}
          />
        )}

        {activeTab === 'stages' && (
          <TenderStagesMasterTab
            stages={stages}
            onUpdateStages={onUpdateStages}
            tenders={tenders}
            showToast={showToast}
          />
        )}

        {activeTab === 'holidays' && (
          <HolidaysMasterTab slaRules={slaRules} onUpdateSlaRules={onUpdateSlaRules} showToast={showToast} />
        )}
      </div>
    </div>
  );
};
