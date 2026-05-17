# Combobox Shape Comparison

**Produced as a Phase 1 deliverable** before the refactor initiative began executing. Drives the Batch 13/14 architecture decisions.

Conclusion summary lives in [`../decisions.md#combobox-primitive`](../decisions.md#combobox-primitive).

> Last reviewed against codebase: 2026-05-17

---

## Phase 1 finding — the original premise was wrong

The plan's earlier framing identified three combobox call sites as `day.jsx` / `customDay.jsx` / `logger.jsx`. **`day.jsx` does not have a typeahead combobox** — it has a `ContextMenu` for equipment swaps and uses the already-extracted `EquipmentSelect` primitive, but no `role="combobox"` text-input typeahead.

The actual three typeahead-combobox call sites are:

| Call site | Purpose | Selection contract |
|---|---|---|
| `customDay.jsx` | Pick an exercise for a slot during workout-template authoring | Program-restricted; selecting writes to local `exercises` state and the debounced DB save |
| `logger.jsx` | Pick or free-type an exercise during ad-hoc logging | Allows **free-text / "create new exercise"**; writes to local log + `customExercises` localStorage + server POST |
| `history.jsx` | Search for an exercise to add to a historical session | Different selection callback (`onCancel` exists); narrower options list |

`EquipmentSelect.jsx` is a fourth combobox but it's a **Select-Only Combobox** (button trigger, fixed option list) — a different WAI-ARIA pattern entirely, already extracted, not part of this comparison.

## Method

Grep-based shape analysis:

- `role="combobox"` occurrences across `client/max-method/src/`
- `handleComboKeyDown` (the function name used in the literal-copy pattern)
- ARIA attribute scaffolding (`aria-autocomplete`, `aria-expanded`, `aria-controls`, `aria-activedescendant`)
- Surrounding event handlers (`onFocus`, `onBlur`, `onKeyDown`)
- Comment text (literal copies tend to have verbatim comments)

## Shape comparison

| Dimension | `customDay.jsx` | `logger.jsx` | `history.jsx` |
|---|---|---|---|
| `role="combobox"` + ARIA scaffolding | ✅ identical | ✅ identical | ✅ similar (different `aria-label`: "Search for an exercise to add") |
| `handleComboKeyDown` function body | **Literal copy** of logger's — same `useCallback`, same case statements, same comments verbatim | **Literal copy** of customDay's | Distinct `handleKeyDown` — different name, different surroundings |
| ArrowDown/ArrowUp behavior | Wraps · opens-on-key-when-closed · empty-list early-return · `e.preventDefault()` | Identical to customDay | Confirmed differs (separate function — needs detailed read during Batch 13 if migration is reconsidered) |
| Home/End | Supported | Supported | Needs verification (out of scope unless triggered) |
| Enter selection contract | Reads `optionsFor(name)`, picks `highlightedIndex`, calls page-local handler | Identical | Distinct |
| Space handling | Explicitly NOT handled (text entry per WAI-ARIA text-input combobox); comment block explains rationale | Identical comment + behavior | Needs verification |
| Esc closing | Yes (in the function body's full implementation) | Yes | Yes |
| Blur close | `setTimeout(closeDropdown, 150)` | Same 150ms timeout | Same 150ms timeout |
| `aria-activedescendant` wiring | Yes via `activeOptionId` | Yes via `activeOptionId` | Yes via `activeDescendant` (different identifier name; same purpose) |
| Filter/match semantics | `optionsFor(name)` — substring? prefix? needs read during Batch 13 | Same `optionsFor(name)` | Distinct function |
| Option-list shape | Page-local (strings or `{name, …}`) | Same | May differ |
| Free-text / "create new" on no-match | **No** (program-restricted) | **Yes** (allows new exercises) | **No** |
| `onMouseDown preventDefault` on listbox wrapper | Yes — comment block in detail re: scrollbar-drag focus retention | Yes — same comment verbatim | Needs verification |

### Evidence of literal-copy between customDay and logger

The `handleComboKeyDown` function is defined in both files with byte-identical `useCallback` body, switch statement, and comments. The "Space is intentionally NOT handled here" comment block appears verbatim in both. The `onMouseDown preventDefault` rationale comment is verbatim in both. The 150ms blur timeout is identical.

This is not similarity. This is duplication.

## Conclusion

### Two-way share between `customDay` and `logger`

Their `handleComboKeyDown`, ARIA wiring, and listbox-wrapper handling are literal copies. The only meaningful difference is the **consumer-side selection contract** (logger allows free-text creation; customDay doesn't), which lives outside the keyboard/ARIA/list-rendering logic and stays per-page.

### History keeps its own implementation

Different surrounding shape (`onCancel`, history-filter context, different options source) — sharing would require a contract negotiation that defeats the simplicity of the customDay↔logger overlap. The keyboard/ARIA logic is similar enough that **if a future fourth consumer emerges**, a more general primitive could absorb history; until then, leave it.

### Primitive shape: a hook, not a component

The shared logic is the state machine + keyboard handlers + ARIA props (`useCombobox`-style). The actual JSX rendering (the input, the listbox wrapper, the option styling, the "create new" affordance) varies by page and stays per-consumer. A headless hook lets each consumer render however it wants while inheriting the hard-to-get-right behavior.

A component-shaped primitive would force consumers through your rendering decisions (one of the consumers has a "create new" affordance the other doesn't — that's a rendering concern, not a state-machine concern).

## Batch implications

- **Batch 13 first commit**: `feat(hooks): extract useCombobox` — verbatim lift of the keyboard/ARIA logic from `customDay.jsx` (and `logger.jsx`, which is identical), with its own characterization tests covering ArrowDown/Up wrap, Home/End, Enter-selects-highlighted, Esc-closes, Space-not-handled, blur-150ms-delay.
- **Batch 13**: refactor `customDay.jsx` to consume the hook; remove the inline `handleComboKeyDown`. The hook is the abstraction; customDay still renders its own listbox/input JSX.
- **Batch 14**: refactor `logger.jsx` to consume the hook. Same swap. The verbatim-copy nature of the original is the proof that the swap is correct.
- **History combobox**: not touched in this initiative. Captured as `#history-combobox-migration` in [`../follow-ups.md`](../follow-ups.md).

## Hook API sketch (informative, not normative)

```js
const {
  getInputProps,   // returns role, aria-*, onKeyDown, onFocus, onBlur
  getListboxProps, // returns role, id, onMouseDown
  getOptionProps,  // returns id, role, aria-selected, onMouseDown
  isOpen,
  highlightedIndex,
  open, close,
  selectOption,    // call from the page when Enter activates an option
} = useCombobox({
  options,
  onSelect,        // page-specific — what to do when an option is chosen
  // optional: onCreate?  // for logger's "create new exercise" case
});
```

This is informative. Actual API derived during Batch 13 from the literal-copy code, not from this sketch. The point of the sketch is to show that the hook's surface is small and shapes-around-rendering, not shapes-of-rendering.

## Open questions for Batch 13

These get resolved during the extraction, not now:

- Filter semantics inside `optionsFor(name)` — substring? prefix? alias-aware via `exerciseNameNormalize.js`? Resolved by reading the unmodified code.
- Should the hook own the `highlightedIndex` state, or expose it as a controlled prop? Default: the hook owns it (uncontrolled); consumers don't need access except through the API.
- Naming for the "create new" callback if/when added (probably `onCreate`, conditional on logger's need surfacing during Batch 14).
