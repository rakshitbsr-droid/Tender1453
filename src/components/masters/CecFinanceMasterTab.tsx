import React, { useState, useMemo } from 'react';
import { GroupMasterItem, UserProfile } from '../../types';
import {
  Building2,
  DollarSign,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Users
} from 'lucide-react';
import { getRoleBadge } from '../../utils/tenderUtils';

interface CecFinanceMasterTabProps {
  groups: GroupMasterItem[];
  onUpdateGroups: (newGroups: GroupMasterItem[]) => void;
  users: UserProfile[];
  onUpdateUsers: (newUsers: UserProfile[]) => void;
  showToast: (msg: string) => void;
}

export const CecFinanceMasterTab: React.FC<CecFinanceMasterTabProps> = ({
  groups,
  onUpdateGroups,
  users,
  onUpdateUsers,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'by-officer' | 'by-group'>('by-group');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [officerSearch, setOfficerSearch] = useState('');

  // Extract Procurement groups vs Finance / CEC groups
  const procurementGroups = useMemo(() => {
    return groups.filter((g) => g.type === 'Procurement' || g.type === 'General');
  }, [groups]);

  const financeOfficers = useMemo(() => {
    return users.filter((u) => u.role === 'FM');
  }, [users]);

  const cecOfficers = useMemo(() => {
    return users.filter((u) => u.role === 'CEC');
  }, [users]);

  // Toggle attachment of an officer (FM or CEC) to a specific group
  const handleToggleOfficerGroup = (officer: UserProfile, groupName: string) => {
    const isCurrentlyAssigned = (officer.assignedGroups || []).includes(groupName);

    // 1. Update User assignedGroups
    const updatedAssigned = isCurrentlyAssigned
      ? (officer.assignedGroups || []).filter((g) => g !== groupName)
      : [...(officer.assignedGroups || []), groupName];

    const updatedUsers = users.map((u) =>
      u.id === officer.id ? { ...u, assignedGroups: updatedAssigned } : u
    );
    onUpdateUsers(updatedUsers);

    // 2. Update Group financeOfficerNames or estimateOfficerNames
    const updatedGroups = groups.map((g) => {
      if (g.name !== groupName) return g;

      if (officer.role === 'FM') {
        const currentFms = g.financeOfficerNames || [];
        const newFms = isCurrentlyAssigned
          ? currentFms.filter((name) => name.toLowerCase() !== officer.name.toLowerCase())
          : [...currentFms, officer.name];
        return { ...g, financeOfficerNames: Array.from(new Set(newFms)) };
      } else if (officer.role === 'CEC') {
        const currentCecs = g.estimateOfficerNames || [];
        const newCecs = isCurrentlyAssigned
          ? currentCecs.filter((name) => name.toLowerCase() !== officer.name.toLowerCase())
          : [...currentCecs, officer.name];
        return { ...g, estimateOfficerNames: Array.from(new Set(newCecs)) };
      }
      return g;
    });

    onUpdateGroups(updatedGroups);

    showToast(
      isCurrentlyAssigned
        ? `Detached ${officer.name} (${officer.role}) from ${groupName}`
        : `Attached ${officer.name} (${officer.role}) to ${groupName}`
    );
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
              <DollarSign className="w-5 h-5" />
            </span>
            <span className="p-2 bg-amber-600 text-white rounded-lg shadow-xs">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                CEC & Finance Groups
              </h3>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('by-group')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeSubTab === 'by-group'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Group
          </button>
          <button
            onClick={() => setActiveSubTab('by-officer')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeSubTab === 'by-officer'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Officer
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: BY GROUP (Shows all groups and all attached Finance & CEC officers) */}
      {activeSubTab === 'by-group' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {procurementGroups.map((grp) => {
              // Find attached Finance officers from group.financeOfficerNames or user.assignedGroups
              const attachedFmList = financeOfficers.filter((fm) => {
                const inGroupArr = (grp.financeOfficerNames || []).some(
                  (n) => n.toLowerCase() === fm.name.toLowerCase()
                );
                const inOfficerArr = (fm.assignedGroups || []).includes(grp.name);
                return inGroupArr || inOfficerArr;
              });

              // Find attached CEC officers from group.estimateOfficerNames or user.assignedGroups
              const attachedCecList = cecOfficers.filter((cec) => {
                const inGroupArr = (grp.estimateOfficerNames || []).some(
                  (n) => n.toLowerCase() === cec.name.toLowerCase()
                );
                const inOfficerArr = (cec.assignedGroups || []).includes(grp.name);
                return inGroupArr || inOfficerArr;
              });

              return (
                <div
                  key={grp.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Group Title & Leader */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>{grp.name}</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Lead: <strong>{grp.leaderName}</strong>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {grp.type}
                      </span>
                    </div>

                    {/* Finance Officers in this group */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Finance Officers ({attachedFmList.length})</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
                        {attachedFmList.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        ) : (
                          attachedFmList.map((fm) => (
                            <span
                              key={fm.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-emerald-900 border border-emerald-200 text-[11px] font-medium shadow-2xs"
                            >
                              <span>{fm.name}</span>
                              <button
                                onClick={() => handleToggleOfficerGroup(fm, grp.name)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                title="Detach FM"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* CEC / Estimate Officers in this group */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-800 flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5" />
                          <span>CEC Officers ({attachedCecList.length})</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-amber-50/50 rounded-lg border border-amber-100">
                        {attachedCecList.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        ) : (
                          attachedCecList.map((cec) => (
                            <span
                              key={cec.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-amber-900 border border-amber-200 text-[11px] font-medium shadow-2xs"
                            >
                              <span>{cec.name}</span>
                              <button
                                onClick={() => handleToggleOfficerGroup(cec, grp.name)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                title="Detach CEC"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Attach Dropdown */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 font-medium">Attach:</span>
                    <div className="flex items-center gap-1.5">
                      <select
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const target = users.find((u) => u.id === e.target.value);
                          if (target) handleToggleOfficerGroup(target, grp.name);
                          e.target.value = '';
                        }}
                        className="bg-slate-50 hover:bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select officer
                        </option>
                        <optgroup label="Finance Officers">
                          {financeOfficers.map((fm) => (
                            <option key={fm.id} value={fm.id}>
                              {fm.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="CEC Officers">
                          {cecOfficers.map((cec) => (
                            <option key={cec.id} value={cec.id}>
                              {cec.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BY OFFICER (Shows every FM & CEC and checkboxes for each group) */}
      {activeSubTab === 'by-officer' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Finance & CEC Officers</span>
            </h4>
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search officer"
                value={officerSearch}
                onChange={(e) => setOfficerSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Name & Role</th>
                  <th className="py-3 px-4">Designation</th>
                  {procurementGroups.map((g) => (
                    <th key={g.id} className="py-3 px-3 text-center">
                      {g.name}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">Total Groups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...financeOfficers, ...cecOfficers]
                  .filter((o) =>
                    !officerSearch.trim() ||
                    o.name.toLowerCase().includes(officerSearch.toLowerCase()) ||
                    o.designation.toLowerCase().includes(officerSearch.toLowerCase())
                  )
                  .map((officer) => {
                    const assignedList = officer.assignedGroups || (officer.group ? [officer.group] : []);

                    return (
                      <tr key={officer.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{officer.name}</span>
                            {(() => {
                              const b = getRoleBadge(officer.role);
                              return (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${b.bg} ${b.text} ${b.border}`}
                                >
                                  {b.label}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {officer.designation}
                        </td>
                        {procurementGroups.map((grp) => {
                          const isAttached = assignedList.includes(grp.name);
                          return (
                            <td key={grp.id} className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleOfficerGroup(officer, grp.name)}
                                className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer ${
                                  isAttached
                                    ? officer.role === 'FM'
                                      ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                      : 'bg-amber-600 text-white shadow-2xs hover:bg-amber-700'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-600'
                                }`}
                                title={`${isAttached ? 'Attached' : 'Attach'} to ${grp.name}`}
                              >
                                {isAttached ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '+'}
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px]">
                            {assignedList.length}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
