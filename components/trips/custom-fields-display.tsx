import { customFieldIcon } from '@/lib/constants/custom-field-icons';

export interface TripCustomFieldData {
  label: string;
  value: string;
  icon?: string | null;
}

/**
 * The host's own stats for the trip — distance, gain, what to bring.
 *
 * The optional icon sits on the label line, at micro-label weight, so
 * it reads as part of the caption rather than as a second piece of
 * data. A field with no icon keeps exactly the same text baseline as
 * one with, so a partly-iconned set doesn't stagger.
 */
export function CustomFieldsDisplay({ fields }: { fields: TripCustomFieldData[] }) {
  if (fields.length === 0) return null;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fields.map((field, i) => {
        const Icon = customFieldIcon(field.icon);
        return (
          <div
            key={i}
            className="rounded-md border border-sand-200 bg-sand-50 p-3 dark:border-sand-800 dark:bg-[color:var(--page)]"
          >
            <p className="flex items-center gap-1.5 text-xs text-sand-500 dark:text-sand-400">
              {Icon && (
                <Icon
                  size={14}
                  weight="regular"
                  className="shrink-0 text-forest-600 dark:text-forest-400"
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0 truncate">{field.label}</span>
            </p>
            <p className="mt-0.5 text-sm font-semibold text-sand-900 dark:text-sand-100">
              {field.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
