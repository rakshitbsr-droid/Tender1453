import React, { useState } from 'react';
import { Tender, UserProfile, TenderType, UserFunction } from '../types';
import { USERS } from '../data/seedData';
import { toDateTimeLocalInput, formatDateTime, parseCustomDate } from '../utils/tenderUtils';
import { PlusCircle, X } from 'lucide-react';
import { Button, Field, ModalShell, inputClass } from './ui';

interface CreateTenderModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onCreateTender: (newTender: Tender) => void;
  nextSrNo: number;
}

const USER_FUNCTIONS: UserFunction[] = [
  'E&P-Services',
  'E&P-Bargarh',
  'Brand',
  'RE',
  'SOR',
  'HSSE',
  'Alpha Services',
  'Beta Operations',
  'Gamma Retail',
  'Delta Logistics',
  'Epsilon Safety',
  'Zeta Digital',
];

const TENDER_TYPES: Array<{ value: TenderType; label: string }> = [
  { value: 'Open', label: 'Open' },
  { value: 'Limited', label: 'Limited' },
  { value: 'Single', label: 'Single' },
  { value: 'QCBS', label: 'QCBS (quality and cost based)' },
  { value: 'OEM', label: 'OEM' },
  { value: 'SOR', label: 'SOR' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CreateTenderModal: React.FC<CreateTenderModalProps> = ({ currentUser, onClose, onCreateTender, nextSrNo }) => {
  const pmList = USERS.filter((u) => u.role === 'PM');
  const fmList = USERS.filter((u) => u.role === 'FM');
  const cecList = USERS.filter((u) => u.role === 'CEC');

  const [prNo, setPrNo] = useState(`PR${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [crfqNo, setCrfqNo] = useState(`CRFQ10004${Math.floor(10000 + Math.random() * 90000)}`);
  const [itemDescription, setItemDescription] = useState('');
  const [userFunction, setUserFunction] = useState<UserFunction>('E&P-Services');
  const [tenderType, setTenderType] = useState<TenderType>('Open');
  const [estimateValueCr, setEstimateValueCr] = useState<string>('');
  const [receivedAt, setReceivedAt] = useState<string>(() => toDateTimeLocalInput(new Date()));
  const [pmOfficer, setPmOfficer] = useState<string>(currentUser.role === 'PM' ? currentUser.name : pmList[0]?.name || '');
  const [attachedPm, setAttachedPm] = useState<string>('');
  const [attachedFm1, setAttachedFm1] = useState<string>(fmList[0]?.name || '');
  const [attachedFm2, setAttachedFm2] = useState<string>('');
  const [attachedCec, setAttachedCec] = useState<string>(cecList[0]?.name || '');
  const [priority, setPriority] = useState<'Normal' | 'Medium' | 'High'>('Normal');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<{ description?: string; estimate?: string; prNo?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!prNo.trim()) next.prNo = 'Enter the PR number.';
    if (!itemDescription.trim()) next.description = 'Describe what is being procured.';
    const estVal = parseFloat(estimateValueCr);
    if (!estimateValueCr.trim()) next.estimate = 'Enter the estimated value.';
    else if (isNaN(estVal) || estVal <= 0) next.estimate = 'Enter a number greater than zero.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const attachedFms = [attachedFm1].filter(Boolean);
    if (attachedFm2 && attachedFm2 !== attachedFm1) attachedFms.push(attachedFm2);
    const attachedPms = attachedPm && attachedPm !== pmOfficer ? [attachedPm] : [];

    const formattedDate = formatDateTime(receivedAt);
    const received = parseCustomDate(receivedAt) ?? new Date();
    const monthYear = `${MONTHS[received.getMonth()]}-${String(received.getFullYear()).slice(-2)}`;

    onCreateTender({
      sr_no: nextSrNo,
      pr_no: prNo.trim(),
      crfq_no: crfqNo.trim(),
      date_pr_initial_indent: formattedDate,
      receipt_actionable_pr: formattedDate,
      tender_sent_tech_eval: '',
      receipt_tech_eval: '',
      item_description: itemDescription.trim(),
      user_function: userFunction,
      date_receipt_estimate_cec: '',
      pm_officer: pmOfficer,
      attached_pms: attachedPms,
      tender_type: tenderType,
      tender_floated_on: '',
      tender_opened_due_on: '',
      estimate_value_cr: estVal,
      brief_status: 'PR Received',
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
      remarks: remarks.trim() || 'New tender.',
      attached_fms: attachedFms,
      attached_cec_officers: attachedCec ? [attachedCec] : [],
      current_holder: pmOfficer,
      current_role: 'PM',
      priority,
      days_by_role: { PM: 0, FM: 0, CEC: 0 },
      timeline: [
        {
          stage: 'PR Received',
          role: 'PM',
          holder: pmOfficer,
          entry_date: formattedDate,
          exit_date: null,
          days_spent: null,
          remarks: 'PR received and tender created.',
        },
      ],
    });
    onClose();
  };

  return (
    <ModalShell onClose={onClose} labelledBy="create-tender-title" size="lg">
      <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
        <div>
          <h2 id="create-tender-title" className="text-lg font-semibold text-slate-900">
            New tender
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">It starts at “PR Received” with the procurement manager you choose.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PR number" htmlFor="pr-no" required error={errors.prNo}>
              <input id="pr-no" type="text" value={prNo} onChange={(e) => setPrNo(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="CRFQ number" htmlFor="crfq-no" hint="Optional. Leave blank if there isn’t one yet.">
              <input id="crfq-no" type="text" value={crfqNo} onChange={(e) => setCrfqNo(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
          </div>

          <Field label="What is being procured" htmlFor="description" required error={errors.description}>
            <textarea
              id="description"
              rows={2}
              placeholder="e.g. Supply, installation and commissioning of 50 MVA power transformers"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Requesting department" htmlFor="user-function" required>
              <select id="user-function" value={userFunction} onChange={(e) => setUserFunction(e.target.value as UserFunction)} className={`${inputClass} cursor-pointer`}>
                {USER_FUNCTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tender type" htmlFor="tender-type" required>
              <select id="tender-type" value={tenderType} onChange={(e) => setTenderType(e.target.value as TenderType)} className={`${inputClass} cursor-pointer`}>
                {TENDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated value (₹ crore)" htmlFor="estimate" required error={errors.estimate}>
              <input
                id="estimate"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 24.50"
                value={estimateValueCr}
                onChange={(e) => setEstimateValueCr(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="PR received on" htmlFor="received-at" required hint="Working days are counted from this moment.">
              <input id="received-at" type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <fieldset className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <legend className="text-sm font-semibold text-slate-900 px-1">Team</legend>
            <p className="text-xs text-slate-500 mb-3">Who will work on this tender. The second procurement and finance managers are optional.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Procurement manager" htmlFor="pm">
                <select id="pm" value={pmOfficer} onChange={(e) => setPmOfficer(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  {pmList.map((pm) => (
                    <option key={pm.id} value={pm.name}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Second procurement manager" htmlFor="pm2">
                <select id="pm2" value={attachedPm} onChange={(e) => setAttachedPm(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">None</option>
                  {pmList
                    .filter((pm) => pm.name !== pmOfficer)
                    .map((pm) => (
                      <option key={pm.id} value={pm.name}>
                        {pm.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Finance manager" htmlFor="fm">
                <select id="fm" value={attachedFm1} onChange={(e) => setAttachedFm1(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  {fmList.map((fm) => (
                    <option key={fm.id} value={fm.name}>
                      {fm.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Second finance manager" htmlFor="fm2">
                <select id="fm2" value={attachedFm2} onChange={(e) => setAttachedFm2(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">None</option>
                  {fmList
                    .filter((fm) => fm.name !== attachedFm1)
                    .map((fm) => (
                      <option key={fm.id} value={fm.name}>
                        {fm.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Estimation officer" htmlFor="cec">
                <select id="cec" value={attachedCec} onChange={(e) => setAttachedCec(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  {cecList.map((cec) => (
                    <option key={cec.id} value={cec.name}>
                      {cec.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority" htmlFor="priority">
                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as 'Normal' | 'Medium' | 'High')} className={`${inputClass} cursor-pointer`}>
                  <option value="Normal">Normal</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High (fast track)</option>
                </select>
              </Field>
            </div>
          </fieldset>

          <Field label="Notes" htmlFor="remarks" hint="Optional. Anything the team should know up front.">
            <input id="remarks" type="text" placeholder="e.g. Budget sanctioned in the FY25 capex plan" value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={PlusCircle}>
            Create tender
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};
