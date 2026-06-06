// Tests for src/utils/customExercises.js.
//
// New helper (not characterization-of-existing-source — this file
// didn't exist before Batch 3) extracted from three byte-identical
// inline copies in customDay.jsx, history.jsx, and logger.jsx. Tests
// pin the public contract the extracted helper is expected to honor.
//
// Two exports here in Batch 3:
//   - getCustomExerciseNames: pure read of `localStorage.customExercises`,
//     try/catch swallow on JSON parse errors → `[]`.
//   - addToCustomExercises: case-insensitive dedup, localStorage write,
//     best-effort POST. Side effects are documented in the module header.
//
// The other two helpers named in the Batch 3 plan (`getAllExerciseNames`,
// `isValidExercise`) were added in Batch 12 once the catalog name list moved
// into config/exercises.js; their tests are at the bottom of this file.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { API_URL } from '../config/api.js';
import { ALL_EXERCISE_NAMES } from '../config/exercises.js';
import {
  getCustomExerciseNames,
  addToCustomExercises,
  getAllExerciseNames,
  isValidExercise,
} from './customExercises.js';

describe('getCustomExerciseNames', () => {
  beforeEach(() => localStorage.clear());

  it('returns [] when the customExercises key is not present in localStorage', () => {
    expect(getCustomExerciseNames()).toEqual([]);
  });

  it('returns the parsed array when valid JSON is stored', () => {
    localStorage.setItem('customExercises', JSON.stringify(['Pendlay Row', 'Zercher Squat']));
    expect(getCustomExerciseNames()).toEqual(['Pendlay Row', 'Zercher Squat']);
  });

  it('returns [] when the stored value is malformed JSON (try/catch swallow)', () => {
    // Pins the defensive `catch { return []; }` branch. Without it a
    // corrupted localStorage entry (cross-tab race, hand-edited storage,
    // partial write) would crash every consumer of this helper.
    localStorage.setItem('customExercises', '{not valid json');
    expect(getCustomExerciseNames()).toEqual([]);
  });
});

describe('addToCustomExercises', () => {
  let fetchSpy;

  beforeEach(() => {
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('localStorage path', () => {
    it('writes a new name to an empty list', () => {
      addToCustomExercises('Pendlay Row');
      expect(JSON.parse(localStorage.getItem('customExercises'))).toEqual(['Pendlay Row']);
    });

    it('appends to an existing list (does not overwrite)', () => {
      localStorage.setItem('customExercises', JSON.stringify(['Zercher Squat']));
      addToCustomExercises('Pendlay Row');
      expect(JSON.parse(localStorage.getItem('customExercises')))
        .toEqual(['Zercher Squat', 'Pendlay Row']);
    });

    it('is idempotent on case-insensitive match — no duplicate added, original casing preserved', () => {
      // Source: `if (existing.some(n => n.toLowerCase() === name.toLowerCase())) return;`
      // The case-insensitive comparison means "pendlay row" matches the
      // existing "Pendlay Row" and triggers the early return — the stored
      // value's original casing stays put.
      localStorage.setItem('customExercises', JSON.stringify(['Pendlay Row']));
      addToCustomExercises('pendlay row');
      expect(JSON.parse(localStorage.getItem('customExercises'))).toEqual(['Pendlay Row']);
    });
  });

  describe('backend POST — best-effort', () => {
    it('does NOT fire fetch when userId is absent from localStorage', () => {
      // Source: `const userId = localStorage.getItem('userId'); if (userId) { fetch(...) }`
      // The guard means no userId → no fetch. Pinning this matters because
      // calling fetch on the unkeyed URL would either hit the wrong endpoint
      // or 401 in production; either way silent breakage.
      addToCustomExercises('Pendlay Row');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem('customExercises'))).toEqual(['Pendlay Row']);
    });

    it('does NOT fire fetch on the idempotent no-op path (early return short-circuits everything)', () => {
      // If the name is already present, the function returns BEFORE writing
      // localStorage or firing the fetch. Pins that idempotency saves both
      // I/O channels, not just localStorage.
      localStorage.setItem('userId', 'user-42');
      localStorage.setItem('customExercises', JSON.stringify(['Pendlay Row']));
      addToCustomExercises('pendlay row');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem('customExercises'))).toEqual(['Pendlay Row']);
    });

    it('fires a POST with { name } body to the userId-keyed endpoint when userId is present', async () => {
      localStorage.setItem('userId', 'user-42');
      let receivedBody = null;
      server.use(
        http.post(`${API_URL}/api/users/user-42/custom-exercises`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ ok: true });
        }),
      );

      addToCustomExercises('Pendlay Row');

      // Fetch is invoked synchronously inside the function; the spy
      // records the call immediately. The body itself resolves via MSW
      // on a later microtask — wait for it.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_URL}/api/users/user-42/custom-exercises`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
      await vi.waitFor(() => expect(receivedBody).toEqual({ name: 'Pendlay Row' }));
    });

    it('swallows fetch rejection — does not throw, localStorage write persists', async () => {
      localStorage.setItem('userId', 'user-42');
      server.use(
        http.post(`${API_URL}/api/users/user-42/custom-exercises`, () => HttpResponse.error()),
      );

      // The `.catch(() => {})` in the source must not let the rejection
      // surface to the caller.
      expect(() => addToCustomExercises('Pendlay Row')).not.toThrow();

      // localStorage write precedes the fetch; the write persists
      // regardless of whether the server-side sync succeeded. This is
      // the documented contract: localStorage is source-of-truth for the
      // current device; backend sync is best-effort cross-device.
      expect(JSON.parse(localStorage.getItem('customExercises'))).toEqual(['Pendlay Row']);
      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    });
  });
});

describe('getAllExerciseNames', () => {
  beforeEach(() => localStorage.clear());

  it('returns just the catalog names when there are no custom exercises', () => {
    expect(getAllExerciseNames()).toEqual(ALL_EXERCISE_NAMES);
  });

  it('appends the user custom names after the catalog names', () => {
    localStorage.setItem('customExercises', JSON.stringify(['Sled Push', 'Yoke Carry']));
    const result = getAllExerciseNames();
    expect(result).toEqual([...ALL_EXERCISE_NAMES, 'Sled Push', 'Yoke Carry']);
  });

  it('reflects a custom exercise added during the session (read fresh each call)', () => {
    expect(getAllExerciseNames()).not.toContain('Sled Push');
    localStorage.setItem('customExercises', JSON.stringify(['Sled Push']));
    expect(getAllExerciseNames()).toContain('Sled Push');
  });
});

describe('isValidExercise', () => {
  beforeEach(() => localStorage.clear());

  it('accepts a catalog name regardless of case', () => {
    expect(isValidExercise('Bench Press')).toBe(true);
    expect(isValidExercise('bench press')).toBe(true);
    expect(isValidExercise('BENCH PRESS')).toBe(true);
  });

  it('rejects a name that is not in the catalog or the custom list', () => {
    expect(isValidExercise('Totally Made Up Lift')).toBe(false);
  });

  it('accepts a custom name once it has been added', () => {
    expect(isValidExercise('Sled Push')).toBe(false);
    localStorage.setItem('customExercises', JSON.stringify(['Sled Push']));
    expect(isValidExercise('sled push')).toBe(true);
  });
});
