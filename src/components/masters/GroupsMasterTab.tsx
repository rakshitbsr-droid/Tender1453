import React, { useState, useMemo } from 'react';
import { GroupMasterItem, GroupType, UserProfile, Tender } from '../../types';
import {
  Building2,
  Users,
  Crown,
  DollarSign,
  Calculator,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  X,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { getRoleBadge } from '../../utils/tenderUtils';

interface GroupsMasterTabProps {
  groups: GroupMasterItem[];
  onUpdateGroups: (newGroups: GroupMasterItem[]) => void;
  users: UserProfile[];
  onUpdateUsers: (newUsers: UserProfile[]) => void;
  tenders: Tender[];
  showToast: (msg: string) => void;
}

export const GroupsMasterTab: React.FC<GroupsMasterTabProps> = ({
  groups,
  onUpdateGroups,
  users,
  onUpdateUsers,
  tenders,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<GroupType>('Procurement');
  const [formDescription, setFormDescription] = useState('');
  const [formLeaderNames, setFormLeaderNames] = useState<string[]>([]);
  const [formOfficerNames, setFormOfficerNames] = useState<string[]>([]);
  const [formFinanceOfficerNames, setFormFinanceOfficerNames] = useState<string[]>([]);
  const [formEstimateOfficerNames, setFormEstimateOfficerNames] = useState<string[]>([]);

  // Tenders count per group
  const groupTenderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tenders.forEach((t) => {
      const g = t.group || 'Group 1';
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [tenders]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchName = g.name.toLowerCase().includes(term);
      const matchType = g.type.toLowerCase().includes(term);
      const matchDesc = (g.description || '').toLowerCase().includes(term);
      const matchLeader = (g.leaderName || '').toLowerCase().includes(term);
      const matchOfficers = (g.officerNames || []).some((o) => o.toLowerCase().includes(term));
      const matchFm = (g.financeOfficerNames || []).some((f) => f.toLowerCase().includes(term));
      const matchCec = (g.estimateOfficerNames || []).some((c) => c.toLowerCase().includes(term));
      return matchName || matchType || matchDesc || matchLeader || matchOfficers || matchFm || matchCec;
    });
  }, [groups, searchTerm]);

  // Lists of users by role for multi-select dropdowns
  const pmUsers = useMemo(() => users.filter((u) => u.role === 'PM'), [users]);
  const fmUsers = useMemo(() => users.filter((u) => u.role === 'FM'), [users]);
  const cecUsers = useMemo(() => users.filter((u) => u.role === 'CEC'), [users]);

  const handleOpenAddModal = () => {
    setEditingGroupId(null);
    setFormName('');
    setFormType('Procurement');
    setFormDescription('');
    setFormLeaderNames([]);
    setFormOfficerNames([]);
    setFormFinanceOfficerNames([]);
    setFormEstimateOfficerNames([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (group: GroupMasterItem) => {
    setEditingGroupId(group.id);
    setFormName(group.name);
    setFormType(group.type);
    setFormDescription(group.description || '');

    // Leaders
    const leaders = group.leaderNames && group.leaderNames.length > 0
      ? group.leaderNames
      : group.leaderName ? [group.leaderName] : [];
    setFormLeaderNames(leaders);

    // Officers (PM)
    const officers = group.officerNames && group.officerNames.length > 0
      ? group.officerNames
      : users.filter((u) => u.role === 'PM' && u.group === group.name).map((u) => u.name);
    setFormOfficerNames(officers);

    // Finance Officers (multiple)
    const fms = group.financeOfficerNames && group.financeOfficerNames.length > 0
      ? group.financeOfficerNames
      : users.filter((u) => u.role === 'FM' && ((u.assignedGroups || []).includes(group.name) || u.group === group.name)).map((u) => u.name);
    setFormFinanceOfficerNames(fms);

    // Estimate Officers (multiple)
    const cecs = group.estimateOfficerNames && group.estimateOfficerNames.length > 0
      ? group.estimateOfficerNames
      : users.filter((u) => u.role === 'CEC' && ((u.assignedGroups || []).includes(group.name) || u.group === group.name)).map((u) => u.name);
    setFormEstimateOfficerNames(cecs);

    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const trimmedName = formName.trim();
    const primaryLeader = formLeaderNames[0] || 'Unassigned';

    if (editingGroupId) {
      const oldGroup = groups.find((g) => g.id === editingGroupId);
      const oldName = oldGroup?.name || '';

      const updated = groups.map((g) =>
        g.id === editingGroupId
          ? {
              ...g,
              name: trimmedName,
              type: formType,
              leaderName: primaryLeader,
              leaderNames: formLeaderNames,
              officerNames: formOfficerNames,
              financeOfficerNames: formFinanceOfficerNames,
              estimateOfficerNames: formEstimateOfficerNames,
              description: formDescription.trim() || undefined,
            }
          : g
      );
      onUpdateGroups(updated);

      // If group name changed, update users' group references
      if (oldName && oldName !== trimmedName) {
        const updatedUsers = users.map((u) => {
          let updatedPrimary = u.group;
          if (u.group === oldName) updatedPrimary = trimmedName;

          let updatedAssigned = u.assignedGroups || [];
          if (updatedAssigned.includes(oldName)) {
            updatedAssigned = updatedAssigned.map((g) => (g === oldName ? trimmedName : g));
          }
          return { ...u, group: updatedPrimary, assignedGroups: updatedAssigned };
        });
        onUpdateUsers(updatedUsers);
      }

      showToast(`Group "${trimmedName}" updated`);
    } else {
      const newGroup: GroupMasterItem = {
        id: `grp-${Date.now()}`,
        name: trimmedName,
        type: formType,
        leaderName: primaryLeader,
        leaderNames: formLeaderNames,
        officerNames: formOfficerNames,
        financeOfficerNames: formFinanceOfficerNames,
        estimateOfficerNames: formEstimateOfficerNames,
        description: formDescription.trim() || undefined,
      };
      onUpdateGroups([...groups, newGroup]);
      showToast(`Group "${trimmedName}" created`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const target = groups.find((g) => g.id === id);
    if (!target) return;

    const count = groupTenderCounts[target.name] || 0;
    if (count > 0) {
      alert(`Cannot delete "${target.name}": ${count} tender(s) attached.`);
      setDeleteConfirmId(null);
      return;
    }

    onUpdateGroups(groups.filter((g) => g.id !== id));
    showToast(`Group "${target.name}" deleted`);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Groups</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {groups.length}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search groups or officers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Group</span>
          </button>
        </div>
      </div>

      {/* Groups Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No groups</p>
          </div>
        ) : (
          filteredGroups.map((grp) => {
            const tenderCount = groupTenderCounts[grp.name] || 0;
            const leaders = grp.leaderNames && grp.leaderNames.length > 0
              ? grp.leaderNames
              : grp.leaderName ? [grp.leaderName] : [];
            const officers = grp.officerNames && grp.officerNames.length > 0
              ? grp.officerNames
              : users.filter((u) => u.role === 'PM' && u.group === grp.name).map((u) => u.name);
            const fms = grp.financeOfficerNames && grp.financeOfficerNames.length > 0
              ? grp.financeOfficerNames
              : users.filter((u) => u.role === 'FM' && ((u.assignedGroups || []).includes(grp.name) || u.group === grp.name)).map((u) => u.name);
            const cecs = grp.estimateOfficerNames && grp.estimateOfficerNames.length > 0
              ? grp.estimateOfficerNames
              : users.filter((u) => u.role === 'CEC' && ((u.assignedGroups || []).includes(grp.name) || u.group === grp.name)).map((u) => u.name);

            return (
              <div
                key={grp.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{grp.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            grp.type === 'Finance'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : grp.type === 'Estimation'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {grp.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {grp.description || '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(grp)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Edit Group"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(grp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 4 Membership Categories */}
                  <div className="mt-3 space-y-2.5 text-xs">
                    {/* 1. Group Leaders */}
                    <div>
                      <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1 mb-1">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span>Group Leaders ({leaders.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {leaders.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        ) : (
                          leaders.map((lead) => (
                            <span
                              key={lead}
                              className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px]"
                            >
                              {lead}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 2. Procurement Officers */}
                    <div>
                      <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1 mb-1">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                        <span>Procurement Officers ({officers.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {officers.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        ) : (
                          officers.map((off) => (
                            <span
                              key={off}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-100 text-[11px]"
                            >
                              {off}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 3. Finance Officers (Multiple) */}
                    <div>
                      <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Finance Officers ({fms.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {fms.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        ) : (
                          fms.map((fm) => (
                            <span
                              key={fm}
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px]"
                            >
                              {fm}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 4. Estimate Officers (Multiple) */}
                    <div>
                      <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1 mb-1">
                        <Calculator className="w-3.5 h-3.5 text-amber-600" />
                        <span>CEC Officers ({cecs.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cecs.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        ) : (
                          cecs.map((cec) => (
                            <span
                              key={cec}
                              className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px]"
                            >
                              {cec}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Count */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {officers.length + fms.length + cecs.length} members
                  </span>
                  <span className="font-semibold text-slate-700">
                    {tenderCount} {tenderCount === 1 ? 'tender' : 'tenders'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp my-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{editingGroupId ? 'Edit Group' : 'Add Group'}</span>
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Editable Group Name */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Group Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Group 7"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Group Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as GroupType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Procurement">Procurement</option>
                    <option value="Finance">Finance</option>
                    <option value="Estimation">Estimation</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Refining units, equipment packages"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* 1. Attaching Group Leaders */}
              <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1.5">
                <label className="font-bold text-amber-900 block flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Group Leaders</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pt-1">
                  {users
                    .filter((u) => u.role === 'PM' || u.role === 'ADMIN')
                    .map((u) => {
                      const isSelected = formLeaderNames.includes(u.name);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                            isSelected
                              ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setFormLeaderNames((prev) =>
                                prev.includes(u.name)
                                  ? prev.filter((n) => n !== u.name)
                                  : [...prev, u.name]
                              );
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="truncate">{u.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* 2. Attaching Procurement Officers */}
              <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-1.5">
                <label className="font-bold text-blue-900 block flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  <span>Procurement Officers</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pt-1">
                  {pmUsers.map((u) => {
                    const isSelected = formOfficerNames.includes(u.name);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-blue-100 border-blue-300 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setFormOfficerNames((prev) =>
                              prev.includes(u.name)
                                ? prev.filter((n) => n !== u.name)
                                : [...prev, u.name]
                            );
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Attaching Finance Officers (Multiple allowed) */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-1.5">
                <label className="font-bold text-emerald-900 block flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Finance Officers</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pt-1">
                  {fmUsers.map((u) => {
                    const isSelected = formFinanceOfficerNames.includes(u.name);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setFormFinanceOfficerNames((prev) =>
                              prev.includes(u.name)
                                ? prev.filter((n) => n !== u.name)
                                : [...prev, u.name]
                            );
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate">{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Attaching Estimate Officers (Multiple allowed) */}
              <div className="p-3 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-1.5">
                <label className="font-bold text-amber-900 block flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-600" />
                  <span>CEC Officers</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pt-1">
                  {cecUsers.map((u) => {
                    const isSelected = formEstimateOfficerNames.includes(u.name);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setFormEstimateOfficerNames((prev) =>
                              prev.includes(u.name)
                                ? prev.filter((n) => n !== u.name)
                                : [...prev, u.name]
                            );
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="truncate">{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingGroupId ? 'Save' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Group?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This permanently deletes the group.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
