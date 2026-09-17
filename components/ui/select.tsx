'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  name?: string;
}

function Select({
  label,
  helperText,
  error,
  errorText,
  required,
  placeholder,
  value,
  onValueChange,
  options,
  className,
  name,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}

      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        name={name}
      >
        <SelectPrimitive.Trigger
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100',
            error && 'border-red-500 focus-visible:ring-red-600',
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <CaretDown
              size={16}
              weight="regular"
              strokeWidth={1.5}
              className="text-neutral-500"
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex h-9 cursor-pointer select-none items-center rounded-md px-3 pr-8 text-sm text-neutral-900 outline-none data-[highlighted]:bg-forest-50 data-[state=checked]:font-medium data-[state=checked]:text-forest-700 dark:text-neutral-100 dark:data-[highlighted]:bg-neutral-800 dark:data-[state=checked]:text-forest-400"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center">
                    <Check size={16} weight="bold" className="text-forest-600 dark:text-forest-400" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {errorText && error && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorText}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
}

export { Select };
