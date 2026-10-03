import React, { useState, useMemo } from 'react';
import { UserProfile, UserRole, GroupMasterItem, VisibilityScope, Tender } from '../../types';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  X,
  ShieldCheck,
  Crown,
  Building2,
  Filter,
  Eye,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { getRoleBadge } from '../../utils/tenderUtils';

interface OfficersMasterTabProps {
  users: UserProfile[];
  onUpdateUsers: (newUsers: UserProfile[]) => void;
  groups: GroupMasterItem[];
  tenders: Tender[];
  currentUser: UserProfile;
  showToast: (msg: string) => void;
}

export const OfficersMasterTab: React.FC<OfficersMasterTabProps> = ({
  users,
  onUpdateUsers,
  groups,
  tenders,
  currentUser,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [groupFilter, setGroupFilter] = useState<'ALL' | string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | VisibilityScope>('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editingOfficerId, setEditingOfficerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('PM');
  const [formDesignation, setFormDesignation] = useState('Procurement Manager');
  const [formEmail, setFormEmail] = useState('');
  const [formPrimaryGroup, setFormPrimaryGroup] = useState<string>(groups[0]?.name || 'Group 1');
  const [formAssignedGroups, setFormAssignedGroups] = useState<string[]>([groups[0]?.name || 'Group 1']);
  const [formIsLeader, setFormIsLeader] = useState(false);
  const [formVisibilityScope, setFormVisibilityScope] = useState<VisibilityScope>('RELATED');
  const [formCanEditMasters, setFormCanEditMasters] = useState(false);

  // Filter officers
  const filteredOfficers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      // Group filter
      if (groupFilter !== 'ALL') {
        const inPrimary = u.group?.toLowerCase() === groupFilter.toLowerCase();
        const inAssigned = (u.assignedGroups || []).some(
          (g) => g.toLowerCase() === groupFilter.toLowerCase()
        );
        if (!inPrimary && !inAssigned) return false;
      }

      // Visibility filter
      if (visibilityFilter !== 'ALL' && u.visibilityScope !== visibilityFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(term);
        const matchesDesig = u.designation.toLowerCase().includes(term);
        const matchesEmail = u.email.toLowerCase().includes(term);
        const matchesGroup = (u.group || '').toLowerCase().includes(term);
        if (!matchesName && !matchesDesig && !matchesEmail && !matchesGroup) return false;
      }

      return true;
    });
  }, [users, roleFilter, groupFilter, visibilityFilter, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingOfficerId(null);
    setFormName('');
    setFormRole('PM');
    setFormDesignation('Procurement Manager');
    setFormEmail('');
    const defaultGroup = groups[0]?.name || 'Group 1';
    setFormPrimaryGroup(defaultGroup);
    setFormAssignedGroups([defaultGroup]);
    setFormIsLeader(false);
    setFormVisibilityScope('RELATED');
    setFormCanEditMasters(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (officer: UserProfile) => {
    setEditingOfficerId(officer.id);
    setFormName(officer.name);
    setFormRole(officer.role);
    setFormDesignation(officer.designation);
    setFormEmail(officer.email);
    setFormPrimaryGroup(officer.group || groups[0]?.name || 'Group 1');
    const existingAssigned = officer.assignedGroups && officer.assignedGroups.length > 0
      ? officer.assignedGroups
      : officer.group ? [officer.group] : [groups[0]?.name || 'Group 1'];
    setFormAssignedGroups(existingAssigned);
    setFormIsLeader(!!officer.isGroupLeader);
    setFormVisibilityScope(officer.visibilityScope || 'RELATED');
    setFormCanEditMasters(!!officer.canEditMasters);
    setShowModal(true);
  };

  const toggleAssignedGroup = (groupName: string) => {
    setFormAssignedGroups((prev) => {
      if (prev.includes(groupName)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter((g) => g !== groupName);
      } else {
        return [...prev, groupName];
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    // Pick avatar color based on role
    const avatarColor =
      formRole === 'PM'
        ? 'bg-blue-600'
        : formRole === 'FM'
        ? 'bg-emerald-600'
        : formRole === 'CEC'
        ? 'bg-amber-600'
        : 'bg-indigo-600';

    const pillarName =
      formRole === 'PM'
        ? `Procurement Group (${formPrimaryGroup})`
        : formRole === 'FM'
        ? 'Finance Group (CPO Concurrence)'
        : formRole === 'CEC'
        ? 'Central Estimation Cell (CEC)'
        : 'Management & Oversight';

    if (editingOfficerId) {
      const updated = users.map((u) =>
        u.id === editingOfficerId
          ? {
              ...u,
              name: formName.trim(),
              role: formRole,
              designation: formDesignation.trim(),
              email: formEmail.trim(),
              group: formPrimaryGroup,
              assignedGroups: formAssignedGroups,
              pillar: pillarName,
              avatarColor,
              isGroupLeader: formIsLeader,
              visibilityScope: formVisibilityScope,
              canEditMasters: formCanEditMasters,
            }
          : u
      );
      onUpdateUsers(updated);
      showToast(`Officer "${formName.trim()}" updated`);
    } else {
      const newOfficer: UserProfile = {
        id: `user-${Date.now()}`,
        name: formName.trim(),
        role: formRole,
        designation: formDesignation.trim(),
        email: formEmail.trim(),
        group: formPrimaryGroup,
        assignedGroups: formAssignedGroups,
        pillar: pillarName,
        avatarColor,
        isGroupLeader: formIsLeader,
        visibilityScope: formVisibilityScope,
        canEditMasters: formCanEditMasters,
      };
      onUpdateUsers([...users, newOfficer]);
      showToast(`Officer "${formName.trim()}" added`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;

    if (target.id === currentUser.id) {
      alert('You cannot delete your own profile.');
      setDeleteConfirmId(null);
      return;
    }

    onUpdateUsers(users.filter((u) => u.id !== id));
    showToast(`Officer "${target.name}" removed`);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Officers</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {users.length}
              </span>
            </h3>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Officer</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, email, designation"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-500">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="PM">PM</option>
              <option value="FM">FM</option>
              <option value="CEC">CEC</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-500">Group:</span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-500">Scope:</span>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Scopes</option>
              <option value="RELATED">RELATED</option>
              <option value="GROUP">GROUP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Officers Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Name & Role</th>
                <th className="py-3 px-4">Designation & Email</th>
                <th className="py-3 px-4">Groups</th>
                <th className="py-3 px-4 text-center">Leadership & Permissions</th>
                <th className="py-3 px-4 text-center">Visibility Scope</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No officers</p>
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((officer) => {
                  const assigned = officer.assignedGroups && officer.assignedGroups.length > 0
                    ? officer.assignedGroups
                    : officer.group ? [officer.group] : ['Unassigned'];

                  return (
                    <tr key={officer.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[11px] shrink-0 ${
                              officer.avatarColor || 'bg-slate-600'
                            }`}
                          >
                            {officer.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{officer.name}</span>
                              {officer.isGroupLeader && (
                                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" title="Group Leader" />
                              )}
                            </div>
                            <div className="mt-0.5">
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
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-medium">{officer.designation}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{officer.email}</div>
                      </td>

                      {/* Attached Groups (supports multiple for CEC, Finance, and PM) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {assigned.map((g) => (
                            <span
                              key={g}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                g.includes('Finance')
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : g.includes('Estimation')
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {officer.isGroupLeader && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Leader
                            </span>
                          )}
                          {officer.canEditMasters ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Master Admin</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Standard User</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            officer.visibilityScope === 'ALL'
                              ? 'bg-purple-100 text-purple-800'
                              : officer.visibilityScope === 'GROUP'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {officer.visibilityScope || 'RELATED'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(officer)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Officer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(officer.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Officer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-scaleUp my-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{editingOfficerId ? 'Edit Officer' : 'Create Officer'}</span>
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setFormRole(newRole);
                      if (newRole === 'PM') setFormDesignation('Procurement Manager');
                      if (newRole === 'FM') setFormDesignation('Finance Manager');
                      if (newRole === 'CEC') setFormDesignation('Estimation Officer');
                      if (newRole === 'ADMIN') setFormDesignation('Executive Officer');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="PM">PM</option>
                    <option value="FM">FM</option>
                    <option value="CEC">CEC</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Procurement Manager"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul.sharma@enterprise.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Primary Group */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Primary Group
                </label>
                <select
                  value={formPrimaryGroup}
                  onChange={(e) => {
                    const newPrimary = e.target.value;
                    setFormPrimaryGroup(newPrimary);
                    if (!formAssignedGroups.includes(newPrimary)) {
                      setFormAssignedGroups((prev) => [...prev, newPrimary]);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name} ({g.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multiple Group Attachment Checklist (Addresses Requirement 2 & 3) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 block text-xs">
                    Groups
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formAssignedGroups.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto">
                  {groups.map((g) => {
                    const isChecked = formAssignedGroups.includes(g.name);
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAssignedGroup(g.name)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Scope & Permissions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Visibility Scope
                  </label>
                  <select
                    value={formVisibilityScope}
                    onChange={(e) => setFormVisibilityScope(e.target.value as VisibilityScope)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="RELATED">RELATED (assigned tenders)</option>
                    <option value="GROUP">GROUP (group tenders)</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={formIsLeader}
                      onChange={(e) => setFormIsLeader(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-slate-700">Group Leader</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCanEditMasters}
                      onChange={(e) => setFormCanEditMasters(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-700">Can Edit Masters</span>
                  </label>
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
                  disabled={!formName.trim() || !formEmail.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingOfficerId ? 'Save' : 'Create Officer'}
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
                <h4 className="text-sm font-bold text-slate-900">Delete Officer?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This permanently removes the officer.
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
