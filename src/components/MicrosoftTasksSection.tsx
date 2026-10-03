import React, { useState, useMemo } from 'react';
import { UserTask, UserTaskStep, TaskRecurrence, Tender } from '../types';
import {
  CheckCircle2,
  Circle,
  Star,
  Calendar,
  Clock,
  Repeat,
  Tag,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sun,
  ListTodo,
  FileText,
  AlertCircle,
  ExternalLink,
  X,
  Sparkles,
  Zap,
  Check,
  Bell
} from 'lucide-react';

interface MicrosoftTasksSectionProps {
  tasks: UserTask[];
  currentUserName: string;
  tenders: Tender[];
  onAddTask: (task: Omit<UserTask, 'id' | 'created_at'>) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateTask: (task: UserTask) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTender?: (tender: Tender) => void;
}

type TaskTab = 'all' | 'my-day' | 'important' | 'planned';

export const MicrosoftTasksSection: React.FC<MicrosoftTasksSectionProps> = ({
  tasks,
  currentUserName,
  tenders,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onOpenTender,
}) => {
  const [activeTab, setActiveTab] = useState<TaskTab>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [newUrgency, setNewUrgency] = useState<'urgent' | 'not_urgent'>('urgent');
  const [newImportance, setNewImportance] = useState<'important' | 'not_important'>('important');
  const [newCategory, setNewCategory] = useState('Procurement');
  const [newLinkedPr, setNewLinkedPr] = useState('');
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);

  // Completed tasks accordion toggle (collapsed by default as requested: "visible only after opening it")
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  // Selected task for side drawer detail
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [newStepText, setNewStepText] = useState('');

  // Filter tasks for current user or all if admin
  const userTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.assigned_to.toLowerCase() === currentUserName.toLowerCase() ||
        currentUserName.toLowerCase().includes('cpo executive')
    );
  }, [tasks, currentUserName]);

  // Tab filtering
  const filteredActiveTasks = useMemo(() => {
    return userTasks.filter((t) => {
      if (t.completed) return false;
      if (activeTab === 'my-day') return t.is_my_day;
      if (activeTab === 'important') return t.is_important;
      if (activeTab === 'planned') return Boolean(t.due_date);
      return true;
    });
  }, [userTasks, activeTab]);

  const completedTasks = useMemo(() => {
    return userTasks.filter((t) => t.completed);
  }, [userTasks]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      assigned_to: currentUserName,
      completed: false,
      due_date: newDueDate || undefined,
      reminder: newReminder || undefined,
      is_my_day: activeTab === 'my-day',
      is_important: activeTab === 'important',
      category: newCategory,
      linked_tender_pr: newLinkedPr || undefined,
      urgency: newUrgency,
      importance: newImportance,
      steps: [],
    });

    setNewTitle('');
    setNewDueDate('');
    setNewReminder('');
    setNewLinkedPr('');
    setIsQuickAddExpanded(false);
  };

  const handleAddStep = (taskId: string) => {
    if (!newStepText.trim() || !selectedTask) return;
    const newStep: UserTaskStep = {
      id: `step-${Date.now()}`,
      title: newStepText.trim(),
      completed: false,
    };
    const updated = {
      ...selectedTask,
      steps: [...(selectedTask.steps || []), newStep],
    };
    onUpdateTask(updated);
    setSelectedTask(updated);
    setNewStepText('');
  };

  const handleToggleStep = (stepId: string) => {
    if (!selectedTask) return;
    const updated = {
      ...selectedTask,
      steps: selectedTask.steps.map((s) =>
        s.id === stepId ? { ...s, completed: !s.completed } : s
      ),
    };
    onUpdateTask(updated);
    setSelectedTask(updated);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selectedTask) return;
    const updated = {
      ...selectedTask,
      steps: selectedTask.steps.filter((s) => s.id !== stepId),
    };
    onUpdateTask(updated);
    setSelectedTask(updated);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header with Microsoft Tasks branding */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                My Tasks
              </h3>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-[11px] ${
              activeTab === 'all'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tasks ({userTasks.filter((t) => !t.completed).length})
          </button>
          <button
            onClick={() => setActiveTab('my-day')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
              activeTab === 'my-day'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-3 h-3 text-amber-500" />
            <span>My Day</span>
          </button>
          <button
            onClick={() => setActiveTab('important')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
              activeTab === 'important'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-3 h-3 text-indigo-500" />
            <span>Important</span>
          </button>
          <button
            onClick={() => setActiveTab('planned')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
              activeTab === 'planned'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3 h-3 text-emerald-500" />
            <span>Planned</span>
          </button>
        </div>
      </div>

      {/* Main Container with Task List & Optional Detail Drawer */}
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-[380px]">
        {/* Left: Task Input and Lists */}
        <div className="flex-1 p-4 sm:p-5 space-y-4">
          {/* Quick Add Input (Microsoft To-Do style) */}
          <form onSubmit={handleCreateTask} className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100/70 focus-within:bg-white border border-slate-200 focus-within:border-blue-500 rounded-xl transition-all shadow-2xs">
              <Plus className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
              <input
                type="text"
                placeholder="Add a task"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onFocus={() => setIsQuickAddExpanded(true)}
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-1"
              />
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-3 py-1 bg-blue-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                Add
              </button>
            </div>

            {/* Quick Add Expanded Options Bar */}
            {isQuickAddExpanded && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-3 text-xs animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700"
                    title="Due Date"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <input
                    type="datetime-local"
                    value={newReminder}
                    onChange={(e) => setNewReminder(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700"
                    title="Reminder"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 cursor-pointer"
                  >
                    <option value="Procurement">Procurement</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="Legal / Contract">Legal / Contract</option>
                    <option value="Finance">Finance</option>
                    <option value="Vendor Follow-up">Vendor Follow-up</option>
                    <option value="Audit & Reports">Audit & Reports</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Link Tender:</span>
                  <select
                    value={newLinkedPr}
                    onChange={(e) => setNewLinkedPr(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 max-w-[150px] truncate cursor-pointer"
                  >
                    <option value="">No link</option>
                    {tenders.slice(0, 10).map((t) => (
                      <option key={t.pr_no} value={t.pr_no}>
                        {t.pr_no}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] text-slate-400">Matrix:</span>
                  <select
                    value={`${newUrgency}-${newImportance}`}
                    onChange={(e) => {
                      const [u, i] = e.target.value.split('-');
                      setNewUrgency(u as any);
                      setNewImportance(i as any);
                    }}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="urgent-important">Q1: Urgent & Important</option>
                    <option value="not_urgent-important">Q2: Not Urgent & Important</option>
                    <option value="urgent-not_important">Q3: Urgent & Not Important</option>
                    <option value="not_urgent-not_important">Q4: Not Urgent & Not Important</option>
                  </select>
                </div>
              </div>
            )}
          </form>

          {/* Active Tasks List */}
          <div className="space-y-2">
            {filteredActiveTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-700">No tasks</p>
              </div>
            ) : (
              filteredActiveTasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                const hasSteps = task.steps && task.steps.length > 0;
                const completedStepsCount = hasSteps
                  ? task.steps.filter((s) => s.completed).length
                  : 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-300 shadow-2xs ring-1 ring-blue-200'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTask(task.id);
                        }}
                        className="text-slate-400 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
                      >
                        <Circle className="w-4 h-4" />
                      </button>

                      {/* Title & Metadata */}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight truncate">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500">
                          {task.category && (
                            <span className="px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {task.category}
                            </span>
                          )}

                          {task.linked_tender_pr && (
                            <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {task.linked_tender_pr}
                            </span>
                          )}

                          {task.due_date && (
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{task.due_date}</span>
                            </span>
                          )}

                          {task.reminder && (
                            <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              <Bell className="w-2.5 h-2.5 text-amber-600" />
                              <span>Reminder: {task.reminder.replace('T', ' ')}</span>
                            </span>
                          )}

                          {hasSteps && (
                            <span className="text-slate-500 font-medium">
                              {completedStepsCount} of {task.steps.length} steps
                            </span>
                          )}

                          {task.urgency === 'urgent' && (
                            <span className="text-rose-600 font-bold">Urgent</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Star for Important Toggle */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          onUpdateTask({ ...task, is_important: !task.is_important })
                        }
                        className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                          task.is_important ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={task.is_important ? 'Marked important' : 'Mark as important'}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* COMPLETED TASKS ACCORDION (Visible ONLY after opening it as explicitly required) */}
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer py-1.5 px-1 rounded-md transition-colors"
            >
              {isCompletedExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
              <span>Completed ({completedTasks.length})</span>
            </button>

            {isCompletedExpanded && (
              <div className="mt-2 space-y-1.5 pl-2 animate-fadeIn">
                {completedTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-2 italic">
                    No completed tasks
                  </p>
                ) : (
                  completedTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between gap-3 group cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(task.id);
                          }}
                          className="text-emerald-600 hover:text-slate-400 transition-colors shrink-0 cursor-pointer"
                          title="Reactivate task"
                        >
                          <CheckCircle2 className="w-4 h-4 fill-emerald-50" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 line-through truncate">
                            {task.title}
                          </p>
                          {task.completed_at && (
                            <span className="text-[10px] text-slate-400">
                              Completed: {task.completed_at}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Drawer: Selected Task Inspector (Microsoft To-Do Detail Pane) */}
        {selectedTask ? (
          <div className="w-full lg:w-80 bg-slate-50/60 p-4 space-y-4 animate-fadeIn shrink-0">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Task Details
              </span>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Complete Check */}
            <div className="flex items-start gap-2.5">
              <button
                onClick={() => onToggleTask(selectedTask.id)}
                className="mt-0.5 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer shrink-0"
              >
                {selectedTask.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400" />
                )}
              </button>
              <input
                type="text"
                value={selectedTask.title}
                onChange={(e) => {
                  const updated = { ...selectedTask, title: e.target.value };
                  setSelectedTask(updated);
                  onUpdateTask(updated);
                }}
                className={`w-full bg-transparent font-bold text-xs text-slate-900 border-b border-transparent focus:border-blue-400 focus:bg-white px-1 py-0.5 rounded transition-all ${
                  selectedTask.completed ? 'line-through text-slate-400' : ''
                }`}
              />
            </div>

            {/* Checklist / Sub-steps */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-600 block">
                Sub-steps ({selectedTask.steps?.length || 0})
              </span>
              <div className="space-y-1.5">
                {(selectedTask.steps || []).map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => handleToggleStep(step.id)}
                        className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
                      >
                        {step.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </button>
                      <span
                        className={`text-[11px] truncate ${
                          step.completed ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="text-slate-300 hover:text-rose-500 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add Step Input */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Add a step"
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStep(selectedTask.id);
                      }
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleAddStep(selectedTask.id)}
                    className="px-2 py-1 bg-slate-200 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions (My Day, Due Date, Matrix) */}
            <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
              <button
                onClick={() => {
                  const updated = { ...selectedTask, is_my_day: !selectedTask.is_my_day };
                  setSelectedTask(updated);
                  onUpdateTask(updated);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                  selectedTask.is_my_day
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>{selectedTask.is_my_day ? 'Added to My Day' : 'Add to My Day'}</span>
                </div>
                {selectedTask.is_my_day && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </button>

              <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Due Date
                  </label>
                  {selectedTask.due_date && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...selectedTask, due_date: undefined };
                        setSelectedTask(updated);
                        onUpdateTask(updated);
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={selectedTask.due_date || ''}
                  onChange={(e) => {
                    const updated = { ...selectedTask, due_date: e.target.value || undefined };
                    setSelectedTask(updated);
                    onUpdateTask(updated);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                />
              </div>

              {/* Optional Reminder Date & Time */}
              <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Bell className="w-3 h-3 text-amber-500" />
                    <span>Reminder</span>
                  </label>
                  {selectedTask.reminder && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...selectedTask, reminder: undefined };
                        setSelectedTask(updated);
                        onUpdateTask(updated);
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={selectedTask.reminder || ''}
                  onChange={(e) => {
                    const updated = { ...selectedTask, reminder: e.target.value || undefined };
                    setSelectedTask(updated);
                    onUpdateTask(updated);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                />
              </div>

              {/* Eisenhower Matrix Quadrant Assignment */}
              <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Priority Quadrant
                </label>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <select
                    value={selectedTask.urgency}
                    onChange={(e) => {
                      const updated = {
                        ...selectedTask,
                        urgency: e.target.value as 'urgent' | 'not_urgent',
                      };
                      setSelectedTask(updated);
                      onUpdateTask(updated);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-700"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="not_urgent">Not Urgent</option>
                  </select>

                  <select
                    value={selectedTask.importance}
                    onChange={(e) => {
                      const updated = {
                        ...selectedTask,
                        importance: e.target.value as 'important' | 'not_important',
                      };
                      setSelectedTask(updated);
                      onUpdateTask(updated);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-700"
                  >
                    <option value="important">Important</option>
                    <option value="not_important">Not Important</option>
                  </select>
                </div>
              </div>

              {/* Linked Tender */}
              {selectedTask.linked_tender_pr && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Linked Tender</span>
                    <span className="font-mono font-bold text-blue-900">{selectedTask.linked_tender_pr}</span>
                  </div>
                  {onOpenTender && (
                    <button
                      onClick={() => {
                        const target = tenders.find((t) => t.pr_no === selectedTask.linked_tender_pr);
                        if (target) onOpenTender(target);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Tender</span>
                    </button>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Add notes"
                  value={selectedTask.notes || ''}
                  onChange={(e) => {
                    const updated = { ...selectedTask, notes: e.target.value };
                    setSelectedTask(updated);
                    onUpdateTask(updated);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Delete Task button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onDeleteTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className="w-full py-1.5 px-2 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex w-72 bg-slate-50/50 p-6 flex-col items-center justify-center text-center text-slate-400 shrink-0">
            <ListTodo className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Select a task</p>
          </div>
        )}
      </div>
    </div>
  );
};
