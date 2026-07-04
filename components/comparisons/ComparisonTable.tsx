'use client';

import * as React from 'react';
import { Trophy, Search, Check, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComparisonSpecView } from '@/lib/api/content';

interface ComparisonTableProps {
  rows: ComparisonSpecView[];
  labelA: string;
  labelB: string;
  brandA: string;
  brandB: string;
}

const norm = (s: string) => s.trim().toLowerCase();
const differs = (a: string, b: string) => {
  const na = norm(a), nb = norm(b);
  return na !== nb && !(na === '' && nb === '');
};
const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

/**
 * Premium, schema-driven spec comparison table (CSLifestyle design language).
 * Renders each row according to its `displayType` (boolean → yes/no icon, currency →
 * ₹, percentage → %, stars, progress bar, badge, number+unit, else text) and groups
 * rows by `group`. Winner per row comes from the backend winner engine — no invented
 * values. Keeps spec search, "differences only", sticky header/first column, a
 * responsive mobile layout, and full keyboard/screen-reader support.
 */
export function ComparisonTable({ rows, labelA, labelB, brandA, brandB }: ComparisonTableProps) {
  const [query, setQuery] = React.useState('');
  const [onlyDiff, setOnlyDiff] = React.useState(false);

  const diffCount = React.useMemo(() => rows.filter((r) => differs(r.productA, r.productB)).length, [rows]);

  const filtered = React.useMemo(() => {
    const q = norm(query);
    return rows.filter((r) => {
      if (onlyDiff && !differs(r.productA, r.productB)) return false;
      if (!q) return true;
      return norm(r.name).includes(q) || norm(r.productA).includes(q) || norm(r.productB).includes(q);
    });
  }, [rows, query, onlyDiff]);

  // Group filtered rows, preserving incoming order.
  const groups = React.useMemo<[string, ComparisonSpecView[]][]>(() => {
    const map = new Map<string, ComparisonSpecView[]>();
    for (const r of filtered) {
      const g = r.group || 'General';
      const list = map.get(g) ?? [];
      if (!map.has(g)) map.set(g, list);
      list.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const winnerBadge = (winner: string) =>
    winner === 'tie' ? (
      <span className="text-muted-foreground text-sm">Tie</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-sm font-medium">
        <Trophy className="w-4 h-4 text-green-500" aria-hidden="true" />
        <span>{winner === 'A' ? brandA : brandB}</span>
      </span>
    );

  // Schema-driven value renderer.
  const cell = (r: ComparisonSpecView, side: 'A' | 'B'): React.ReactNode => {
    const text = side === 'A' ? r.productA : r.productB;
    const num = side === 'A' ? r.numberValueA : r.numberValueB;
    const bool = side === 'A' ? r.booleanValueA : r.booleanValueB;
    const fallback = text || '—';
    switch (r.displayType) {
      case 'boolean':
        if (bool === null) return fallback;
        return bool ? (
          <span className="inline-flex items-center gap-1 text-green-600"><Check className="w-4 h-4" aria-hidden="true" /> Yes</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground"><X className="w-4 h-4" aria-hidden="true" /> No</span>
        );
      case 'currency':
        return num !== null ? inr(num) : fallback;
      case 'percentage':
        return num !== null ? `${num}%` : fallback;
      case 'number':
        return num !== null ? `${num}${r.unit ? ` ${r.unit}` : ''}` : fallback;
      case 'rating':
      case 'stars': {
        if (num === null) return fallback;
        const filled = Math.max(0, Math.min(5, Math.round(num)));
        return (
          <span className="inline-flex items-center gap-0.5" aria-label={`${num} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={cn('w-3.5 h-3.5', i < filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40')} aria-hidden="true" />
            ))}
          </span>
        );
      }
      case 'progress': {
        if (num === null) return fallback;
        const max = Math.max(r.numberValueA ?? 0, r.numberValueB ?? 0, 1);
        const pct = Math.max(0, Math.min(100, (num / max) * 100));
        return (
          <span className="inline-flex items-center gap-2 w-full max-w-[140px]">
            <span className="flex-1 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={num} aria-valuemin={0} aria-valuemax={max}>
              <span className="block h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-xs tabular-nums">{num}{r.unit ? ` ${r.unit}` : ''}</span>
          </span>
        );
      }
      case 'badge':
        return <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{fallback}</span>;
      default:
        return fallback;
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search specifications…"
            aria-label="Search specifications"
            className="w-full pl-9 pr-3 h-9 rounded-lg border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={onlyDiff}
            onClick={() => setOnlyDiff((v) => !v)}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              onlyDiff ? 'bg-brand-gradient' : 'bg-muted-foreground/30',
            )}
          >
            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', onlyDiff ? 'left-4' : 'left-0.5')} />
          </button>
          Show only differences
          <span className="text-muted-foreground">({diffCount})</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No specifications match your filters.
        </div>
      ) : (
        <>
          {/* Desktop table — grouped, sticky header + sticky first column */}
          <div className="hidden md:block overflow-x-auto rounded-xl border">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Specification comparison of {labelA} versus {labelB}, grouped by category</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 top-0 z-20 bg-muted/60 backdrop-blur text-left p-4 font-semibold min-w-[180px]">Specification</th>
                  <th scope="col" className="sticky top-0 z-10 bg-muted/60 backdrop-blur text-center p-4 font-semibold">{labelA}</th>
                  <th scope="col" className="sticky top-0 z-10 bg-muted/60 backdrop-blur text-center p-4 font-semibold">{labelB}</th>
                  <th scope="col" className="sticky top-0 z-10 bg-muted/60 backdrop-blur text-center p-4 font-semibold">Winner</th>
                </tr>
              </thead>
              {groups.map(([group, groupRows]) => (
                <tbody key={group}>
                  <tr>
                    <th scope="colgroup" colSpan={4} className="sticky left-0 z-10 bg-muted/30 text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </th>
                  </tr>
                  {groupRows.map((r) => {
                    const isDiff = differs(r.productA, r.productB);
                    return (
                      <tr key={r.name} className={cn('border-t', !isDiff && 'opacity-70')}>
                        <th scope="row" className="sticky left-0 z-10 bg-card text-left p-4 font-medium align-top">
                          {r.name}
                          {r.details && <span className="block text-xs text-muted-foreground font-normal mt-0.5">{r.details}</span>}
                        </th>
                        <td className={cn('p-4 text-center align-top', r.winner === 'A' && 'bg-green-500/5')}>
                          <span className={cn('inline-flex items-center gap-1', r.winner === 'A' && 'font-semibold text-green-600')}>
                            {r.winner === 'A' && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                            {cell(r, 'A')}
                          </span>
                        </td>
                        <td className={cn('p-4 text-center align-top', r.winner === 'B' && 'bg-green-500/5')}>
                          <span className={cn('inline-flex items-center gap-1', r.winner === 'B' && 'font-semibold text-green-600')}>
                            {r.winner === 'B' && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                            {cell(r, 'B')}
                          </span>
                        </td>
                        <td className="p-4 text-center align-top">{winnerBadge(r.winner)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>

          {/* Mobile stacked cards, grouped */}
          <div className="md:hidden space-y-5">
            {groups.map(([group, groupRows]) => (
              <div key={group}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group}</h3>
                <ul className="space-y-3">
                  {groupRows.map((r) => (
                    <li key={r.name} className="rounded-xl border bg-card p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-medium">{r.name}</span>
                        {winnerBadge(r.winner)}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={cn('rounded-lg p-3', r.winner === 'A' ? 'bg-green-500/5 border border-green-500/20' : 'bg-muted/40')}>
                          <p className="text-xs text-muted-foreground mb-1">{labelA}</p>
                          <div className={cn('text-sm', r.winner === 'A' && 'font-semibold text-green-600')}>{cell(r, 'A')}</div>
                        </div>
                        <div className={cn('rounded-lg p-3', r.winner === 'B' ? 'bg-green-500/5 border border-green-500/20' : 'bg-muted/40')}>
                          <p className="text-xs text-muted-foreground mb-1">{labelB}</p>
                          <div className={cn('text-sm', r.winner === 'B' && 'font-semibold text-green-600')}>{cell(r, 'B')}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
