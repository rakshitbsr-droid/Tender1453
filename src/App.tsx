import React, { useEffect, useMemo, useState } from 'react';
import {
  Tender,
  UserProfile,
  TenderStage,
  UserRole,
  StageMasterItem,
  SlaMasterRules,
  GroupMasterItem,
  EntityLeadershipSettings,
  UserTask,
  UserFunctionMasterItem,
  TenderTypeMasterItem,
} from './types';
import { USERS, setUsers, INITIAL_USER_TASKS } from './data/seedData';
import { api, API_BASE, AppSettings } from './api/client';
import {
  calculateElapsedDays,
  calculateElapsedHours,
  formatDateTime,
  DEFAULT_STAGE_MASTERS,
  DEFAULT_SLA_RULES,
  DEFAULT_GROUPS,
  DEFAULT_USER_FUNCTIONS,
  DEFAULT_TENDER_TYPES,
  DEFAULT_LEADERSHIP_SETTINGS,
  getVisibleTenders,
  getAuditVisibleTenders,
  normalizeTender,
  setActiveSlaRules,
} from './utils/tenderUtils';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { MyQueueView } from './views/MyQueueView';
import { TenderRegisterView } from './views/TenderRegisterView';
import { StageKanbanView } from './views/StageKanbanView';
import { AuditTrailView } from './views/AuditTrailView';
import { MastersView } from './views/MastersView';
import { AssistantView, ChatMessage } from './views/AssistantView';
import { AssistantData } from './assistant/types';
import { TenderDetailModal } from './components/TenderDetailModal';
import { CreateTenderModal } from './components/CreateTenderModal';
import confetti from 'canvas-confetti';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';

// `npm run dev` starts the .NET API alongside Vite; the API needs a few seconds to compile on first
// launch, so in development keep retrying for a while before reporting it as unreachable. A hosted
// build talks to an API that is either there or not, so it gives up quickly and says so.
const API_CONNECT_ATTEMPTS = import.meta.env.DEV ? 40 : 4;
const API_CONNECT_RETRY_MS = 1500;
const API_ADDRESS_MISSING = !import.meta.env.DEV && !import.meta.env.VITE_API_BASE;

interface LoadedData {
  tenders: Tender[];
  settings: Partial<AppSettings>;
}

export default function App() {
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRun, setLoadRun] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (API_ADDRESS_MISSING) {
        setLoadError('This hosted copy has no API address: VITE_API_BASE is not set.');
        return;
      }
      for (let attempt = 1; attempt <= API_CONNECT_ATTEMPTS && !cancelled; attempt++) {
        try {
          const [users, tenders, settings] = await Promise.all([api.getUsers(), api.getTenders(), api.getSettings()]);
          if (cancelled) return;
          setUsers(users);
          // Day counts depend on the holiday list, so the rules go in before any tender is measured
          setActiveSlaRules(settings.slaRules ?? DEFAULT_SLA_RULES);
          setLoaded({ tenders: tenders.map(normalizeTender), settings });
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

  if (loaded) {
    return <TenderWorkspace initialTenders={loaded.tenders} initialSettings={loaded.settings} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center font-sans p-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-md w-full text-center">
        {loadError ? (
          <>
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
            <h1 className="text-base font-semibold text-slate-900 mb-1">We couldn’t load your tenders</h1>
            <p className="text-sm text-slate-500 mb-4">
              {API_ADDRESS_MISSING
                ? 'This site is not connected to an API yet. The person who set it up needs to add the API address.'
                : 'The server isn’t responding. Wait a moment and try again.'}
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
                  : ' Check that the API is running and that VITE_API_BASE points at it.'}
              </p>
              <p className="text-xs font-mono text-rose-600 mt-1 wrap-break-word">{loadError}</p>
            </details>
          </>
        ) : (
          <div role="status">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <h1 className="text-base font-semibold text-slate-900">Loading…</h1>
          </div>
        )}
      </div>
    </div>
  );
}

const NAV_TABS: NavTab[] = ['dashboard', 'assistant', 'my-queue', 'tenders-register', 'stage-kanban', 'audit-trail', 'masters'];

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

function TenderWorkspace({
  initialTenders,
  initialSettings,
}: {
  initialTenders: Tender[];
  initialSettings: Partial<AppSettings>;
}) {
  // Global State
  const [tenders, setTenders] = useState<Tender[]>(initialTenders);
  const [currentUser, setCurrentUser] = useState<UserProfile>(USERS[1] ?? USERS[0]); // Amit Kumar Jha (Lead PM)
  const [activeTab, setActiveTabState] = useState<NavTab>(() => readHash().tab);
  const [selectedSrNo, setSelectedSrNo] = useState<number | null>(() => readHash().tenderSrNo);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false); // the sidebar as a drawer on narrow screens
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState<boolean>(false);

  // Masters Configuration State
  const [stages, setStages] = useState<StageMasterItem[]>(initialSettings.stages ?? DEFAULT_STAGE_MASTERS);
  const [masterUsers, setMasterUsers] = useState<UserProfile[]>(() => [...USERS]);
  const [slaRules, setSlaRules] = useState<SlaMasterRules>(initialSettings.slaRules ?? DEFAULT_SLA_RULES);
  const [groups, setGroups] = useState<GroupMasterItem[]>(initialSettings.groups ?? DEFAULT_GROUPS);
  const [userFunctions, setUserFunctions] = useState<UserFunctionMasterItem[]>(
    initialSettings.userFunctions ?? DEFAULT_USER_FUNCTIONS
  );
  const [tenderTypes, setTenderTypes] = useState<TenderTypeMasterItem[]>(
    initialSettings.tenderTypes ?? DEFAULT_TENDER_TYPES
  );
  const [leadershipSettings, setLeadershipSettings] = useState<EntityLeadershipSettings>(
    initialSettings.leadershipSettings ?? DEFAULT_LEADERSHIP_SETTINGS
  );

  // Microsoft Tasks State
  const [tasks, setTasks] = useState<UserTask[]>(initialSettings.tasks ?? INITIAL_USER_TASKS);

  // Assistant conversation (kept while moving between pages, cleared when the user changes)
  const [chat, setChat] = useState<ChatMessage[]>([]);

  // Filter tenders visible to current user based on RBAC & Group Architecture
  const visibleTenders = useMemo(() => {
    return getVisibleTenders(tenders, currentUser, leadershipSettings, groups, masterUsers);
  }, [tenders, currentUser, leadershipSettings, groups, masterUsers]);

  // File movements (Timeline & Audit): an officer sees only his own tenders, head level sees all
  const auditTenders = useMemo(() => {
    return getAuditVisibleTenders(visibleTenders, currentUser, leadershipSettings, groups, masterUsers);
  }, [visibleTenders, currentUser, leadershipSettings, groups, masterUsers]);

  // What the assistant may read: the same tenders and movements this user sees elsewhere
  const assistantData: AssistantData = useMemo(
    () => ({
      tenders: visibleTenders,
      auditTenders,
      currentUser,
      users: masterUsers,
      groups,
      slaRules,
      leadership: leadershipSettings,
      tasks,
    }),
    [visibleTenders, auditTenders, currentUser, masterUsers, groups, slaRules, leadershipSettings, tasks]
  );

  // Derived from the list, so the open tender always reflects the latest saved data
  const selectedTender = visibleTenders.find((t) => t.sr_no === selectedSrNo) ?? null;

  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    setSelectedSrNo(null);
    setIsNavOpen(false);
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

  const showToast = (msg: string, isError: boolean = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  const showApiError = (action: string, err: unknown) => {
    showToast(`${action} failed: ${err instanceof Error ? err.message : String(err)}`, true);
  };

  const saveSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    api.saveSetting(key, value).catch((err) => showApiError('Saving', err));
  };

  // Applies a change to one tender, brings its day counts up to date and saves it. If the save
  // fails the list is reloaded, so the screen never shows something the server does not have.
  const updateTender = (tenderId: number, change: (t: Tender) => Tender): Tender | null => {
    const current = tenders.find((t) => t.sr_no === tenderId);
    if (!current) return null;
    const updated = normalizeTender(change(current));
    setTenders((prev) => prev.map((t) => (t.sr_no === tenderId ? updated : t)));
    api.saveTender(updated).catch((err) => {
      showApiError('Saving the tender', err);
      api
        .getTenders()
        .then((fresh) => setTenders(fresh.map(normalizeTender)))
        .catch(() => {});
    });
    return updated;
  };

  // Synchronize master users and active currentUser profile
  const handleUpdateMasterUsers = (newUsers: UserProfile[]) => {
    setMasterUsers(newUsers);
    setUsers(newUsers);
    api.saveUsers(newUsers).catch((err) => showApiError('Saving officers', err));
    const updatedUser = newUsers.find(
      (u) => u.id === currentUser.id || u.name.toLowerCase() === currentUser.name.toLowerCase()
    );
    if (updatedUser) {
      setCurrentUser(updatedUser);
    }
  };

  // Synchronize leadership settings and elevate entity & functional heads
  const handleUpdateLeadershipSettings = (newSettings: EntityLeadershipSettings) => {
    setLeadershipSettings(newSettings);
    saveSetting('leadershipSettings', newSettings);

    handleUpdateMasterUsers(
      masterUsers.map((u) => {
        const isEntity = u.name.toLowerCase() === newSettings.entityHeadName.toLowerCase();
        const isFinance = u.name.toLowerCase() === newSettings.financeHeadName.toLowerCase();
        const isEstimate = u.name.toLowerCase() === newSettings.estimateHeadName.toLowerCase();
        if (isEntity) {
          return { ...u, visibilityScope: 'ALL' as const, canEditMasters: true };
        }
        if (isFinance || isEstimate) {
          return { ...u, visibilityScope: 'ALL' as const };
        }
        return u;
      })
    );
  };

  // A change to the holiday list changes every working-day figure, so all tenders are re-measured
  const handleUpdateSlaRules = (newRules: SlaMasterRules) => {
    setSlaRules(newRules);
    setActiveSlaRules(newRules);
    saveSetting('slaRules', newRules);
    setTenders((prev) => prev.map(normalizeTender));
  };

  const handleUpdateStages = (next: StageMasterItem[]) => {
    setStages(next);
    saveSetting('stages', next);
  };

  const handleUpdateGroups = (next: GroupMasterItem[]) => {
    setGroups(next);
    saveSetting('groups', next);
  };

  const handleUpdateUserFunctions = (next: UserFunctionMasterItem[]) => {
    setUserFunctions(next);
    saveSetting('userFunctions', next);
  };

  const handleUpdateTenderTypes = (next: TenderTypeMasterItem[]) => {
    setTenderTypes(next);
    saveSetting('tenderTypes', next);
  };

  // Switch active user persona
  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    setChat([]);
    showToast(`Switched to ${user.name} (${user.role})`);
  };

  // Create Tender (the backend assigns a unique sr_no)
  const handleCreateTender = async (newTender: Tender) => {
    let savedTender: Tender;
    try {
      savedTender = normalizeTender(await api.createTender(newTender));
    } catch (err) {
      showApiError('Creating the tender', err);
      return;
    }

    setTenders((prev) => [savedTender, ...prev]);
    showToast(`Tender ${savedTender.pr_no} created`);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      // ignore
    }
  };

  // Advance Stage / Hand off tender
  const handleAdvanceStage = (
    tenderId: number,
    nextStage: TenderStage,
    nextHolder: string,
    nextRole: UserRole,
    remarks: string,
    awardedValue?: number,
    savings?: number,
    handoffTimestamp?: string
  ) => {
    const transitionTimeStr = handoffTimestamp || formatDateTime(new Date());
    const isNowAwarded = nextStage === 'Awarded';

    const updated = updateTender(tenderId, (t) => {
      // Close the open entry using entry_date vs transitionTimeStr (working time only)
      const updatedTimeline = [...t.timeline];
      let daysSpentInLastStage = 0;

      if (updatedTimeline.length > 0) {
        const lastEntry = { ...updatedTimeline[updatedTimeline.length - 1] };
        if (!lastEntry.exit_date) {
          lastEntry.exit_date = transitionTimeStr;
          const computedDays = calculateElapsedDays(lastEntry.entry_date, transitionTimeStr);
          const computedHours = calculateElapsedHours(lastEntry.entry_date, transitionTimeStr);
          lastEntry.days_spent = Math.max(0.1, computedDays);
          lastEntry.hours_spent = Math.max(0.1, computedHours);
          daysSpentInLastStage = lastEntry.days_spent;
          updatedTimeline[updatedTimeline.length - 1] = lastEntry;
        }
      }

      // Add new step
      updatedTimeline.push({
        stage: nextStage,
        role: nextRole,
        holder: nextHolder,
        entry_date: transitionTimeStr,
        exit_date: isNowAwarded ? transitionTimeStr : null,
        days_spent: isNowAwarded ? 0.1 : null,
        hours_spent: isNowAwarded ? 2.4 : null,
        remarks: remarks,
      });

      // Total SLA runs from initial PR receipt to transitionTimeStr; days by role are derived
      // from the timeline in normalizeTender
      const totalCumulativeDays = calculateElapsedDays(t.receipt_actionable_pr || t.date_pr_initial_indent, transitionTimeStr);
      const newSlaDays = totalCumulativeDays > 0 ? totalCumulativeDays : (t.sla_days || 0) + daysSpentInLastStage;

      const finalAwardedVal = isNowAwarded
        ? awardedValue || (t.estimate_value_cr ? t.estimate_value_cr * 0.95 : 0)
        : t.awarded_value_cr;

      const finalSavings = isNowAwarded
        ? savings !== undefined
          ? savings
          : t.estimate_value_cr !== null && finalAwardedVal !== null
          ? +(t.estimate_value_cr - (finalAwardedVal || 0)).toFixed(2)
          : null
        : t.savings_due_to_negotiation_cr;

      return {
        ...t,
        brief_status: nextStage,
        current_holder: isNowAwarded ? '' : nextHolder,
        current_role: nextRole,
        timeline: updatedTimeline,
        sla_days: Math.round(newSlaDays * 10) / 10,
        awarded_value_cr: finalAwardedVal ? +finalAwardedVal.toFixed(2) : null,
        savings_due_to_negotiation_cr: finalSavings ? +finalSavings.toFixed(2) : null,
        tec_approval_date: isNowAwarded ? transitionTimeStr : t.tec_approval_date,
        tender_register_updated: isNowAwarded ? 'YES' : t.tender_register_updated,
        aoc_completed: isNowAwarded ? 'YES' : t.aoc_completed,
        contract_ola_created: isNowAwarded ? 'YES' : t.contract_ola_created,
        is_closed: isNowAwarded ? false : t.is_closed,
        created_by: t.created_by || t.pm_officer,
      };
    });
    if (!updated) return;

    if (isNowAwarded) {
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (err) {
        // ignore
      }
      showToast(`Tender ${updated.pr_no} awarded`);
    } else {
      showToast(`Sent to ${nextHolder} (${nextStage})`);
    }
  };

  // Cancel Tender at any stage
  const handleCancelTender = (tenderId: number, reason: string, remarks: string) => {
    const timestamp = formatDateTime(new Date());
    const updated = updateTender(tenderId, (t) => {
      const updatedTimeline = [...t.timeline];
      if (updatedTimeline.length > 0) {
        const lastEntry = { ...updatedTimeline[updatedTimeline.length - 1] };
        if (!lastEntry.exit_date) {
          lastEntry.exit_date = timestamp;
          const computedDays = calculateElapsedDays(lastEntry.entry_date, timestamp);
          lastEntry.days_spent = Math.max(0.1, computedDays);
          updatedTimeline[updatedTimeline.length - 1] = lastEntry;
        }
      }

      updatedTimeline.push({
        stage: 'Cancelled',
        role: currentUser.role,
        holder: currentUser.name,
        entry_date: timestamp,
        exit_date: timestamp,
        days_spent: 0.1,
        remarks: `Tender Cancelled: ${reason}. ${remarks}`.trim(),
        action_type: 'Cancellation',
      });

      return {
        ...t,
        brief_status: 'Cancelled',
        current_holder: '',
        current_role: '',
        timeline: updatedTimeline,
        cancellation_info: {
          cancelled_on: timestamp,
          cancelled_by: currentUser.name,
          cancelled_role: currentUser.role,
          reason,
          remarks,
          stage_at_cancellation: t.brief_status,
        },
      };
    });
    if (updated) showToast(`Tender ${updated.pr_no} cancelled`);
  };

  // Close Tender once all procedural work is complete
  const handleCloseTender = (tenderId: number, remarks?: string) => {
    const timestamp = formatDateTime(new Date());
    const updated = updateTender(tenderId, (t) => ({
      ...t,
      is_closed: true,
      closure_info: {
        closed_on: timestamp,
        closed_by: currentUser.name,
        remarks: remarks || undefined,
      },
    }));
    if (updated) showToast(`Tender ${updated.pr_no} closed`);
  };

  // Post-Award Steps Management
  const handleAddPostAwardStep = (tenderId: number, title: string, notes?: string, dueDate?: string) => {
    const timestamp = formatDateTime(new Date());
    const newStep = {
      id: `step-${Date.now()}`,
      title,
      notes,
      due_date: dueDate,
      completed: false,
      created_at: timestamp,
      created_by: currentUser.name,
    };
    updateTender(tenderId, (t) => ({ ...t, post_award_steps: [...(t.post_award_steps || []), newStep] }));
    showToast(`Step added: "${title}"`);
  };

  const handleTogglePostAwardStep = (tenderId: number, stepId: string) => {
    const timestamp = formatDateTime(new Date());
    updateTender(tenderId, (t) => ({
      ...t,
      post_award_steps: (t.post_award_steps || []).map((s) => {
        if (s.id !== stepId) return s;
        const nextCompleted = !s.completed;
        return {
          ...s,
          completed: nextCompleted,
          completed_at: nextCompleted ? timestamp : undefined,
        };
      }),
    }));
  };

  const handleDeletePostAwardStep = (tenderId: number, stepId: string) => {
    updateTender(tenderId, (t) => ({
      ...t,
      post_award_steps: (t.post_award_steps || []).filter((s) => s.id !== stepId),
    }));
    showToast('Step removed');
  };

  // Priority matrix (Urgency & Importance)
  const handleUpdateTenderPriority = (
    tenderId: number,
    urgency: 'urgent' | 'not_urgent',
    importance: 'important' | 'not_important'
  ) => {
    updateTender(tenderId, (t) => ({ ...t, urgency, importance }));
  };

  // Microsoft Tasks Handlers
  const updateTasks = (next: UserTask[]) => {
    setTasks(next);
    saveSetting('tasks', next);
  };

  const handleAddTask = (newTask: Omit<UserTask, 'id' | 'created_at'>) => {
    const task: UserTask = {
      ...newTask,
      id: `task-${Date.now()}`,
      created_at: formatDateTime(new Date()),
    };
    updateTasks([task, ...tasks]);
    showToast(`Task added: "${task.title}"`);
  };

  const handleToggleTask = (taskId: string) => {
    updateTasks(
      tasks.map((task) => {
        if (task.id !== taskId) return task;
        const nextCompleted = !task.completed;
        return {
          ...task,
          completed: nextCompleted,
          completed_at: nextCompleted ? formatDateTime(new Date()) : undefined,
        };
      })
    );
  };

  const handleUpdateTask = (updatedTask: UserTask) => {
    updateTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleDeleteTask = (taskId: string) => {
    updateTasks(tasks.filter((t) => t.id !== taskId));
    showToast('Task deleted');
  };

  // Update existing tender details (e.g. estimate value, sign-off dates, evaluation movements)
  const handleUpdateTender = (updatedTender: Tender, message?: string) => {
    const updated = updateTender(updatedTender.sr_no, () => updatedTender);
    if (updated) showToast(message || `Tender ${updated.pr_no} updated`);
  };

  const sidebar = (
    <Sidebar
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      currentUser={currentUser}
      tenders={visibleTenders}
      onOpenCreateTender={() => {
        setIsNavOpen(false);
        setIsCreateOpen(true);
      }}
    />
  );

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onSelectUser={handleSwitchUser}
        onOpenCreateTender={() => setIsCreateOpen(true)}
        onOpenNav={() => setIsNavOpen(true)}
        tenders={visibleTenders}
        users={masterUsers}
        leadershipSettings={leadershipSettings}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: always visible on wide screens, a slide-in drawer on phones */}
        <div className="hidden lg:flex shrink-0">{sidebar}</div>
        {isNavOpen && <MobileNav onClose={() => setIsNavOpen(false)}>{sidebar}</MobileNav>}

        {/* Dynamic Center Stage Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-slate-100">
          <div className={`w-full ${activeTab === 'stage-kanban' ? 'max-w-none' : 'max-w-[1850px] mx-auto'}`}>
            {activeTab === 'dashboard' && (
              <DashboardView
                tenders={visibleTenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
              />
            )}

            {activeTab === 'assistant' && (
              <AssistantView
                data={assistantData}
                messages={chat}
                onMessagesChange={setChat}
                onOpenTender={(tender) => setSelectedTender(tender)}
              />
            )}

            {activeTab === 'my-queue' && (
              <MyQueueView
                currentUser={currentUser}
                tenders={visibleTenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
                onAdvanceStage={handleAdvanceStage}
                tasks={tasks}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTenderPriority={handleUpdateTenderPriority}
                onAddPostAwardStep={handleAddPostAwardStep}
                onTogglePostAwardStep={handleTogglePostAwardStep}
                onDeletePostAwardStep={handleDeletePostAwardStep}
                onCloseTender={handleCloseTender}
              />
            )}

            {activeTab === 'tenders-register' && (
              <TenderRegisterView
                tenders={visibleTenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
              />
            )}

            {activeTab === 'stage-kanban' && (
              <StageKanbanView
                tenders={visibleTenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
                onOpenCreateTender={() => setIsCreateOpen(true)}
              />
            )}

            {activeTab === 'audit-trail' && (
              <AuditTrailView
                tenders={auditTenders}
                onOpenTender={(tender) => setSelectedTender(tender)}
              />
            )}

            {activeTab === 'masters' && (
              <MastersView
                stages={stages}
                onUpdateStages={handleUpdateStages}
                users={masterUsers}
                onUpdateUsers={handleUpdateMasterUsers}
                groups={groups}
                onUpdateGroups={handleUpdateGroups}
                userFunctions={userFunctions}
                onUpdateUserFunctions={handleUpdateUserFunctions}
                tenderTypes={tenderTypes}
                onUpdateTenderTypes={handleUpdateTenderTypes}
                leadershipSettings={leadershipSettings}
                onUpdateLeadershipSettings={handleUpdateLeadershipSettings}
                slaRules={slaRules}
                onUpdateSlaRules={handleUpdateSlaRules}
                tenders={tenders}
                currentUser={currentUser}
                showToast={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Tender Detail & Stepper Modal */}
      {selectedTender && (
        <TenderDetailModal
          tender={selectedTender}
          currentUser={currentUser}
          canViewTimeline={auditTenders.some((t) => t.sr_no === selectedTender.sr_no)}
          onClose={() => setSelectedTender(null)}
          onAdvanceStage={handleAdvanceStage}
          onUpdateTender={handleUpdateTender}
          onCancelTender={handleCancelTender}
          onAddPostAwardStep={handleAddPostAwardStep}
          onTogglePostAwardStep={handleTogglePostAwardStep}
          onDeletePostAwardStep={handleDeletePostAwardStep}
          onCloseTender={handleCloseTender}
        />
      )}

      {/* Create Tender Modal */}
      {isCreateOpen && (
        <CreateTenderModal
          currentUser={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onCreateTender={handleCreateTender}
          nextSrNo={tenders.length > 0 ? Math.max(...tenders.map((t) => t.sr_no)) + 1 : 1}
          groups={groups}
          users={masterUsers}
          userFunctions={userFunctions}
          tenderTypes={tenderTypes}
        />
      )}

      {/* Floating Action Toast */}
      {toastMessage && (
        <div
          role={toastIsError ? 'alert' : 'status'}
          aria-live={toastIsError ? 'assertive' : 'polite'}
          className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-md z-70 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-slideUp"
        >
          {toastIsError ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss"
            className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** The sidebar as a drawer for narrow screens. Tapping the backdrop or pressing Escape closes it. */
function MobileNav({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex shadow-xl animate-slideIn">{children}</div>
    </div>
  );
}
