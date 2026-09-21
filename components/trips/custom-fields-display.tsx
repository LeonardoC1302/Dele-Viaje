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
          className="rounded-md border border-sand-200 bg-sand-50 p-3 dark:border-sand-800 dark:bg-[color:var(--page)]"
        >
          <p className="text-xs text-sand-500 dark:text-sand-400">{field.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-sand-900 dark:text-sand-100">
            {field.value}
          </p>
        </div>
      ))}
    </div>
  );
}
