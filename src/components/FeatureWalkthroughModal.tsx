import React, { useState } from 'react';
import { NavTab } from './Sidebar';
import {
  LayoutDashboard,
  Inbox,
  TableProperties,
  KanbanSquare,
  History,
  FileSpreadsheet,
  Users,
  Send,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  HelpCircle,
  Play
} from 'lucide-react';

interface FeatureWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

interface WalkthroughStep {
  id: string;
  tabTarget?: NavTab;
  title: string;
  category: string;
  badge: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  summary: string;
  keyHighlights: string[];
  executiveValue: string;
  presentationTalkingPoint: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'dashboard',
    tabTarget: 'dashboard',
    title: 'Executive Dashboard & Real-Time KPIs',
    category: 'Executive Oversight',
    badge: 'Analytics & Funnels',
    icon: LayoutDashboard,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
    summary:
      'Provides the Chief Procurement Officer and executive team an instantaneous high-level overview of the entire procurement portfolio, active tender stages, financial pipeline, and SLA performance.',
    keyHighlights: [
      'Portfolio Value at a Glance: Live total sanctioned estimates (₹7,900+ Cr) and active in-process tenders.',
      '9-Stage Conversion Funnel: Real-time visual count of files in PR, Estimation, BQC, Bidding, TEC, and Negotiation.',
      'User Function Breakdown: Volume distribution across E&P Services, Bargarh, Mumbai, and other business units.',
      'High Priority Watchlist: Instant alert cards for critical CAPEX tenders requiring urgent executive attention.'
    ],
    executiveValue:
      'Eliminates weekly status compilation meetings and manual reporting overhead with real-time portfolio metrics.',
    presentationTalkingPoint:
      'Leadership can see the full ₹7,900+ Cr pipeline live without waiting for manual Excel consolidation or email roundups.'
  },
  {
    id: 'my-queue',
    tabTarget: 'my-queue',
    title: 'My Action Queue (Personalized Multi-Pillar Inbox)',
    category: 'Day-to-Day Operations',
    badge: 'Actionable Inbox',
    icon: Inbox,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
    summary:
      'Every officer (Procurement Manager, Finance Manager, or Estimation Officer) gets a dedicated inbox showing exactly which files are sitting with them, how long they have been pending, and instant 1-click action buttons.',
    keyHighlights: [
      'Zero Lost Files: Officers see only tenders requiring their review, eliminating email clutter and lost attachments.',
      'Primary Officer Accountability: Displays strictly tenders where you are the Primary Officer (Primary PM, Lead FM, or Lead CEC), eliminating clutter from secondary co-assignments.',
      'Turnaround Timers: Live counters calculate days in inbox against institutional SLA standards.',
      'Role Switcher in Header: Effortlessly switch personas between PM, FM, CEC, and Admin to test cross-functional workflows.'
    ],
    executiveValue:
      'Ensures clear personal accountability for every day a tender is in process.',
    presentationTalkingPoint:
      'No officer can ever claim they didn’t receive the file; the system clearly shows who holds the pen right now.'
  },
  {
    id: 'multi-pillar',
    tabTarget: 'stage-kanban',
    title: 'Cross-Pillar Collaboration (PM + FM + CEC)',
    category: 'Workflow & Governance',
    badge: 'Three-Pillar Sync',
    icon: Users,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
    summary:
      'Seamlessly connects the three core pillars of enterprise procurement: Procurement Group (PM), Finance Group (FM), and Cost Estimation Cell (CEC) into a single unified digital trail.',
    keyHighlights: [
      'Multi-Officer Handoffs: Forward files directly to Finance Managers for concurrence, CEC for benchmarking, or PM for tender floating.',
      'Manual Date & Time Selection: Flexible timestamping with instant SLA duration preview when simulating and logging transitions in prototype demos.',
      'Assigned Team Quick-Pick: One-click buttons to pick the tender’s designated Primary PM, Co-PM, Lead FM, or CEC officer.',
      'Pillar Filter Directory: Easily search and filter officers by Procurement (PM), Finance (FM), or Estimation (CEC).',
      'Dual-Directional Flow: Send files forward to the next stage or route backward for technical/financial clarifications with attached remarks.'
    ],
    executiveValue:
      'Breaks down organizational silos between Procurement, Finance, and Estimation cells.',
    presentationTalkingPoint:
      'Files move smoothly between PM, FM, and CEC with automated timestamps and structured instructions on each handover.'
  },
  {
    id: 'stage-kanban',
    tabTarget: 'stage-kanban',
    title: '9-Stage Visual Pipeline & State Machine',
    category: 'Process Management',
    badge: 'Stage Progression',
    icon: KanbanSquare,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50 border-indigo-200',
    summary:
      'A visual board mapping all tenders across the standard 9 CPO procurement stages, with color-coded stage cards, priority tags, and quick-access inspection modals.',
    keyHighlights: [
      'Complete 9 Stages: 1. PR Received → 2. Under Estimation → 3. BQC Prep → 4. To be Floated → 5. Bidding → 6. Tech Evaluation → 7. Award TEC → 8. Negotiation → 9. Terminal Award.',
      'Interactive Inspection: Click any card to launch the comprehensive Tender Detail modal with stepper and audit log.',
      'Terminal Status Tracking: Distinguishes between successful Awarded contracts and Alternate Discussion/Cancelled routes.',
      'Visual Capacity Load: Instantly spot bottlenecks where too many tenders are clustering in a single stage.'
    ],
    executiveValue:
      'Standardizes the procurement lifecycle across all user functions and departments.',
    presentationTalkingPoint:
      'Visualizes the entire pipeline in an intuitive Kanban board so management can spot congestion at a glance.'
  },
  {
    id: 'tenders-register',
    tabTarget: 'tenders-register',
    title: 'Master Tender Register (25+ Field Grid)',
    category: 'Data Repository',
    badge: 'Full Register',
    icon: TableProperties,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
    summary:
      'The single source of truth containing all 25+ critical columns from the original enterprise Excel sheet, equipped with multi-column filtering, global search, and instant Excel export.',
    keyHighlights: [
      'Comprehensive Data Fields: PR No, CRFQ No, Estimate Value, Stage, Current Holder, PM Officer, User Function, Dates, and Remarks.',
      'Multi-Pillar Team Columns: Shows attached PMs, Lead FM, and CEC officers in dedicated badge chips.',
      'Instant Search & Filter: Filter by User Function, Stage, Priority, or value bracket with zero lag.',
      'One-Click Excel Export: Export clean, standardized Excel/CSV records anytime for statutory audits or board meetings.'
    ],
    executiveValue:
      'Eliminates multiple diverging spreadsheet copies and ensures everyone works on the identical live register.',
    presentationTalkingPoint:
      'Replaces the messy 25-column Excel register with a fast, searchable, and exportable digital database.'
  },
  {
    id: 'audit-trail',
    tabTarget: 'audit-trail',
    title: 'Immutable Audit Trail & Timeline Ledger',
    category: 'Governance & Auditing',
    badge: 'Statutory Compliance',
    icon: History,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50 border-violet-200',
    summary:
      'Maintains an automatic, tamper-evident digital history of every file movement, stage transition, officer handoff, date timestamp, and remark.',
    keyHighlights: [
      'Complete Chronological Ledger: Exact entry dates, exit dates, and days spent for every handover.',
      'Accountability Logging: Records who transferred the file to whom, the reason, and accompanying notes.',
      'Audit Readiness: Meets all public procurement statutory audit requirements without manual paper trail assembly.',
      'Filterable by Tender & Officer: Instantly search history for any PR No, PM, FM, or Estimation officer.'
    ],
    executiveValue:
      'Guarantees 100% audit compliance and protects officers with transparent institutional documentation.',
    presentationTalkingPoint:
      'Every single file movement is logged with timestamps and remarks, creating a permanent audit trail for vigilance.'
  },
  {
    id: 'excel-comparison',
    tabTarget: 'excel-comparison',
    title: 'Why Replace Excel? (Executive Business Case)',
    category: 'Business Case & ROI',
    badge: 'CPO Pitch Deck',
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
    summary:
      'A structured executive presentation module detailing the financial, operational, and governance advantages of moving from decentralized spreadsheets to this portal.',
    keyHighlights: [
      'Side-by-Side Comparison: Direct matrix comparing Excel pain points vs. CPO Portal solutions across 7 dimensions.',
      'Quantified Business Impact: 35% cycle time reduction, ₹45+ Cr faster project commissioning, 0% lost files.',
      'Vigilance & Risk Mitigation: Elimination of unverified edits, broken formulas, and version fragmentation.',
      'Executive Summary Presentation: Perfect for pitching to the Board of Directors and Management Committee.'
    ],
    executiveValue:
      'Provides a compelling, data-backed ROI case for complete digital transformation.',
    presentationTalkingPoint:
      'Clear, quantified comparison showing why the organization must transition from offline Excel sheets to this portal.'
  }
];

export const FeatureWalkthroughModal: React.FC<FeatureWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = WALKTHROUGH_STEPS[currentStepIndex];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIndex < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleNavigateToFeature = (tab?: NavTab) => {
    if (tab) {
      onNavigateTab(tab);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn select-none">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl text-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  CPO Procurement Portal — Guided Feature Walkthrough
                </h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Step {currentStepIndex + 1} of {WALKTHROUGH_STEPS.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Complete overview of portal capabilities, multi-pillar workflows, and executive business value
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Close Walkthrough"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Step Navigation Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-thin">
          {WALKTHROUGH_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isCurrent = idx === currentStepIndex;
            const isPassed = idx < currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                    : isPassed
                    ? 'bg-slate-200/80 text-slate-700 hover:bg-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{step.title.split('(')[0].split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Center Main Stage Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Main Title & Hero Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${currentStep.iconBg} ${currentStep.iconColor}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold  text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {currentStep.category}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    • {currentStep.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{currentStep.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                  {currentStep.summary}
                </p>
              </div>
            </div>

            {currentStep.tabTarget && (
              <button
                onClick={() => handleNavigateToFeature(currentStep.tabTarget)}
                className="self-start px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open This View</span>
              </button>
            )}
          </div>

          {/* Key Feature Highlights */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Core Capabilities & Features
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentStep.keyHighlights.map((highlight, i) => {
                const [title, desc] = highlight.includes(':')
                  ? highlight.split(':')
                  : [null, highlight];
                return (
                  <div
                    key={i}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                        {i + 1}
                      </span>
                      <div className="text-xs leading-relaxed">
                        {title ? (
                          <>
                            <strong className="text-slate-900 font-semibold">{title}:</strong>
                            <span className="text-slate-600 ml-1">{desc}</span>
                          </>
                        ) : (
                          <span className="text-slate-700">{desc}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Value & Presentation Talking Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Executive Impact */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <div className="text-xs font-medium text-emerald-800 mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Institutional Value & ROI
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                {currentStep.executiveValue}
              </p>
            </div>

            {/* Presentation Talking Point */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl">
              <div className="text-xs font-bold text-indigo-800  mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Executive Presentation Cue
              </div>
              <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                &ldquo;{currentStep.presentationTalkingPoint}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex(0)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Restart Tour
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">
              Use <strong className="text-slate-700">Next</strong> or click any tab above
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                currentStepIndex === 0
                  ? 'border-slate-200 text-slate-300 bg-slate-100 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {currentStepIndex === WALKTHROUGH_STEPS.length - 1
                  ? 'Finish Walkthrough'
                  : 'Next Feature'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
