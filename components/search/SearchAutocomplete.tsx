'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { discoveryApi, type SearchSuggestion, type SuggestionType } from '@/lib/api/discovery';

/**
 * Shared predictive search box used by the navbar (desktop + mobile) and the homepage
 * hero. Single source of truth for autocomplete behaviour — DB-backed grouped suggestions
 * (GET /api/search/suggestions), 200ms debounce, ArrowUp/Down/Enter/Escape + mouse, a
 * trailing "Search for …" row — so every search box stays consistent. Styling is supplied
 * by the caller (wrapper/input/icon classes) so each location keeps its exact UI.
 */

/** Autocomplete group display order + headers (predictive search). */
const SUGGESTION_GROUPS: { type: SuggestionType; label: string }[] = [
  { type: 'product', label: 'Products' },
  { type: 'category', label: 'Categories' },
  { type: 'brand', label: 'Brands' },
  { type: 'guide', label: 'Guides' },
  { type: 'comparison', label: 'Comparisons' },
  { type: 'popular', label: 'Popular searches' },
];

export interface SearchAutocompleteProps {
  /** Input placeholder. */
  placeholder?: string;
  /** Wrapper classes (added to the required `relative`). */
  className?: string;
  /** Exact Input classes for this location (preserves existing styling). */
  inputClassName?: string;
  /** Exact leading search-icon classes for this location. */
  iconClassName?: string;
  /** Optional trailing submit button (e.g. the hero "Search" button). */
  button?: { label: string; className: string };
  /** Extra side-effect after a search navigates (e.g. close the mobile menu). */
  onSearch?: () => void;
}

export function SearchAutocomplete({
  placeholder,
  className,
  inputClassName,
  iconClassName,
  button,
  onSearch,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const seqRef = React.useRef(0);
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autocomplete: fetch DB-backed suggestions as the user types (≥2 chars).
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); setActiveIdx(-1); return; }
    const seq = ++seqRef.current;
    const timer = setTimeout(() => {
      discoveryApi
        .suggestions(q)
        .then((s) => {
          if (seq !== seqRef.current) return; // a newer keystroke superseded this
          setSuggestions(s.slice(0, 8));
          setActiveIdx(-1);
        })
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Navigate to the results page. Enter searches the current input; a chosen suggestion
  // searches that suggestion. The /search page reads ?q=.
  const runSearch = (term?: string) => {
    const q = (term ?? query).trim();
    if (!q) return;
    if (term && term !== query) setQuery(term);
    setShowSuggest(false);
    setActiveIdx(-1);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onSearch?.();
  };

  // Group suggestions by source (display order) and flatten for keyboard navigation.
  const orderedGroups = React.useMemo(
    () => SUGGESTION_GROUPS.map((g) => ({ ...g, items: suggestions.filter((s) => s.type === g.type) })).filter((g) => g.items.length > 0),
    [suggestions],
  );
  const ordered = React.useMemo(() => orderedGroups.flatMap((g) => g.items), [orderedGroups]);
  // Navigable rows = each suggestion + the trailing "Search for …" row (index === ordered.length).

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (ordered.length) { setShowSuggest(true); setActiveIdx((i) => Math.min(i + 1, ordered.length)); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // A highlighted suggestion searches its label; the "Search for …" row or no
      // selection searches the raw input.
      runSearch(activeIdx >= 0 && activeIdx < ordered.length ? ordered[activeIdx].label : undefined);
    } else if (e.key === 'Escape') {
      setShowSuggest(false);
      setActiveIdx(-1);
    }
  };

  const onBlur = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setShowSuggest(false), 120); // allow click to register
  };

  const rawQuery = query.trim();
  const offsets: number[] = [];
  orderedGroups.reduce((acc, g, i) => { offsets[i] = acc; return acc + g.items.length; }, 0);

  return (
    <div className={cn('relative', className)}>
      <Search className={iconClassName} />
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }}
        onFocus={() => { if (suggestions.length) setShowSuggest(true); }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showSuggest && ordered.length > 0}
        aria-autocomplete="list"
        className={inputClassName}
      />
      {button && (
        <Button onClick={() => runSearch()} className={button.className}>
          {button.label}
        </Button>
      )}

      {/* Predictive autocomplete dropdown — grouped by type, trailing "Search for …" row.
          Reuses the existing popover styling (mega-menu look); no redesign. */}
      {showSuggest && ordered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <ul className="rounded-xl border bg-popover p-2 shadow-lg max-h-96 overflow-auto" role="listbox">
            {orderedGroups.map((g, gi) => (
              <React.Fragment key={g.type}>
                <li className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground" role="presentation">{g.label}</li>
                {g.items.map((s, ii) => {
                  const idx = offsets[gi] + ii;
                  return (
                    <li key={`${g.type}:${s.label}`} role="option" aria-selected={activeIdx === idx}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); runSearch(s.label); }}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent',
                          activeIdx === idx && 'bg-accent',
                        )}
                      >
                        <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{s.label}</span>
                      </button>
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
            {rawQuery && (
              <li role="option" aria-selected={activeIdx === ordered.length} className="mt-1 border-t pt-1">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); runSearch(); }}
                  onMouseEnter={() => setActiveIdx(ordered.length)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent',
                    activeIdx === ordered.length && 'bg-accent',
                  )}
                >
                  <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">Search for &ldquo;{rawQuery}&rdquo;</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
