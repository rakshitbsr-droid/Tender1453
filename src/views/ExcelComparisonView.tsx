import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Users,
  Lock,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';

export const ExcelComparisonView: React.FC = () => {
  const comparisons = [
    {
      feature: 'Concurrent Multi-Pillar Collaboration',
      excel: 'File locking errors, overwrites, fragmented sheet versions emailed across departments.',
      platform: 'Real-time multi-user state with concurrent assignment of multiple PMs, FMs, and CEC officers.',
      impact: 'Eliminates 100% of spreadsheet sync conflicts',
    },
    {
      feature: 'Accountability & File Movement Audit Log',
      excel: 'No audit log. Impossible to know when a file moved from PM to FM or how long an officer held it.',
      platform: 'Automated timestamped ledger recording exact duration (days spent), handoff notes, and possession history.',
      impact: 'Total transparency & zero blame game across pillars',
    },
    {
      feature: 'Turnaround & Delay Tracking',
      excel: 'Manual calculation of dates; delays only discovered after tenders exceed deadlines.',
      platform: 'Instant automated stage duration tracking, cycle benchmarks, and delay escalation.',
      impact: '35% reduction in tender cycle turnaround time',
    },
    {
      feature: 'Role-Based Action Queues',
      excel: 'Every officer scrolls through 500+ rows to find their tenders; high cognitive load.',
      platform: 'Personalized "My Action Queue" showing exactly which files require their immediate approval today.',
      impact: 'Officers focus strictly on their actionable workload',
    },
    {
      feature: 'Executive Visibility & KPI Dashboards',
      excel: 'Takes days to compile PowerPoint presentations for CPO leadership reviews.',
      platform: 'Live interactive analytics: pipeline funnels, negotiated savings, workload distribution, and monthly trajectories.',
      impact: 'Real-time strategic decision making for CPO',
    },
    {
      feature: 'Compliance & Statutory Governance',
      excel: 'Checklist boxes (Tender Register, AOC, Contract/OLA) frequently left blank or unvalidated.',
      platform: 'Enforced workflow state machine where stage gates require mandatory compliance validation.',
      impact: '100% statutory & audit compliance readiness',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Pitch Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 rounded-xl shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Why move off the spreadsheet</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            From an Excel tracker to a shared tender workflow
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
            Transitioning our procurement operations into a digital workflow platform eliminates version friction, delivers granular file turnaround auditability between Procurement, Finance, and Estimation, and compresses tender cycle times by over 30%.
          </p>
        </div>
      </div>

      {/* 4 Core Value Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-3">
            <Clock className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">35% Faster Cycles</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Automated handoffs and bottleneck notifications remove idle wait time between PM, FM, and CEC.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">100% Audit Traceability</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Immutable time ledger tracking every officer handoff, committee sanction, and document clearance.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-3">
            <Users className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Multi-Pillar Synergy</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Seamless concurrent check by multiple Procurement Managers and Finance Managers simultaneously.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Real-time CPO Analytics</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Instant executive dashboards tracking Rs Cr pipeline value, negotiated savings, and officer workloads.
          </p>
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Side by side
            </h3>
            <p className="text-xs text-slate-500">
              What changes for the people doing the work
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <th className="py-3 px-4 font-bold w-1/4">Task</th>
                <th className="py-3 px-4 font-bold w-1/3 text-rose-700">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Excel tracker</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-bold w-1/3 text-emerald-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>This app</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {comparisons.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div>{item.feature}</div>
                    <div className="text-xs text-blue-700 font-bold mt-0.5">{item.impact}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 bg-rose-50/40 leading-relaxed border-x border-slate-100">
                    {item.excel}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 bg-emerald-50/30 font-medium leading-relaxed">
                    {item.platform}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
