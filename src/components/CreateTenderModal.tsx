import React, { useState, useMemo } from 'react';
import {
  Tender,
  UserProfile,
  TenderType,
  UserFunction,
  TenderStage,
  GroupMasterItem,
  UserFunctionMasterItem,
  TenderTypeMasterItem,
} from '../types';
import { USERS } from '../data/seedData';
import {
  toDateTimeLocalInput,
  formatDateTime,
  DEFAULT_GROUPS,
  DEFAULT_USER_FUNCTIONS,
  DEFAULT_TENDER_TYPES,
  getOfficerGroup,
} from '../utils/tenderUtils';
import {
  PlusCircle,
  X,
  Building2,
  Calendar,
  Clock,
  ArrowLeft,
  Users,
  FileText,
  Hash,
  DollarSign,
  Calculator,
  Briefcase,
  Tag
} from 'lucide-react';

interface CreateTenderModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onCreateTender: (newTender: Tender) => void;
  nextSrNo: number;
  groups?: GroupMasterItem[];
  users?: UserProfile[];
  userFunctions?: UserFunctionMasterItem[];
  tenderTypes?: TenderTypeMasterItem[];
}

export const CreateTenderModal: React.FC<CreateTenderModalProps> = ({
  currentUser,
  onClose,
  onCreateTender,
  nextSrNo,
  groups,
  users,
  userFunctions,
  tenderTypes,
}) => {
  const userList = users && users.length > 0 ? users : USERS;
  const pmList = userList.filter((u) => u.role === 'PM');
  const fmList = userList.filter((u) => u.role === 'FM');
  const cecList = userList.filter((u) => u.role === 'CEC');
  const groupList = groups && groups.length > 0 ? groups : DEFAULT_GROUPS;
  const functionList = userFunctions && userFunctions.length > 0 ? userFunctions : DEFAULT_USER_FUNCTIONS;
  const tenderTypeList = tenderTypes && tenderTypes.length > 0 ? tenderTypes : DEFAULT_TENDER_TYPES;

  // Basic identification & classification
  const [prNo, setPrNo] = useState(`PR${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [crfqNo, setCrfqNo] = useState(`CRFQ10004${Math.floor(10000 + Math.random() * 90000)}`);
  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  });
  const [userFunction, setUserFunction] = useState<UserFunction>(
    functionList[0]?.name || 'E&P-Services'
  );
  const [tenderType, setTenderType] = useState<TenderType>(
    tenderTypeList[0]?.name || 'Open'
  );
  const [priority, setPriority] = useState<'Normal' | 'Medium' | 'High' | 'Critical'>('Normal');

  // Package Description & Scope Details
  const [itemDescription, setItemDescription] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [requisitionerContact, setRequisitionerContact] = useState('');

  // Initial Group Allocation (Anyone can create tender: PM, FM, CEC, ADMIN)
  const initialGroup = useMemo(() => {
    if (currentUser.group && groupList.some((g) => g.name.toLowerCase() === currentUser.group!.toLowerCase())) {
      return currentUser.group;
    }
    return groupList[0]?.name || 'Group 1';
  }, [currentUser, groupList]);

  const [assignedGroup, setAssignedGroup] = useState<string>(initialGroup);

  // Helper to extract master officers for a group
  const getGroupMasterOfficers = (groupName: string) => {
    const grp = groupList.find((g) => g.name.toLowerCase() === groupName.toLowerCase()) || groupList[0];

    // Master PMs
    const masterPms =
      grp?.officerNames && grp.officerNames.length > 0
        ? grp.officerNames
        : grp?.leaderNames && grp.leaderNames.length > 0
        ? grp.leaderNames
        : pmList.filter((p) => p.group === grp?.name).map((p) => p.name);

    // Master FMs
    const masterFms =
      grp?.financeOfficerNames && grp.financeOfficerNames.length > 0
        ? grp.financeOfficerNames
        : fmList.filter((f) => (f.assignedGroups || []).includes(grp?.name) || f.group === grp?.name).map((f) => f.name);

    // Master CECs
    const masterCecs =
      grp?.estimateOfficerNames && grp.estimateOfficerNames.length > 0
        ? grp.estimateOfficerNames
        : cecList.filter((c) => (c.assignedGroups || []).includes(grp?.name) || c.group === grp?.name).map((c) => c.name);

    return { masterPms, masterFms, masterCecs };
  };

  // Primary PM, FM, CEC states (Auto-derived from group masters, but editable)
  const [pmOfficer, setPmOfficer] = useState<string>(() => {
    if (currentUser.role === 'PM') return currentUser.name;
    const { masterPms } = getGroupMasterOfficers(initialGroup);
    return masterPms[0] || pmList[0]?.name || 'Amit Kumar Jha';
  });

  const [attachedFm, setAttachedFm] = useState<string>(() => {
    if (currentUser.role === 'FM') return currentUser.name;
    const { masterFms } = getGroupMasterOfficers(initialGroup);
    return masterFms[0] || fmList[0]?.name || 'Rajesh J';
  });

  const [attachedCec, setAttachedCec] = useState<string>(() => {
    if (currentUser.role === 'CEC') return currentUser.name;
    const { masterCecs } = getGroupMasterOfficers(initialGroup);
    return masterCecs[0] || cecList[0]?.name || 'Meera Iyer';
  });

  // When group changes, auto-populate PM, FM, CEC from group masters
  const handleGroupChange = (newGroupName: string) => {
    setAssignedGroup(newGroupName);
    const { masterPms, masterFms, masterCecs } = getGroupMasterOfficers(newGroupName);

    if (currentUser.role === 'PM' && masterPms.includes(currentUser.name)) {
      setPmOfficer(currentUser.name);
    } else if (masterPms.length > 0) {
      setPmOfficer(masterPms[0]);
    } else if (pmList.length > 0) {
      setPmOfficer(pmList[0].name);
    }

    if (currentUser.role === 'FM' && masterFms.includes(currentUser.name)) {
      setAttachedFm(currentUser.name);
    } else if (masterFms.length > 0) {
      setAttachedFm(masterFms[0]);
    } else if (fmList.length > 0) {
      setAttachedFm(fmList[0].name);
    }

    if (currentUser.role === 'CEC' && masterCecs.includes(currentUser.name)) {
      setAttachedCec(currentUser.name);
    } else if (masterCecs.length > 0) {
      setAttachedCec(masterCecs[0]);
    } else if (cecList.length > 0) {
      setAttachedCec(cecList[0].name);
    }
  };

  // Workflow Stages & Timelines
  const [initialStage, setInitialStage] = useState<TenderStage>('PR Received');
  const [datePrInitialIndent, setDatePrInitialIndent] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  // Receipt of Actionable PR Date & Time is NON-COMPULSORY (optional)
  const [initiationDateTime, setInitiationDateTime] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  // Helper to regenerate reference numbers
  const generateNewPrNo = () => {
    setPrNo(`PR${Math.floor(10000000 + Math.random() * 90000000)}`);
  };
  const generateNewCrfqNo = () => {
    setCrfqNo(`CRFQ10004${Math.floor(10000 + Math.random() * 90000)}`);
  };

  const currentGroupOfficers = useMemo(() => {
    return getGroupMasterOfficers(assignedGroup);
  }, [assignedGroup, groupList, pmList, fmList, cecList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemDescription.trim()) {
      alert('Item description is required.');
      return;
    }

    const formattedDate = initiationDateTime ? formatDateTime(initiationDateTime) : formatDateTime(new Date());

    const initialRemarkText = remarks.trim()
      ? remarks.trim()
      : 'Newly initiated tender. Estimate amount will be entered by CEC when sent for estimation.';

    const newTender: Tender = {
      sr_no: nextSrNo,
      pr_no: prNo.trim() || `PR${Math.floor(10000000 + Math.random() * 90000000)}`,
      crfq_no: crfqNo.trim() || '',
      date_pr_initial_indent: datePrInitialIndent || formattedDate.split(' ')[0],
      receipt_actionable_pr: initiationDateTime ? formattedDate : '',
      tender_sent_tech_eval: '',
      receipt_tech_eval: '',
      item_description: itemDescription.trim(),
      user_function: userFunction,
      date_receipt_estimate_cec: '',
      pm_officer: pmOfficer,
      created_by: currentUser.name,
      creator_role: currentUser.role,
      attached_pms: [],
      delivery_location: deliveryLocation.trim() || undefined,
      requisitioner_contact: requisitionerContact.trim() || undefined,
      bqc_eval_signed_on: '',
      emd_eval_signed_on: '',
      techno_comm_signed_on: '',
      cashflow_stmt_signed_on: '',
      tender_type: tenderType,
      tender_floated_on: '',
      tender_opened_due_on: '',
      estimate_value_cr: null, // Estimate option NOT present at creation; added only by CEC when sent for estimate
      brief_status: initialStage,
      awarded_value_cr: null,
      tec_proposed_on: '',
      tec_approval_date: '',
      tender_register_updated: 'NO',
      aoc_completed: 'NO',
      contract_ola_created: 'NO',
      sla_days: 0,
      savings_due_to_negotiation_cr: null,
      time_taken_approving_committee_days: null,
      month_year: monthYear,
      remarks: initialRemarkText,
      attached_fms: [attachedFm],
      attached_cec_officers: [attachedCec],
      current_holder: pmOfficer,
      current_role: 'PM',
      priority: priority,
      group: assignedGroup,
      days_by_role: { PM: 0, FM: 0, CEC: 0 },
      timeline: [
        {
          stage: initialStage,
          role: 'PM',
          holder: pmOfficer,
          entry_date: formattedDate,
          exit_date: null,
          days_spent: null,
          remarks: initialRemarkText,
        },
      ],
    };

    onCreateTender(newTender);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col w-full h-full overflow-hidden animate-fadeIn text-slate-800">
      <div className="bg-white w-full flex flex-col h-full overflow-hidden">
        {/* Full-Page Top Header Bar */}
        <div className="px-4 sm:px-8 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back</span>
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {prNo}
                </span>
                {crfqNo && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200">
                    {crfqNo}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  {assignedGroup}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                New Tender
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Tender</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Full Screen Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60">
          <div className="max-w-[1400px] w-full mx-auto space-y-6 pb-28">
            {/* Creator */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded bg-white font-semibold text-blue-700 border border-blue-200">
                  Creator: {currentUser.name} ({currentUser.role})
                </span>
              </div>
            </div>

            {/* SECTION 1: IDENTIFICATION & TENDER CLASSIFICATION */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Identification & Classification
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* PR No */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">PR No / Email Reference *</label>
                    <button
                      type="button"
                      onClick={generateNewPrNo}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={prNo}
                    onChange={(e) => setPrNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* CRFQ No */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">CRFQ No</label>
                    <button
                      type="button"
                      onClick={generateNewCrfqNo}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={crfqNo}
                    onChange={(e) => setCrfqNo(e.target.value)}
                    placeholder="e.g. CRFQ100045290"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* User Function */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Function *</label>
                  <select
                    value={userFunction}
                    onChange={(e) => setUserFunction(e.target.value as UserFunction)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    {functionList.map((uf) => (
                      <option key={uf.id} value={uf.name}>
                        {uf.name} {uf.department ? `(${uf.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tender Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tender Type *</label>
                  <select
                    value={tenderType}
                    onChange={(e) => setTenderType(e.target.value as TenderType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    {tenderTypeList.map((tt) => (
                      <option key={tt.id} value={tt.name}>
                        {tt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: PACKAGE / ITEM DESCRIPTION & SCOPE */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Description & Scope
                  </h2>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Item Description *
                    </label>
                  </div>
                  <textarea
                    required
                    rows={3}
                    placeholder="Description, scope, specifications"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-y"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Delivery Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bargarh Plant, Odisha"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Requisitioner Contact
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. S. Sen, ext 4291"
                      value={requisitionerContact}
                      onChange={(e) => setRequisitionerContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: MULTI-PILLAR TEAM ALLOCATION & WORKFLOW INITIATION */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Team & Workflow
                  </h2>
                </div>
              </div>

              {/* Departmental Group Selection (Drives Master Officer Defaults) */}
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-purple-900 text-xs">
                      Group *
                    </label>
                  </div>
                  <div className="min-w-[200px]">
                    <select
                      value={assignedGroup}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-bold focus:outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
                    >
                      {groupList.map((grp) => (
                        <option key={grp.id} value={grp.name}>
                          {grp.name} ({grp.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Only 3 Team Allocations: Primary PM, FM, CEC Manager */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* 1. Primary Procurement Officer (PM) */}
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span>Procurement Manager *</span>
                    </span>
                  </div>
                  <select
                    value={pmOfficer}
                    onChange={(e) => setPmOfficer(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {currentGroupOfficers.masterPms.length > 0 && (
                      <optgroup label={assignedGroup}>
                        {pmList
                          .filter((p) => currentGroupOfficers.masterPms.includes(p.name))
                          .map((pm) => (
                            <option key={pm.id} value={pm.name}>
                              {pm.name} ({pm.designation})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <optgroup label="Others">
                      {pmList
                        .filter((p) => !currentGroupOfficers.masterPms.includes(p.name))
                        .map((pm) => (
                          <option key={pm.id} value={pm.name}>
                            {pm.name} ({pm.designation})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* 2. Finance Manager (FM) */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Finance Manager *</span>
                    </span>
                  </div>
                  <select
                    value={attachedFm}
                    onChange={(e) => setAttachedFm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {currentGroupOfficers.masterFms.length > 0 && (
                      <optgroup label={assignedGroup}>
                        {fmList
                          .filter((f) => currentGroupOfficers.masterFms.includes(f.name))
                          .map((fm) => (
                            <option key={fm.id} value={fm.name}>
                              {fm.name} ({fm.designation})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <optgroup label="Others">
                      {fmList
                        .filter((f) => !currentGroupOfficers.masterFms.includes(f.name))
                        .map((fm) => (
                          <option key={fm.id} value={fm.name}>
                            {fm.name} ({fm.designation})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* 3. CEC / Estimation Officer */}
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-amber-600" />
                      <span>Estimation Officer *</span>
                    </span>
                  </div>
                  <select
                    value={attachedCec}
                    onChange={(e) => setAttachedCec(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {currentGroupOfficers.masterCecs.length > 0 && (
                      <optgroup label={assignedGroup}>
                        {cecList
                          .filter((c) => currentGroupOfficers.masterCecs.includes(c.name))
                          .map((cec) => (
                            <option key={cec.id} value={cec.name}>
                              {cec.name} ({cec.designation})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <optgroup label="Others">
                      {cecList
                        .filter((c) => !currentGroupOfficers.masterCecs.includes(c.name))
                        .map((cec) => (
                          <option key={cec.id} value={cec.name}>
                            {cec.name} ({cec.designation})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Workflow Initiation Parameters (Non-Compulsory Dates) */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Initial Stage */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Stage
                  </label>
                  <select
                    value={initialStage}
                    onChange={(e) => setInitialStage(e.target.value as TenderStage)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="PR Received">PR Received</option>
                    <option value="Under Estimation">Under Estimation</option>
                    <option value="BQC approval">BQC approval</option>
                    <option value="To be Floated">To be Floated</option>
                  </select>
                </div>

                {/* Date of PR Initial Indent */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of PR Initial Indent
                  </label>
                  <input
                    type="date"
                    value={datePrInitialIndent}
                    onChange={(e) => setDatePrInitialIndent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  />
                </div>

                {/* Receipt of Actionable PR Date & Time (NON-COMPULSORY) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Receipt of Actionable PR</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={initiationDateTime}
                    onChange={(e) => setInitiationDateTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-[11px] focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Initial Remarks / Notes */}
              <div className="pt-2 text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Budget sanctioned in CAPEX plan"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Control Strip */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 text-xs text-slate-600 truncate max-w-2xl">
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {prNo}
              </span>
              <span className="truncate">
                {itemDescription ? itemDescription : '—'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-purple-700">{assignedGroup}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">PM: {pmOfficer}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">FM: {attachedFm}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">CEC: {attachedCec}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Tender</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
