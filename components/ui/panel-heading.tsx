import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * The heading every panel inside a folder face uses.
 *
 * Structurally this is the top half of `Leaf` (see
 * `components/cordillera/folder.tsx`) as a standalone piece, for the
 * many panels that manage their own body layout and only need the
 * label. Both render the same thing — a micro-label over a hairline —
 * which is what makes an expenses list, a waitlist roster and an admin
 * queue read as the same product.
 */
export function PanelHeading({
  icon: PanelIcon,
  as: Tag = 'h2',
  action,
  children,
  className,
}: {
  icon?: Icon;
  as?: 'h2' | 'h3';
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-4 flex items-center justify-between gap-4 border-b border-sand-200 pb-2.5 dark:border-sand-800',
        className
      )}
    >
      <Tag className="micro-label flex items-center gap-2">
        {PanelIcon && <PanelIcon size={14} weight="fill" className="text-dawn-600 dark:text-dawn-400" />}
        {children}
      </Tag>
      {action}
    </div>
  );
}
