import React, { useEffect, useState } from 'react';
import { Tender, UserProfile, TenderStage, UserRole } from './types';
import { USERS, setUsers } from './data/seedData';
import { api, API_BASE } from './api/client';
import { formatDateTime, roleName } from './utils/tenderUtils';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { MyQueueView } from './views/MyQueueView';
import { TenderRegisterView } from './views/TenderRegisterView';
import { StageKanbanView } from './views/StageKanbanView';
import { AuditTrailView } from './views/AuditTrailView';
import { ExcelComparisonView } from './views/ExcelComparisonView';
import { TenderDetailModal } from './components/TenderDetailModal';
import { CreateTenderModal } from './components/CreateTenderModal';
import { FeatureWalkthroughModal } from './components/FeatureWalkthroughModal';
import confetti from 'canvas-confetti';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';

// `npm run dev` starts the .NET API alongside Vite; the API needs a few seconds to compile on first
// launch, so keep retrying for a while before reporting it as unreachable.
const API_CONNECT_ATTEMPTS = 40;
const API_CONNECT_RETRY_MS = 1500;

export default function App() {
  const [initialTenders, setInitialTenders] = useState<Tender[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRun, setLoadRun] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (let attempt = 1; attempt <= API_CONNECT_ATTEMPTS && !cancelled; attempt++) {
        try {
          const [users, tenders] = await Promise.all([api.getUsers(), api.getTenders()]);
          if (cancelled) return;
          setUsers(users);
          setInitialTenders(tenders);
          return;
        } catch (err) {
          if (attempt === API_CONNECT_ATTEMPTS && !cancelled) {
            setLoadError(err instanceof Error ? err.message : String(err));
          } else {
            await new Promise((resolve) => setTimeout(resolve, API_CONNECT_RETRY_MS));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadRun]);

  if (initialTenders) {
    return <TenderWorkspace initialTenders={initialTenders} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center font-sans p-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-md w-full text-center">
        {loadError ? (
          <>
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
            <h1 className="text-base font-semibold text-slate-900 mb-1">We couldn’t load your tenders</h1>
            <p className="text-sm text-slate-500 mb-4">
              The server isn’t responding. Wait a moment and try again. If it keeps happening, tell your IT support.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setLoadRun((n) => n + 1);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer"
            >
              Try again
            </button>
            <details className="mt-4 text-left">
              <summary className="text-xs text-slate-400 cursor-pointer">Technical details</summary>
              <p className="text-xs text-slate-500 mt-2">
                No answer from the API at <code className="font-mono text-slate-700">{API_BASE}</code>.
                {import.meta.env.DEV
                  ? ' Start everything with npm run dev and check the terminal for errors.'
                  : ' If this is a hosted copy, check that the API is running and that VITE_API_BASE points at it.'}
              </p>
              <p className="text-xs font-mono text-rose-600 mt-1 wrap-break-word">{loadError}</p>
            </details>
          </>
        ) : (
          <div role="status">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <h1 className="text-base font-semibold text-slate-900 mb-1">Loading your tenders…</h1>
            <p className="text-sm text-slate-500">This takes a few seconds the first time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const NAV_TABS: NavTab[] = [
  'dashboard',
  'my-queue',
  'tenders-register',
  'stage-kanban',
  'audit-trail',
  'excel-comparison',
];

// The page and the open tender live in the URL hash (#my-queue, #tenders-register?tender=10) so that
// refresh, back/forward and shared links all work.
function readHash(): { tab: NavTab; tenderSrNo: number | null } {
  const [page, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const srNo = Number(new URLSearchParams(query).get('tender'));
  return {
    tab: NAV_TABS.includes(page as NavTab) ? (page as NavTab) : 'dashboard',
    tenderSrNo: Number.isInteger(srNo) && srNo > 0 ? srNo : null,
  };
}

function writeHash(tab: NavTab, tenderSrNo: number | null) {
  const next = tenderSrNo ? `#${tab}?tender=${tenderSrNo}` : `#${tab}`;
  if (window.location.hash !== next) window.location.hash = next;
}

function TenderWorkspace({ initialTenders }: { initialTenders: Tender[] }) {
  // Global State
  const [tenders, setTenders] = useState<Tender[]>(initialTenders);
  const [currentUser, setCurrentUser] = useState<UserProfile>(USERS[1] ?? USERS[0]); // Amit Kumar Jha (Lead PM)
  const [activeTab, setActiveTabState] = useState<NavTab>(() => readHash().tab);
  const [selectedSrNo, setSelectedSrNo] = useState<number | null>(() => readHash().tenderSrNo);

  // Derived from the list, so the open tender always reflects the latest saved data
  const selectedTender = tenders.find((t) => t.sr_no === selectedSrNo) ?? null;

  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    setSelectedSrNo(null);
    writeHash(tab, null);
    document.querySelector('main')?.scrollTo({ top: 0 });
  };

  const setSelectedTender = (tender: Tender | null) => {
    setSelectedSrNo(tender?.sr_no ?? null);
    writeHash(activeTab, tender?.sr_no ?? null);
  };

  useEffect(() => {
    const onHashChange = () => {
      const { tab, tenderSrNo } = readHash();
      setActiveTabState(tab);
      setSelectedSrNo(tenderSrNo);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState<boolean>(false);

  const showToast = (msg: string, isError: boolean = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  const showApiError = (action: string, err: unknown) => {
    showToast(`${action} didn’t work: ${err instanceof Error ? err.message : String(err)}`, true);
  };

  // Switch active user persona
  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    showToast(`Now viewing as ${user.name} (${roleName(user.role)})`);
  };

  // Create Tender (the backend assigns a unique sr_no)
  const handleCreateTender = async (newTender: Tender) => {
    let savedTender: Tender;
    try {
      savedTender = await api.createTender(newTender);
    } catch (err) {
      showApiError('Creating the tender', err);
      return;
    }

    setTenders((prev) => [savedTender, ...prev]);
    showToast(`Tender ${savedTender.pr_no} created. It is now with ${savedTender.current_holder}.`);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      // ignore
    }
  };

  // Advance Stage / Hand off tender.
  // Timeline, SLA and award calculations run on the backend (Services/TenderWorkflow.cs).
  const handleAdvanceStage = async (
    tenderId: number,
    nextStage: TenderStage,
    nextHolder: string,
    nextRole: UserRole,
    remarks: string,
    awardedValue?: number,
    savings?: number,
    handoffTimestamp?: string
  ) => {
    let updatedTender: Tender;
    try {
      updatedTender = await api.advanceStage(tenderId, {
        next_stage: nextStage,
        next_holder: nextHolder,
        next_role: nextRole,
        remarks,
        awarded_value: awardedValue,
        savings,
        handoff_timestamp: handoffTimestamp || formatDateTime(new Date()),
      });
    } catch (err) {
      showApiError('Sending the file', err);
      return;
    }

    setTenders((prevTenders) => prevTenders.map((t) => (t.sr_no === tenderId ? updatedTender : t)));

    if (nextStage === 'Awarded') {
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (err) {
        // ignore
      }
      showToast(`Tender ${updatedTender.pr_no} has been awarded.`);
    } else {
      showToast(`Sent to ${nextHolder}. ${updatedTender.pr_no} is now at “${nextStage}”.`);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onSelectUser={handleSwitchUser}
        onOpenCreateTender={() => setIsCreateOpen(true)}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        onOpenComparison={() => setActiveTab('excel-comparison')}
        tenders={tenders}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          tenders={tenders}
          onOpenCreateTender={() => setIsCreateOpen(true)}
          onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        />

        {/* Dynamic Center Stage Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50" id="main">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                tenders={tenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
              />
            )}

            {activeTab === 'my-queue' && (
              <MyQueueView
                currentUser={currentUser}
                tenders={tenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
                onAdvanceStage={handleAdvanceStage}
              />
            )}

            {activeTab === 'tenders-register' && (
              <TenderRegisterView
                tenders={tenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
              />
            )}

            {activeTab === 'stage-kanban' && (
              <StageKanbanView
                tenders={tenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
                onOpenCreateTender={() => setIsCreateOpen(true)}
              />
            )}

            {activeTab === 'audit-trail' && (
              <AuditTrailView
                tenders={tenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
              />
            )}

            {activeTab === 'excel-comparison' && <ExcelComparisonView />}
          </div>
        </main>
      </div>

      {/* Feature Walkthrough Modal */}
      <FeatureWalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsWalkthroughOpen(false);
        }}
      />

      {/* Tender Detail & Stepper Modal */}
      {selectedTender && (
        <TenderDetailModal
          tender={selectedTender}
          currentUser={currentUser}
          onClose={() => setSelectedTender(null)}
          onAdvanceStage={handleAdvanceStage}
        />
      )}

      {/* Create Tender Modal */}
      {isCreateOpen && (
        <CreateTenderModal
          currentUser={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onCreateTender={handleCreateTender}
          nextSrNo={tenders.length > 0 ? Math.max(...tenders.map((t) => t.sr_no)) + 1 : 1}
        />
      )}

      {/* Floating Action Toast */}
      {toastMessage && (
        <div
          role={toastIsError ? 'alert' : 'status'}
          aria-live={toastIsError ? 'assertive' : 'polite'}
          className="fixed bottom-5 right-5 z-60 max-w-md bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-slideUp"
        >
          {toastIsError ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss message"
            className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
