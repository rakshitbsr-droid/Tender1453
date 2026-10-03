import React, { useMemo, useState } from 'react';
import { PublicHolidayItem, SlaMasterRules } from '../../types';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';

interface HolidaysMasterTabProps {
  slaRules: SlaMasterRules;
  onUpdateSlaRules: (newRules: SlaMasterRules) => void;
  showToast: (msg: string) => void;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 'YYYY-MM-DD' -> local date, so the weekday is right in every time zone
function toLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatHolidayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

export const HolidaysMasterTab: React.FC<HolidaysMasterTabProps> = ({ slaRules, onUpdateSlaRules, showToast }) => {
  const holidays: PublicHolidayItem[] = slaRules.holidays || [];
  const years = useMemo(
    () => Array.from(new Set<string>(holidays.map((h) => h.date.slice(0, 4)))).sort((a, b) => b.localeCompare(a)),
    [holidays]
  );
  const currentYear = String(new Date().getFullYear());

  const [yearFilter, setYearFilter] = useState<string>(years.includes(currentYear) ? currentYear : 'ALL');
  const [formDate, setFormDate] = useState('');
  const [formName, setFormName] = useState('');

  const visibleHolidays = useMemo(
    () =>
      holidays
        .filter((h) => yearFilter === 'ALL' || h.date.startsWith(yearFilter))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [holidays, yearFilter]
  );

  const saveHolidays = (next: PublicHolidayItem[]) => onUpdateSlaRules({ ...slaRules, holidays: next });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!formDate || !name) return;
    if (holidays.some((h) => h.date === formDate)) {
      alert(`${formatHolidayDate(formDate)} is already a holiday.`);
      return;
    }
    saveHolidays([...holidays, { date: formDate, name }]);
    showToast(`Holiday "${name}" added`);
    setYearFilter(formDate.slice(0, 4));
    setFormDate('');
    setFormName('');
  };

  const handleDelete = (holiday: PublicHolidayItem) => {
    saveHolidays(holidays.filter((h) => h.date !== holiday.date));
    showToast(`Holiday "${holiday.name}" deleted`);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <span>Holidays</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {holidays.length}
          </span>
        </h3>

        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Year"
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            aria-label="Date"
            required
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Holiday name"
            required
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Holiday</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleHolidays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center font-semibold text-slate-600">
                    No holidays
                  </td>
                </tr>
              ) : (
                visibleHolidays.map((holiday) => (
                  <tr key={holiday.date} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{formatHolidayDate(holiday.date)}</td>
                    <td className="py-3 px-4 text-slate-600">{WEEKDAYS[toLocalDate(holiday.date).getDay()]}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{holiday.name}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(holiday)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
