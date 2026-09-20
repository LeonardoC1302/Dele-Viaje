export interface TripCustomFieldData {
  label: string;
  value: string;
}

export function CustomFieldsDisplay({ fields }: { fields: TripCustomFieldData[] }) {
  if (fields.length === 0) return null;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fields.map((field, i) => (
        <div
          key={i}
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"
        >
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{field.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {field.value}
          </p>
        </div>
      ))}
    </div>
  );
}
