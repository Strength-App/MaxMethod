# Day-display title filter — ground-truth (Risk #6)

The schedule grids that show a week's day cells filter out "placeholder"
days before rendering. The filter expression is:

```js
week.days.filter(d => d?.title != null)
```

and each surviving day is labelled `day.title ?? \`Day ${di + 1}\``.

**Memory / recorded intent** (`feedback_day_filter.md`): *"Day display filter
must use a title-only check."* The convention is **presence of a title**, not
**truthiness** of a title — a day is shown when it *has* a title field that
isn't null/undefined, even if that title is an empty or whitespace string.

This file records the **actual** output of the unmodified filter across the
full input matrix (per the Risk #6 protocol: ground-truth first, then lock a
test against the recorded truth — not against intuition). The locking test
lives in `client/max-method/src/pages/home.test.jsx`.

## Sites using this exact filter

- `client/max-method/src/pages/home.jsx:151` — the home schedule grid (locked here, Batch 9a).
- `client/max-method/src/pages/viewProgram.jsx:142` — week day-count display (Batch 9b).
- `client/max-method/src/pages/reviewProgram.jsx:374` — review grid (Batch 11).

The truth table is the shared reference for all three. The other two are
locked when their batches touch them.

## Ground-truth matrix

Evaluated against `d?.title != null` (kept?) and `day.title ?? \`Day N\``
(label when kept). Verified by direct evaluation, 2026-06-05.

| Day input | `d?.title != null` | Shown? | Rendered label |
|---|---|---|---|
| `{ title: 'Push' }` | `true` | **shown** | `"Push"` |
| `{ title: null }` | `false` | dropped | — |
| `{}` (no title field) | `false` | dropped | — |
| `{ title: '' }` (empty string) | `true` | **shown** | `""` (empty label) |
| `{ title: '   ' }` (whitespace) | `true` | **shown** | `"   "` |
| `null` (null day entry) | `false` | dropped | — |

## What this pins

1. **Null / undefined / missing title → dropped.** This is the placeholder-day
   case the filter exists to hide.
2. **Empty string and whitespace-only titles → SHOWN**, with their literal
   (empty or whitespace) text as the label. The `?? \`Day N\`` fallback does
   **not** fire for them, because `''` and `'   '` are not nullish. The
   convention does not explicitly cover these edges; the ground-truth records
   that the current code keeps them rather than treating them as placeholders.
3. **A non-titled day never reaches the `?? \`Day N\`` fallback** — the filter
   removes it first. So the `Day ${di + 1}` fallback label is, in practice,
   unreachable for the filtered grids (it only matters where the same
   `?? \`Day N\`` is used *without* the filter, e.g. `customWorkout.jsx` and
   `day.jsx`, which render every day).

See `docs/decisions.md#day-display-title-filter` for the ADR.
