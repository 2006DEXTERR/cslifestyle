/**
 * Comparison winner engine — decides the per-spec winner from its `winnerMode`.
 * Pure + synchronous so it is unit-tested directly and reused by the presenter.
 *
 * Modes:
 *   - manual        → use the editorially-set `winner` ('A' | 'B' | 'tie').
 *   - higher_better → numeric compare, larger wins.
 *   - lower_better  → numeric compare, smaller wins.
 *   - equal         → always a tie.
 *   - none          → no winner shown.
 *
 * NEVER invents a result: numeric modes return `null` when either value is missing,
 * so the UI simply shows no winner rather than a fabricated one.
 */

export type SpecWinner = 'A' | 'B' | 'tie';
export type SpecWinnerResult = SpecWinner | null;

export interface SpecWinnerInput {
  winnerMode: string; // SpecWinnerMode enum value
  winner?: string | null; // legacy/editorial winner
  numberValueA?: number | null;
  numberValueB?: number | null;
}

function normalizeWinner(w: string | null | undefined): SpecWinnerResult {
  return w === 'A' || w === 'B' || w === 'tie' ? w : null;
}

export function resolveSpecWinner(s: SpecWinnerInput): SpecWinnerResult {
  switch (s.winnerMode) {
    case 'none':
      return null;
    case 'equal':
      return 'tie';
    case 'higher_better':
    case 'lower_better': {
      const a = s.numberValueA;
      const b = s.numberValueB;
      if (a === null || a === undefined || b === null || b === undefined) return null;
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      if (a === b) return 'tie';
      const aWins = s.winnerMode === 'higher_better' ? a > b : a < b;
      return aWins ? 'A' : 'B';
    }
    case 'manual':
    default:
      return normalizeWinner(s.winner);
  }
}
