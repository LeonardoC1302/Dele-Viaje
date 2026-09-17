import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, errorText, ...props }, ref) => (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
          {props.required && <span className="text-red-600"> *</span>}
        </label>
      )}
      <textarea
        className={cn(
          'flex min-h-28 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:placeholder:text-neutral-400',
          error && 'border-red-500 focus-visible:ring-red-600',
          className
        )}
        ref={ref}
        {...props}
      />
      {errorText && error && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorText}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
