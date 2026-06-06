# RestTimer Shape Comparison

**Batch 10's first deliverable** — resolves the literal-copy-vs-near-duplicate
question for the `RestTimer` component before any extraction work, per the
refactor plan's Batch 10 entry ("If 'literal copy': Batch 10 migrates both. If
'near-duplicate': Batch 10 only touches `day.jsx`; logger consolidation deferred
to `docs/follow-ups.md`.").

Conclusion summary lives in [`../decisions.md#rest-timer-primitive`](../decisions.md#rest-timer-primitive).

> Last reviewed against codebase: 2026-06-05 (Batch 10)

---

## The two call sites

`RestTimer` is defined privately (not exported) and identically-named in two
pages:

| File | Definition | Call sites |
|---|---|---|
| `src/pages/day.jsx` | lines 19–65 | 2 (grouped-card timer line ~1081; per-card timer line ~1676) |
| `src/pages/logger.jsx` | lines 20–59 | 1 (per-exercise timer line ~751) |

A third combobox-style timer (`ToolsContext`'s FAB stopwatch/Timer) is a
**separate product surface** — an app-global timer reached from the floating
action button, not the per-exercise rest countdown. Its consolidation with
`RestTimer` is a product decision tracked at
[`../follow-ups.md#rest-timer-tools-context-consolidation`](../follow-ups.md#rest-timer-tools-context-consolidation),
not part of this comparison.

## Method

Read both definitions in full and diffed them line-by-line; read all three call
sites to audit the prop contract and closure dependencies.

## Shape comparison

| Dimension | `day.jsx` RestTimer | `logger.jsx` RestTimer |
|---|---|---|
| Signature | `function RestTimer({ initialSeconds, onSkip })` | **Identical** |
| Local state | `seconds` (from `initialSeconds`), `paused` | **Identical** |
| Countdown effect | `setInterval` decrementing `seconds` (floored at 0) every 1000ms, cleared on cleanup, re-armed on `paused` change | **Identical logic**; written on one line instead of multi-line |
| Auto-skip effect | `useEffect(() => { if (seconds === 0) onSkip(); }, [seconds])` | **Identical logic**; written on one line |
| `adjust(delta)` | `setSeconds(s => Math.max(0, s + delta))` | **Identical** |
| Derived display | `mins`/`secs` from `seconds` | **Identical** |
| JSX root | `div.rest-timer` `role="timer"` `aria-label` countdown | **Identical** |
| Label / display markup | `.rest-timer-label`, `.rest-timer-display` `aria-live="off"` | **Identical** |
| Controls | `-30s`, Pause/Resume (`aria-pressed`), Skip, `+30s` — same classNames, same `aria-label`s | **Identical** |
| Explanatory comment | Has a 3-line comment above the display explaining `aria-live="off"` | **Absent** (the only content difference) |

### What differs

Nothing observable. The two differences are:

1. **Whitespace.** `logger.jsx` writes the two `useEffect` bodies and the
   `setInterval` callback on single lines; `day.jsx` spreads them across multiple
   lines. Same tokens, same behavior.
2. **A comment.** `day.jsx` carries a 3-line note explaining why
   `aria-live="off"` is intentional (announcing every second would spam screen
   readers). `logger.jsx` omits it.

The **rendered DOM is byte-identical** — same element tree, same `className`
strings, same ARIA attributes, same text. There is no code path by which the two
produce different markup or behavior.

## Prop contract & closure audit (all three call sites)

Every call site passes the same three things and nothing else:

```jsx
<RestTimer
  key={timerState.id}                         // remounts on each new rest period
  initialSeconds={getRestSeconds(/* name */)} // 120s for big-three, else 90s
  onSkip={() => setTimerState(null)}          // clears the active timer
/>
```

`RestTimer` closes over **nothing** from its parent scope — `initialSeconds` and
`onSkip` are its only inputs, both already props. The `key` remount means
`initialSeconds` is read fresh on every new rest period (no stale-prop concern).
This makes the extraction a textbook **verbatim lift**: each closure is already a
prop with the same name; no new props, no closure-to-prop conversion needed.

## Out of scope (noted, not absorbed)

`getRestSeconds` and its `BIG_THREE` constant are **also** duplicated verbatim
between the two pages (identical except `day.jsx`'s parameter is named
`exerciseName`, `logger.jsx`'s `name`). They are **call-site helpers**, not part
of `RestTimer` — the component receives the already-computed `initialSeconds`.
Moving `getRestSeconds` into the component would change the prop contract
(`exerciseName` instead of `initialSeconds`), which is an API reshape, not a
verbatim lift. Per the verbatim-lift discipline it stays at the call sites; the
duplication is logged as a follow-up
([`../follow-ups.md#get-rest-seconds-duplication`](../follow-ups.md#get-rest-seconds-duplication)).

## Conclusion

**Literal copy. Batch 10 migrates both pages.** The `day.jsx` version is the
canonical source (it carries the explanatory `aria-live` comment, which is worth
keeping). Extract it verbatim to `src/components/workout/RestTimer.jsx`, export
it through a barrel, and replace all three inline usages. Because the rendered
output is identical by construction, the post-extraction visual and behavioral
result cannot differ from the pre-extraction one — the characterization tests pin
that contract going forward.
