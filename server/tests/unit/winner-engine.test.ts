import { describe, it, expect } from 'vitest';
import { resolveSpecWinner } from '../../src/services/content/winner-engine';

describe('winner engine — resolveSpecWinner', () => {
  it('manual mode uses the editorial winner', () => {
    expect(resolveSpecWinner({ winnerMode: 'manual', winner: 'A' })).toBe('A');
    expect(resolveSpecWinner({ winnerMode: 'manual', winner: 'B' })).toBe('B');
    expect(resolveSpecWinner({ winnerMode: 'manual', winner: 'tie' })).toBe('tie');
    expect(resolveSpecWinner({ winnerMode: 'manual', winner: null })).toBeNull();
    expect(resolveSpecWinner({ winnerMode: 'manual', winner: 'garbage' })).toBeNull();
  });

  it('higher_better picks the larger number', () => {
    expect(resolveSpecWinner({ winnerMode: 'higher_better', numberValueA: 120, numberValueB: 90 })).toBe('A');
    expect(resolveSpecWinner({ winnerMode: 'higher_better', numberValueA: 60, numberValueB: 90 })).toBe('B');
    expect(resolveSpecWinner({ winnerMode: 'higher_better', numberValueA: 90, numberValueB: 90 })).toBe('tie');
  });

  it('lower_better picks the smaller number (e.g. weight, price)', () => {
    expect(resolveSpecWinner({ winnerMode: 'lower_better', numberValueA: 170, numberValueB: 190 })).toBe('A');
    expect(resolveSpecWinner({ winnerMode: 'lower_better', numberValueA: 200, numberValueB: 190 })).toBe('B');
  });

  it('never invents a winner when numeric data is missing', () => {
    expect(resolveSpecWinner({ winnerMode: 'higher_better', numberValueA: null, numberValueB: 90 })).toBeNull();
    expect(resolveSpecWinner({ winnerMode: 'lower_better', numberValueA: 100 })).toBeNull();
    expect(resolveSpecWinner({ winnerMode: 'higher_better' })).toBeNull();
  });

  it('equal always ties; none yields no winner', () => {
    expect(resolveSpecWinner({ winnerMode: 'equal', numberValueA: 1, numberValueB: 2 })).toBe('tie');
    expect(resolveSpecWinner({ winnerMode: 'none', winner: 'A' })).toBeNull();
  });
});
