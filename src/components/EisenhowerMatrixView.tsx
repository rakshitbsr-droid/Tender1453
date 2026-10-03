import React, { useState, useMemo } from 'react';
import { Tender, UserProfile, TenderStage, UserRole, UserTask } from '../types';
import {
  formatCurrencyCr,
  getStageBadgeColor,
  getPrimaryRoleLabel,
} from '../utils/tenderUtils';
import {
  Flame,
  Calendar,
  Send,
  Eye,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
  ListTodo,
  Check,
  Star,
  Tag,
  AlertTriangle,
  MoveRight,
  Filter,
  Search,
  Zap,
  Info,
  Bell
} from 'lucide-react';

interface EisenhowerMatrixViewProps {
  currentUser: UserProfile;
  inboxTenders: Tender[];
  tasks: UserTask[];
  onOpenTender: (tender: Tender) => void;
  onAdvanceStage: (
    tenderId: number,
    nextStage: TenderStage,
    nextHolder: string,
    nextRole: UserRole,
    remarks: string,
    awardedValue?: number,
    savings?: number
  ) => void;
  onUpdateTenderPriority: (
    tenderId: number,
    urgency: 'urgent' | 'not_urgent',
    importance: 'important' | 'not_important'
  ) => void;
  onAddTask: (task: Omit<UserTask, 'id' | 'created_at'>) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateTask: (task: UserTask) => void;
  onOpenHandoffModal?: (tender: Tender) => void;
}

type MatrixQuadrantKey = 'q1' | 'q2' | 'q3' | 'q4';

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({
  currentUser,
  inboxTenders,
  tasks,
  onOpenTender,
  onAdvanceStage,
  onUpdateTenderPriority,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onOpenHandoffModal,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'TENDERS' | 'TASKS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Quick inline add task modal/form per quadrant
  const [activeAddQuadrant, setActiveAddQuadrant] = useState<MatrixQuadrantKey | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskReminder, setQuickTaskReminder] = useState('');

  // User tasks assigned to current user
  const userTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.assigned_to.toLowerCase() === currentUser.name.toLowerCase() ||
        currentUser.role === 'ADMIN'
    );
  }, [tasks, currentUser]);

  // Determine matrix category for each tender (default to Q1 if High priority, Q2 if normal, or explicit fields)
  const getTenderQuadrant = (t: Tender): MatrixQuadrantKey => {
    const isUrgent = t.urgency ? t.urgency === 'urgent' : t.priority === 'High';
    const isImportant = t.importance ? t.importance === 'important' : (t.estimate_value_cr || 0) > 10 || t.priority === 'High';

    if (isUrgent && isImportant) return 'q1';
    if (!isUrgent && isImportant) return 'q2';
    if (isUrgent && !isImportant) return 'q3';
    return 'q4';
  };

  const getTaskQuadrant = (task: UserTask): MatrixQuadrantKey => {
    const isUrgent = task.urgency === 'urgent';
    const isImportant = task.importance === 'important';

    if (isUrgent && isImportant) return 'q1';
    if (!isUrgent && isImportant) return 'q2';
    if (isUrgent && !isImportant) return 'q3';
    return 'q4';
  };

  // Filtered tenders & tasks
  const filteredTenders = useMemo(() => {
    if (filterType === 'TASKS') return [];
    return inboxTenders.filter((t) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        t.pr_no.toLowerCase().includes(term) ||
        (t.crfq_no || '').toLowerCase().includes(term) ||
        t.item_description.toLowerCase().includes(term)
      );
    });
  }, [inboxTenders, filterType, searchTerm]);

  const filteredTasks = useMemo(() => {
    if (filterType === 'TENDERS') return [];
    return userTasks.filter((t) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return t.title.toLowerCase().includes(term) || (t.category || '').toLowerCase().includes(term);
    });
  }, [userTasks, filterType, searchTerm]);

  // Group items by quadrant
  const matrixData = useMemo(() => {
    const q1Tenders = filteredTenders.filter((t) => getTenderQuadrant(t) === 'q1');
    const q1Tasks = filteredTasks.filter((t) => getTaskQuadrant(t) === 'q1');

    const q2Tenders = filteredTenders.filter((t) => getTenderQuadrant(t) === 'q2');
    const q2Tasks = filteredTasks.filter((t) => getTaskQuadrant(t) === 'q2');

    const q3Tenders = filteredTenders.filter((t) => getTenderQuadrant(t) === 'q3');
    const q3Tasks = filteredTasks.filter((t) => getTaskQuadrant(t) === 'q3');

    const q4Tenders = filteredTenders.filter((t) => getTenderQuadrant(t) === 'q4');
    const q4Tasks = filteredTasks.filter((t) => getTaskQuadrant(t) === 'q4');

    return {
      q1: { tenders: q1Tenders, tasks: q1Tasks },
      q2: { tenders: q2Tenders, tasks: q2Tasks },
      q3: { tenders: q3Tenders, tasks: q3Tasks },
      q4: { tenders: q4Tenders, tasks: q4Tasks },
    };
  }, [filteredTenders, filteredTasks]);

  const handleCreateQuickTask = (quadrant: MatrixQuadrantKey) => {
    if (!quickTaskTitle.trim()) return;

    let urgency: 'urgent' | 'not_urgent' = 'urgent';
    let importance: 'important' | 'not_important' = 'important';

    if (quadrant === 'q1') {
      urgency = 'urgent';
      importance = 'important';
    } else if (quadrant === 'q2') {
      urgency = 'not_urgent';
      importance = 'important';
    } else if (quadrant === 'q3') {
      urgency = 'urgent';
      importance = 'not_important';
    } else {
      urgency = 'not_urgent';
      importance = 'not_important';
    }

    onAddTask({
      title: quickTaskTitle.trim(),
      assigned_to: currentUser.name,
      completed: false,
      due_date: quickTaskDueDate || undefined,
      reminder: quickTaskReminder || undefined,
      urgency,
      importance,
      steps: [],
      category: 'Procurement',
    });

    setQuickTaskTitle('');
    setQuickTaskDueDate('');
    setQuickTaskReminder('');
    setActiveAddQuadrant(null);
  };

  const setTenderQuadrant = (tender: Tender, targetQuadrant: MatrixQuadrantKey) => {
    let urgency: 'urgent' | 'not_urgent' = 'urgent';
    let importance: 'important' | 'not_important' = 'important';

    if (targetQuadrant === 'q1') {
      urgency = 'urgent';
      importance = 'important';
    } else if (targetQuadrant === 'q2') {
      urgency = 'not_urgent';
      importance = 'important';
    } else if (targetQuadrant === 'q3') {
      urgency = 'urgent';
      importance = 'not_important';
    } else {
      urgency = 'not_urgent';
      importance = 'not_important';
    }

    onUpdateTenderPriority(tender.sr_no, urgency, importance);
  };

  const setTaskQuadrant = (task: UserTask, targetQuadrant: MatrixQuadrantKey) => {
    let urgency: 'urgent' | 'not_urgent' = 'urgent';
    let importance: 'important' | 'not_important' = 'important';

    if (targetQuadrant === 'q1') {
      urgency = 'urgent';
      importance = 'important';
    } else if (targetQuadrant === 'q2') {
      urgency = 'not_urgent';
      importance = 'important';
    } else if (targetQuadrant === 'q3') {
      urgency = 'urgent';
      importance = 'not_important';
    } else {
      urgency = 'not_urgent';
      importance = 'not_important';
    }

    onUpdateTask({ ...task, urgency, importance });
  };

  const quadrantsConfig = [
    {
      key: 'q1' as MatrixQuadrantKey,
      title: 'Q1: Urgent & Important',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      headerBg: 'bg-rose-50 border-rose-200 text-rose-900',
      cardBorder: 'hover:border-rose-300',
      accentColor: 'rose',
      icon: Flame,
    },
    {
      key: 'q2' as MatrixQuadrantKey,
      title: 'Q2: Not Urgent & Important',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      headerBg: 'bg-blue-50 border-blue-200 text-blue-900',
      cardBorder: 'hover:border-blue-300',
      accentColor: 'blue',
      icon: Calendar,
    },
    {
      key: 'q3' as MatrixQuadrantKey,
      title: 'Q3: Urgent & Not Important',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      headerBg: 'bg-amber-50 border-amber-200 text-amber-900',
      cardBorder: 'hover:border-amber-300',
      accentColor: 'amber',
      icon: Zap,
    },
    {
      key: 'q4' as MatrixQuadrantKey,
      title: 'Q4: Not Urgent & Not Important',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
      headerBg: 'bg-slate-50 border-slate-200 text-slate-900',
      cardBorder: 'hover:border-slate-300',
      accentColor: 'slate',
      icon: Info,
    },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Matrix Controls & Search */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Eisenhower Matrix
            </h3>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-[11px] ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('TENDERS')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-[11px] ${
                filterType === 'TENDERS'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tenders
            </button>
            <button
              onClick={() => setFilterType('TASKS')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-[11px] ${
                filterType === 'TASKS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tasks
            </button>
          </div>
        </div>
      </div>

      {/* 2x2 Eisenhower Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {quadrantsConfig.map((q) => {
          const Icon = q.icon;
          const { tenders: qTenders, tasks: qTasks } = matrixData[q.key];
          const totalItems = qTenders.length + qTasks.length;
          const isAddingTask = activeAddQuadrant === q.key;

          return (
            <div
              key={q.key}
              className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-[460px]"
            >
              {/* Quadrant Header */}
              <div
                className={`p-3.5 border-b flex items-center justify-between gap-3 ${q.headerBg}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold leading-tight uppercase tracking-wider">
                      {q.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${q.badgeBg}`}
                  >
                    {totalItems} items ({qTenders.length} tenders, {qTasks.length} tasks)
                  </span>

                  {/* Quick Add Task in this quadrant */}
                  <button
                    onClick={() => {
                      if (isAddingTask) {
                        setActiveAddQuadrant(null);
                      } else {
                        setActiveAddQuadrant(q.key);
                      }
                    }}
                    className="p-1 rounded-md bg-white/80 hover:bg-white text-slate-700 hover:text-blue-700 border border-slate-300 shadow-2xs text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Add Task"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add Task</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Task Form for this Quadrant */}
              {isAddingTask && (
                <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Task title"
                      value={quickTaskTitle}
                      onChange={(e) => setQuickTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateQuickTask(q.key);
                        }
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5" title="Due Date">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <input
                          type="date"
                          value={quickTaskDueDate}
                          onChange={(e) => setQuickTaskDueDate(e.target.value)}
                          className="text-[11px] text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5" title="Reminder">
                        <Bell className="w-3 h-3 text-amber-500" />
                        <input
                          type="datetime-local"
                          value={quickTaskReminder}
                          onChange={(e) => setQuickTaskReminder(e.target.value)}
                          className="text-[11px] text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleCreateQuickTask(q.key)}
                        disabled={!quickTaskTitle.trim()}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setActiveAddQuadrant(null)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quadrant Body List */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[500px]">
                {totalItems === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/40 my-4">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">No items</p>
                  </div>
                ) : (
                  <>
                    {/* TENDERS IN THIS QUADRANT */}
                    {qTenders.map((tender) => {
                      const stageBadge = getStageBadgeColor(tender.brief_status);
                      return (
                        <div
                          key={`matrix-tender-${tender.sr_no}`}
                          className={`bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2.5 transition-all ${q.cardBorder}`}
                        >
                          {/* Top Row: PR No, Tender Type, Value, Stage */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {tender.pr_no}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Tender
                              </span>
                              <span className="text-[11px] font-bold text-slate-800">
                                {formatCurrencyCr(tender.estimate_value_cr)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
                              >
                                {tender.brief_status}
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                            {tender.item_description}
                          </p>

                          {/* Quadrant Switcher & Actions Footer */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            {/* Re-categorize dropdown */}
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span>Move:</span>
                              <select
                                value={q.key}
                                onChange={(e) =>
                                  setTenderQuadrant(tender, e.target.value as MatrixQuadrantKey)
                                }
                                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 cursor-pointer"
                              >
                                <option value="q1">Q1</option>
                                <option value="q2">Q2</option>
                                <option value="q3">Q3</option>
                                <option value="q4">Q4</option>
                              </select>
                            </div>

                            {/* Tender Action CTAs (Review & SEND TO NEXT PERSON DIRECTLY) */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onOpenTender(tender)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Details</span>
                              </button>

                              {/* Send / Handoff Tender directly from matrix */}
                              <button
                                onClick={() => {
                                  if (onOpenHandoffModal) {
                                    onOpenHandoffModal(tender);
                                  } else {
                                    onOpenTender(tender);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Send className="w-3 h-3" />
                                <span>Send Tender</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* TASKS IN THIS QUADRANT */}
                    {qTasks.map((task) => (
                      <div
                        key={`matrix-task-${task.id}`}
                        className={`bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 transition-all ${
                          task.completed ? 'opacity-60 bg-slate-50/70' : q.cardBorder
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Complete Task Checkbox directly in Matrix */}
                            <button
                              type="button"
                              onClick={() => onToggleTask(task.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                              title={task.completed ? 'Reopen task' : 'Mark completed'}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <p
                                className={`text-xs font-semibold leading-tight ${
                                  task.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-800'
                                }`}
                              >
                                {task.title}
                              </p>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                                <span className="px-1.5 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Task
                                </span>
                                {task.category && (
                                  <span className="px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600">
                                    {task.category}
                                  </span>
                                )}
                                {task.due_date && (
                                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{task.due_date}</span>
                                  </span>
                                )}
                                {task.reminder && (
                                  <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                    <Bell className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Reminder: {task.reminder.replace('T', ' ')}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Important Star */}
                          <button
                            onClick={() =>
                              onUpdateTask({ ...task, is_important: !task.is_important })
                            }
                            className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                              task.is_important
                                ? 'text-amber-500'
                                : 'text-slate-300 hover:text-slate-500'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

                        {/* Task Quadrant Move Switcher */}
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <span>Move:</span>
                            <select
                              value={q.key}
                              onChange={(e) =>
                                setTaskQuadrant(task, e.target.value as MatrixQuadrantKey)
                              }
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 cursor-pointer"
                            >
                              <option value="q1">Q1</option>
                              <option value="q2">Q2</option>
                              <option value="q3">Q3</option>
                              <option value="q4">Q4</option>
                            </select>
                          </span>

                          {task.completed && (
                            <span className="text-emerald-600 font-bold">Finished</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
