// Characterization tests for src/utils/setDisplay.js.
//
// These tests pin CURRENT behavior — they're not aspirational. Unlike
// the three mirrored utilities (epley, classification, exerciseNameNormalize)
// this file is local to the client, but the same discipline applies:
// behavior is frozen, the tests document what the code actually does,
// and any future change requires a deliberate decision.
//
// Two pure functions:
//   - collapseSetDetails: groups identical sets by `${reps}|${weight}`,
//     preserving first-seen order. Returns [{ count, reps, weight }].
//   - formatSetLine: renders a single grouped set as "NxR @ W lbs"
//     (or "NxR @ BW" when weight === 0).

import { describe, it, expect } from 'vitest';
import { collapseSetDetails, formatSetLine } from './setDisplay.js';

describe('collapseSetDetails', () => {
  describe('happy path — grouping by reps+weight key', () => {
    it('returns empty array for empty input', () => {
      expect(collapseSetDetails([])).toEqual([]);
    });

    it('returns count:1 for a single set', () => {
      expect(collapseSetDetails([{ reps: 5, weight: 100 }]))
        .toEqual([{ count: 1, reps: 5, weight: 100 }]);
    });

    it('groups three identical sets into count:3', () => {
      const result = collapseSetDetails([
        { reps: 5, weight: 100 },
        { reps: 5, weight: 100 },
        { reps: 5, weight: 100 },
      ]);
      expect(result).toEqual([{ count: 3, reps: 5, weight: 100 }]);
    });

    it('groups non-adjacent identical sets (order in input does not affect grouping)', () => {
      const result = collapseSetDetails([
        { reps: 5, weight: 100 },
        { reps: 8, weight: 150 },
        { reps: 5, weight: 100 },
      ]);
      expect(result).toEqual([
        { count: 2, reps: 5, weight: 100 },
        { count: 1, reps: 8, weight: 150 },
      ]);
    });

    it('separates sets that differ in reps OR weight', () => {
      const result = collapseSetDetails([
        { reps: 5, weight: 100 },
        { reps: 5, weight: 105 },   // diff weight → diff key
        { reps: 6, weight: 100 },   // diff reps → diff key
      ]);
      expect(result).toEqual([
        { count: 1, reps: 5, weight: 100 },
        { count: 1, reps: 5, weight: 105 },
        { count: 1, reps: 6, weight: 100 },
      ]);
    });

    it('groups bodyweight sets (weight === 0) the same as any other weight', () => {
      const result = collapseSetDetails([
        { reps: 10, weight: 0 },
        { reps: 10, weight: 0 },
      ]);
      expect(result).toEqual([{ count: 2, reps: 10, weight: 0 }]);
    });
  });

  describe('first-seen ordering', () => {
    it('preserves first-occurrence order in output', () => {
      const result = collapseSetDetails([
        { reps: 8, weight: 150 },   // 1st seen
        { reps: 5, weight: 100 },   // 2nd seen
        { reps: 8, weight: 150 },   // increments 1st group, no reorder
      ]);
      expect(result.map(g => `${g.reps}|${g.weight}`))
        .toEqual(['8|150', '5|100']);
    });

    it('first-seen reps/weight values stick; later same-key entries only bump count', () => {
      // Source line 9: `map.set(key, { count: 0, reps: s.reps, weight: s.weight })`
      // only runs when the key isn't already in the map. Subsequent same-key
      // entries hit line 12 (`map.get(key).count += 1`) which doesn't touch
      // reps/weight. Observable when the two entries stringify to the same
      // key but differ by type — see the next test.
      const result = collapseSetDetails([
        { reps: 5, weight: 100 },         // reps:5 (number) wins
        { reps: '5', weight: '100' },     // same key "5|100"; only count bumps
      ]);
      expect(result).toEqual([{ count: 2, reps: 5, weight: 100 }]);
    });
  });

  describe('string-template key behavior', () => {
    it('treats number 100 and string "100" as the same key (template literal stringifies)', () => {
      // Source line 7: `const key = \`${s.reps}|${s.weight}\``.
      // Template literals call toString on each interpolation, so
      // number 100 and string '100' both produce '100' → same key.
      const result = collapseSetDetails([
        { reps: 5, weight: 100 },
        { reps: 5, weight: '100' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
    });
  });
});

describe('formatSetLine', () => {
  describe('weighted sets', () => {
    it('formats a standard weighted set as "NxR @ W lbs"', () => {
      expect(formatSetLine({ count: 3, reps: 8, weight: 150 }))
        .toBe('3x8 @ 150 lbs');
    });

    it('preserves count === 1 (does NOT collapse to "R @ W lbs")', () => {
      // Source-file comment (lines 18-19): "count may be 1 — render
      // '1x8 @ 150 lbs' rather than collapsing the count away;
      // preserves visual rhythm in mixed-set displays."
      expect(formatSetLine({ count: 1, reps: 8, weight: 150 }))
        .toBe('1x8 @ 150 lbs');
    });

    it('uses Number.prototype.toLocaleString for thousands (locale-aware separator)', () => {
      // Source line 21: `${weight.toLocaleString()} lbs`. With no
      // argument toLocaleString uses the runtime's default locale.
      // Compute expected via the same call to stay locale-independent.
      const result = formatSetLine({ count: 1, reps: 1, weight: 1500 });
      expect(result).toBe(`1x1 @ ${(1500).toLocaleString()} lbs`);
    });

    it('handles fractional weights via toLocaleString', () => {
      const result = formatSetLine({ count: 2, reps: 5, weight: 2.5 });
      expect(result).toBe(`2x5 @ ${(2.5).toLocaleString()} lbs`);
    });
  });

  describe('bodyweight branch', () => {
    it('renders weight === 0 as "BW"', () => {
      expect(formatSetLine({ count: 3, reps: 10, weight: 0 }))
        .toBe('3x10 @ BW');
    });

    it('preserves count === 1 in BW form: "1xR @ BW"', () => {
      expect(formatSetLine({ count: 1, reps: 10, weight: 0 }))
        .toBe('1x10 @ BW');
    });

    it('does NOT treat weight === "0" (string) as BW (strict === 0 check)', () => {
      // Source line 21: `weight === 0 ? 'BW' : ...` is strict equality,
      // so string '0' falls into the else branch. String.prototype
      // .toLocaleString returns the string unchanged.
      expect(formatSetLine({ count: 1, reps: 5, weight: '0' }))
        .toBe('1x5 @ 0 lbs');
    });
  });
});
