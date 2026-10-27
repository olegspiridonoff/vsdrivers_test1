import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Role } from '../../types';

/* ---------- Card ---------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="p-12 text-center">
      <p className="text-gray-400">{title}</p>
      {hint && <p className="text-gray-500 text-sm mt-2">{hint}</p>}
    </Card>
  );
}

/* ---------- Badge (role) ---------- */

const ROLE_STYLES: Record<Role, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  driver: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Руководитель',
  driver: 'Водитель',
};

export const roleLabel = (role: Role): string => ROLE_LABELS[role];

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${ROLE_STYLES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

/* ---------- Field + inputs ---------- */

const FIELD_CLASSES =
  'w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50';

const ICON_FIELD_CLASSES =
  'w-full pl-11 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-gray-400 text-sm mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...rest }, ref) {
    return <input ref={ref} {...rest} className={`${FIELD_CLASSES} ${className}`} />;
  }
);

export interface SelectOption {
  value: string | number;
  label: string;
}

export function SelectInput({
  options,
  className = '',
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }) {
  return (
    <select {...rest} className={`${FIELD_CLASSES} ${className}`}>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Поле с иконкой слева (форма входа/регистрации), опциональный элемент справа. */
export function IconField({
  icon,
  trailing,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-3 w-5 h-5 text-gray-500 [&>svg]:w-full [&>svg]:h-full">
        {icon}
      </span>
      <input {...rest} className={`${ICON_FIELD_CLASSES} ${trailing ? 'pr-11' : ''} ${className}`} />
      {trailing && <span className="absolute right-3 top-2.5 h-6 flex items-center text-gray-500">{trailing}</span>}
    </div>
  );
}

/** Поле пароля с кнопкой показа/скрытия. */
export function PasswordField({
  showPassword,
  onToggle,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { showPassword: boolean; onToggle: () => void }) {
  return (
    <IconField
      {...rest}
      type={showPassword ? 'text' : 'password'}
      icon={showPassword ? <Eye /> : <EyeOff />}
      trailing={
        <button type="button" onClick={onToggle} tabIndex={-1} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      }
    />
  );
}

/* ---------- Feedback ---------- */

export function Alert({ kind, message }: { kind: 'error' | 'success'; message: string }) {
  if (!message) return null;
  const Icon = kind === 'error' ? AlertCircle : CheckCircle2;
  const styles =
    kind === 'error'
      ? 'bg-red-500/10 border-red-500/30 text-red-400'
      : 'bg-green-500/10 border-green-500/30 text-green-400';
  return (
    <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${styles}`}>
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}
