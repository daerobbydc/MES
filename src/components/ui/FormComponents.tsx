"use client";

import React, { Fragment } from "react";
import { X, Loader2, Inbox } from "lucide-react";

// ─── 1. FormField ──────────────────────────────────────────────
export function FormField({
  label,
  required,
  error,
  helpText,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-surface-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-surface-400 mt-1">{helpText}</p>
      )}
    </div>
  );
}

// ─── 2. FormInput ──────────────────────────────────────────────
export function FormInput({
  label,
  required,
  error,
  helpText,
  className = "",
  ...props
}: {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormField label={label} required={required} error={error} helpText={helpText}>
      <input
        className={`input-field ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""} ${className}`}
        {...props}
      />
    </FormField>
  );
}

// ─── 3. FormSelect ─────────────────────────────────────────────
export function FormSelect({
  label,
  required,
  error,
  helpText,
  options,
  loading,
  className = "",
  ...props
}: {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  options: { value: string; label: string }[];
  loading?: boolean;
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FormField label={label} required={required} error={error} helpText={helpText}>
      <select
        className={`select ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""} ${className}`}
        disabled={loading || props.disabled}
        {...props}
      >
        {props.placeholder && (
          <option value="">
            {loading ? "Loading..." : props.placeholder}
          </option>
        )}
        {!props.placeholder && loading && (
          <option value="">Loading...</option>
        )}
        {!loading && options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

// ─── 4. FormTextarea ───────────────────────────────────────────
export function FormTextarea({
  label,
  required,
  error,
  helpText,
  className = "",
  ...props
}: {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FormField label={label} required={required} error={error} helpText={helpText}>
      <textarea
        className={`input-field resize-none ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""} ${className}`}
        rows={props.rows || 3}
        {...props}
      />
    </FormField>
  );
}

// ─── 5. FormGrid ───────────────────────────────────────────────
export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

// ─── 6. FormActions ────────────────────────────────────────────
export function FormActions({
  onCancel,
  onSave,
  saving,
  saveLabel = "Save",
  disabled,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-100">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2.5 rounded-xl border border-surface-200 text-surface-600 hover:bg-surface-50 transition-all duration-200 font-medium disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="btn-primary flex items-center gap-2"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saveLabel}
      </button>
    </div>
  );
}

// ─── 7. Modal ──────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div
        className={`bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full ${maxWidth} p-7 animate-in scale-in duration-300 border border-white/60`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-surface-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

// ─── 8. EmptyState ─────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-surface-300" />
      </div>
      <h3 className="text-lg font-semibold text-surface-700 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 max-w-sm">{description}</p>
    </div>
  );
}

// ─── 9. LoadingSpinner ─────────────────────────────────────────
export function LoadingSpinner({
  size = 24,
  text,
}: {
  size?: number;
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 size={size} className="animate-spin text-primary-500" />
      {text && <p className="text-sm text-surface-500 font-medium">{text}</p>}
    </div>
  );
}

// ─── 10. StatusBadge ───────────────────────────────────────────
const defaultColors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
  DONE: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
  RUNNING: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
  "IN PROGRESS": "bg-blue-50 text-blue-700 border border-blue-200/50",
  "IN-PROGRESS": "bg-blue-50 text-blue-700 border border-blue-200/50",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200/50",
  IDLE: "bg-amber-50 text-amber-700 border border-amber-200/50",
  PLANNED: "bg-surface-100 text-surface-600 border border-surface-200/50",
  DRAFT: "bg-surface-100 text-surface-600 border border-surface-200/50",
  DOWN: "bg-rose-50 text-rose-700 border border-rose-200/50",
  INACTIVE: "bg-rose-50 text-rose-700 border border-rose-200/50",
  CANCELLED: "bg-rose-50 text-rose-700 border border-rose-200/50",
  MAINTENANCE: "bg-blue-50 text-blue-700 border border-blue-200/50",
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
  REJECTED: "bg-rose-50 text-rose-700 border border-rose-200/50",
  OPEN: "bg-blue-50 text-blue-700 border border-blue-200/50",
  CLOSED: "bg-surface-100 text-surface-600 border border-surface-200/50",
};

export function StatusBadge({
  status,
  colors,
}: {
  status: string;
  colors?: Record<string, string>;
}) {
  const merged = { ...defaultColors, ...colors };
  const colorClass = merged[status?.toUpperCase()] || "bg-surface-100 text-surface-600 border border-surface-200/50";

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${colorClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
