import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Form controls as pressed wells.
 *
 * Inputs sit on `--sunken`, a step *down* the sand ramp from the folder
 * face they're on, so a field reads as something pressed into the sheet
 * rather than another card floating on it. That is the same "depth by
 * tint, not shadow" rule the rest of the system runs on, applied in the
 * other direction.
 *
 * The label is the system's micro-label, which means a form region and
 * a data panel are labelled identically — the thing that makes a trip
 * form and an admin queue read as one product.
 */

const controlClasses =
  'w-full rounded-md border border-sand-300 bg-[color:var(--sunken)] px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 transition-colors focus-visible:border-forest-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sand-700 dark:text-sand-50 dark:placeholder:text-sand-500 dark:focus-visible:border-forest-400';

export function FieldShell({
  label,
  required,
  helperText,
  error,
  errorText,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={htmlFor} className="micro-label text-sand-600 dark:text-sand-400">
          {label}
          {required && <span className="text-dawn-600 dark:text-dawn-400"> *</span>}
        </label>
      )}
      {children}
      {error && errorText && (
        <p className="text-xs text-red-700 dark:text-red-400">{errorText}</p>
      )}
      {helperText && !error && (
        <p className="text-xs leading-relaxed text-sand-500 dark:text-sand-400">
          {helperText}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Classes for the field wrapper (sizing in a row); `className` styles the control itself. */
  wrapperClassName?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, type, label, helperText, error, errorText, id, ...props }, ref) => {
    const reactId = React.useId();
    const fieldId = id ?? reactId;

    return (
      <FieldShell
        label={label}
        required={props.required}
        helperText={helperText}
        error={error}
        errorText={errorText}
        htmlFor={fieldId}
        className={wrapperClassName}
      >
        <input
          id={fieldId}
          type={type}
          ref={ref}
          aria-invalid={error || undefined}
          className={cn(
            controlClasses,
            'h-10',
            error && 'border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/30',
            className
          )}
          {...props}
        />
      </FieldShell>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Classes for the field wrapper (sizing in a row); `className` styles the control itself. */
  wrapperClassName?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, wrapperClassName, label, helperText, error, errorText, id, ...props }, ref) => {
    const reactId = React.useId();
    const fieldId = id ?? reactId;

    return (
      <FieldShell
        label={label}
        required={props.required}
        helperText={helperText}
        error={error}
        errorText={errorText}
        htmlFor={fieldId}
        className={wrapperClassName}
      >
        <textarea
          id={fieldId}
          ref={ref}
          aria-invalid={error || undefined}
          className={cn(
            controlClasses,
            'min-h-28 leading-relaxed',
            error && 'border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/30',
            className
          )}
          {...props}
        />
      </FieldShell>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, controlClasses };
