import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { EmptyState, Skeleton } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide this column in the mobile card view. */
  hideOnMobile?: boolean;
  align?: 'left' | 'right';
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  empty?: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode };
  /** Optional element rendered at the right of each mobile card header (e.g. actions). */
  mobileActions?: (row: T) => ReactNode;
}

/** Table on ≥md screens, stacked cards on mobile. First column is the card title. */
export function DataTable<T>({ rows, columns, rowKey, loading, onRowClick, empty, mobileActions }: Props<T>) {
  if (loading) {
    return (
      <div className="card space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (rows.length === 0 && empty) return <EmptyState {...empty} />;

  const [first, ...rest] = columns;
  return (
    <>
      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={clsx('whitespace-nowrap px-4 py-3 font-semibold', c.align === 'right' && 'text-right', c.className)}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx('transition', onRowClick && 'cursor-pointer hover:bg-slate-800/40')}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={clsx('px-4 py-3 align-middle text-slate-300', c.align === 'right' && 'text-right', c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={clsx('card p-4', onRowClick && 'cursor-pointer active:bg-slate-800/40')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 font-semibold text-white">{first?.cell(row)}</div>
              {mobileActions && <div onClick={(e) => e.stopPropagation()}>{mobileActions(row)}</div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {rest
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c.header}</dt>
                    <dd className="mt-0.5 break-words text-slate-300">{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
