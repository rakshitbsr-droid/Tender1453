import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { TenderStage, UserRole } from '../types';
import { getStageBadgeColor, roleName } from '../utils/tenderUtils';

// Shared building blocks so every page looks and behaves the same.
// Type scale: page title text-xl, section title text-base, body/table text-sm, labels/meta text-xs.
// Nothing smaller than text-xs. Sentence case everywhere; no ALL-CAPS headings.

type IconType = React.ComponentType<{ className?: string }>;

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Title block at the top of every page: what this page is, in one plain sentence, plus its main actions. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: IconType;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 leading-tight">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1 max-w-3xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={cx('bg-white border border-slate-200 rounded-xl shadow-xs', padded && 'p-5', className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-wrap items-end justify-between gap-3 mb-3', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const STAT_TONES = {
  neutral: 'text-slate-900',
  blue: 'text-blue-700',
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-rose-700',
} as const;

/** One headline number. Pass onClick to make the whole card a button. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  onClick,
  active,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: IconType;
  tone?: keyof typeof STAT_TONES;
  onClick?: () => void;
  active?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-500">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>
      <div className={cx('text-2xl font-semibold mt-1 tabular-nums whitespace-nowrap', STAT_TONES[tone])}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </>
  );
  const base = cx(
    'bg-white border rounded-xl p-4 text-left w-full',
    active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
  );
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={cx(base, 'hover:border-blue-300 transition-colors cursor-pointer')}>
      {body}
    </button>
  );
}

const ROLE_STYLES: Record<string, string> = {
  PM: 'bg-blue-50 text-blue-700 border-blue-200',
  FM: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CEC: 'bg-amber-50 text-amber-800 border-amber-200',
  ADMIN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

/** Shows the team in words ("Procurement"), never the bare code ("PM"). */
export function RoleBadge({ role, className }: { role: UserRole | string | ''; className?: string }) {
  if (!role) return null;
  return (
    <span
      className={cx(
        'inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap',
        ROLE_STYLES[role] ?? 'bg-slate-50 text-slate-600 border-slate-200',
        className
      )}
    >
      {roleName(role)}
    </span>
  );
}

export function StageBadge({ stage, className }: { stage: TenderStage | string; className?: string }) {
  const c = getStageBadgeColor(stage as TenderStage);
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap',
        c.bg,
        c.text,
        c.border,
        className
      )}
    >
      <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
      {stage}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
};

/** Normal priority renders nothing: only exceptions deserve attention. */
export function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority];
  if (!style) return null;
  return (
    <span className={cx('inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap', style)}>
      {priority} priority
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: IconType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent',
  danger: 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300',
} as const;

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  children,
  className,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md';
  icon?: IconType;
}) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        BUTTON_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
}

/** A small set of mutually exclusive choices (2-5). Use a <select> for anything longer. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-slate-500 whitespace-nowrap">{label}</span>}
      <div role="group" aria-label={label} className="inline-flex bg-slate-100 rounded-lg p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={cx(
              'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
              o.value === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/** Progressive disclosure: keep secondary detail one click away instead of always on screen. */
export function Collapsible({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className={cx('bg-white border border-slate-200 rounded-xl shadow-xs', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-slate-50 rounded-xl"
      >
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          {description && <div className="text-sm text-slate-500 mt-0.5">{description}</div>}
        </div>
        <ChevronDown className={cx('w-5 h-5 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={panelId} className="px-5 pb-5 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

/** One look for every text input, select and textarea. */
export const inputClass =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

/** Label above a form control, with optional help text and an inline error. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-600 ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600 mt-1" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>
      )}
    </div>
  );
}

/** Two-line label/value pair used in detail panels. */
export function Detail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5">{children}</dd>
    </div>
  );
}

/** Centered dialog with a backdrop. The caller supplies the header, body and footer. */
export function ModalShell({
  onClose,
  labelledBy,
  size = 'md',
  children,
  className,
}: {
  onClose: () => void;
  labelledBy: string;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
}) {
  useDismiss(onClose);
  const width = size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx('bg-white border border-slate-200 rounded-xl w-full shadow-xl flex flex-col max-h-[92vh] overflow-hidden', width, className)}
      >
        {children}
      </div>
    </div>
  );
}

/** For modals and popovers: Escape closes, and the page behind stops scrolling while open. */
export function useDismiss(onClose: () => void, options: { lockScroll?: boolean } = {}) {
  const { lockScroll = true } = options;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      if (lockScroll) document.body.style.overflow = previous;
    };
  }, [onClose, lockScroll]);
}
