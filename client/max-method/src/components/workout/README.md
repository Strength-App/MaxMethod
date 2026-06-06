# `components/workout/`

Components that belong specifically to the **workout screens** — the pages where
a lifter works through a training day and records the sets they do. These are the
pieces being lifted out of the two large workout pages (`pages/day.jsx`, the
program-driven workout, and `pages/logger.jsx`, free-form logging) as the refactor
progresses, so the same UI isn't copy-pasted between them.

Import from the barrel:

```js
import { RestTimer } from '../components/workout';
```

## Components

### `RestTimer`

The countdown that appears under an exercise between sets. The page passes in how
long the rest should be (`initialSeconds`) and a callback (`onSkip`) that fires
once when the rest ends — either the clock hit zero or the lifter tapped Skip.
The lifter can pause/resume, add or remove 30 seconds, or skip.

- **Used by:** `pages/day.jsx` (two call sites), `pages/logger.jsx` (one).
- **Contract:** `{ initialSeconds, onSkip }`. Callers remount it with a changing
  `key` to begin a new rest period.
- **Extraction record:** [`docs/comparisons/rest-timer.md`](../../../../../docs/comparisons/rest-timer.md)
  and [`docs/decisions.md#rest-timer-primitive`](../../../../../docs/decisions.md).
- **Not part of the component:** `getRestSeconds` (the 120s-for-big-three-else-90s
  policy) stays at the call sites, since it computes the `initialSeconds` prop
  rather than being part of the timer itself. Its own duplication is tracked at
  [`docs/follow-ups.md#get-rest-seconds-duplication`](../../../../../docs/follow-ups.md).

## Conventions for this directory

**Color tokens.** Follow the app-wide convention strictly: `--accent` (red) is the
brand/identity color and marks identity contexts; `--accent-green` is reserved for
**completion state** (a set or day finished). Don't reach for a green where the
meaning is "identity," or a red where the meaning is "done." See
[`docs/decisions.md#color-token-convention`](../../../../../docs/decisions.md).

**Styling.** These components reuse the existing global classes in `App.css`
(e.g. `.rest-timer`, `.rest-timer-btn`). Extractions are verbatim lifts —
`className` strings move with the component unchanged; no new CSS is introduced
during a lift.

**Documentation.** Every exported component gets plain-language JSDoc aimed at a
non-technical reader (what it does and why it exists for the user), per the root
`CLAUDE.md`.
