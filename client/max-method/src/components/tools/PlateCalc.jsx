import { useState, useMemo } from 'react';

const DENOMS = [
  { lb: 45,  height: 64, color: '#2563eb' }, // Olympic-derived blue
  { lb: 25,  height: 50, color: '#16a34a' }, // green
  { lb: 10,  height: 36, color: '#e5e7eb' }, // near-white
  { lb: 5,   height: 28, color: '#eab308' }, // warm yellow
  { lb: 2.5, height: 22, color: '#ef4444' }, // bright red — distinct from var(--accent) maroon
];

const SVG_HEIGHT = 80;
const PLATE_WIDTH = 14;
const PLATE_GAP = 1;
const BAR_LEAD_LEFT = 24;
const PLATE_X_START = BAR_LEAD_LEFT;

/**
 * Compute the per-side plate breakdown for a target/bar pair.
 *
 * @param {number} target - Desired total weight in lbs (bar included).
 * @param {number} bar - Bar weight in lbs.
 * @returns {{kind: 'empty'}
 *   | {kind: 'invalid', message: string}
 *   | {kind: 'ok', plates: number[], perSideLbs: number}}
 *   A tagged result: `empty` for a missing/zero/negative target, `invalid`
 *   (with a user-facing message) when the bar is non-numeric/negative, the
 *   target is below the bar, or the weight can't be loaded in 5 lb symmetric
 *   increments, and `ok` with the greedy per-side plate list otherwise.
 *
 * Greedy (largest-first) is optimal for the [45, 25, 10, 5, 2.5] denomination
 * set because each plate is ≥ the next, with the 45→25 ratio of 1.8 the
 * tightest case (and bounded — at most 1× 25 fits after each 45). Integer-
 * tenths math avoids 2.5 lb float drift in the subtraction loop.
 */
function computePlates(target, bar) {
  if (!Number.isFinite(target) || target <= 0) {
    return { kind: 'empty' };
  }
  if (!Number.isFinite(bar) || bar < 0) {
    return { kind: 'invalid', message: 'Bar weight must be a non-negative number.' };
  }
  if (target < bar) {
    return {
      kind: 'invalid',
      message: `Target weight must be at least the bar weight (${bar} lbs).`,
    };
  }

  const totalPlateLbs = target - bar;
  const totalTenths = Math.round(totalPlateLbs * 10);
  // Smallest symmetric increment is 5 lb (2× 2.5 lb plates).
  if (totalTenths % 50 !== 0) {
    const low = Math.floor(totalPlateLbs / 5) * 5 + bar;
    const high = Math.ceil(totalPlateLbs / 5) * 5 + bar;
    return {
      kind: 'invalid',
      message: `${target} lbs can't be loaded — try ${low} or ${high} lbs.`,
    };
  }

  let remaining = totalTenths / 2; // integer tenths-per-side
  const plates = [];
  for (const { lb } of DENOMS) {
    const tenths = Math.round(lb * 10);
    while (remaining >= tenths) {
      plates.push(lb);
      remaining -= tenths;
    }
  }
  return { kind: 'ok', plates, perSideLbs: totalPlateLbs / 2 };
}

function formatBreakdown(plates) {
  if (plates.length === 0) return 'Bar only — no plates';
  const counts = new Map();
  for (const p of plates) counts.set(p, (counts.get(p) || 0) + 1);
  return DENOMS
    .filter(d => counts.has(d.lb))
    .map(d => `${counts.get(d.lb)}× ${d.lb}`)
    .join(', ');
}

// Screen-reader variant of formatBreakdown: spells denominations as words
// (e.g. "two and a half pound") and pluralizes, since "2.5" and "×" don't read
// cleanly aloud.
function formatA11yBreakdown(plates) {
  if (plates.length === 0) return 'bar only, no plates';
  const counts = new Map();
  for (const p of plates) counts.set(p, (counts.get(p) || 0) + 1);
  const parts = DENOMS
    .filter(d => counts.has(d.lb))
    .map(d => {
      const n = counts.get(d.lb);
      const word = d.lb === 2.5 ? 'two and a half pound' : `${d.lb} pound`;
      return `${n} ${word} ${n === 1 ? 'plate' : 'plates'}`;
    });
  return parts.join(', ');
}

// Decorative plate-stack diagram. Rendered inside an aria-hidden wrapper, so
// its role="img"/aria-label is not surfaced to assistive tech (the sr-only
// aria-live region is the accessible channel); the label is kept for parity.
function PlateStackSVG({ plates }) {
  const svgWidth = PLATE_X_START + Math.max(plates.length, 0) * (PLATE_WIDTH + PLATE_GAP) + 4;
  return (
    <svg
      className="platecalc-svg"
      viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
      width={svgWidth}
      height={SVG_HEIGHT}
      role="img"
      aria-label={`Plate stack diagram, ${plates.length} ${plates.length === 1 ? 'plate' : 'plates'} per side`}
    >
      {/* Bar shaft — horizontal line through plate centers, extends leftward
          past the first plate to suggest the rest of the barbell. */}
      <rect
        className="platecalc-bar"
        x="0"
        y={SVG_HEIGHT / 2 - 1.5}
        width={svgWidth}
        height="3"
      />
      {plates.map((lb, i) => {
        const denom = DENOMS.find(d => d.lb === lb);
        const x = PLATE_X_START + i * (PLATE_WIDTH + PLATE_GAP);
        const y = (SVG_HEIGHT - denom.height) / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={PLATE_WIDTH}
            height={denom.height}
            rx="2"
            fill={denom.color}
          >
            <title>{lb} pound plate</title>
          </rect>
        );
      })}
    </svg>
  );
}

/**
 * Barbell plate calculator. Given a target total weight and a bar weight,
 * renders the plates to load PER SIDE as a greedy (largest-first) breakdown,
 * a decorative plate-stack diagram, and an sr-only live announcement.
 *
 * Three display states, driven by `computePlates`:
 *   - empty   — missing/zero/negative target: idle "Plate Loading" prompt.
 *   - invalid — bar non-numeric/negative, target below bar, or target not
 *               loadable in 5 lb symmetric increments: an error message naming
 *               the nearest loadable weights.
 *   - ok      — a per-side breakdown ("Bar only — no plates" at the floor).
 *
 * Accessibility: the visual result (diagram, label, note) is aria-hidden; the
 * accessible channel is a single sr-only aria-live region that announces the
 * full loading or the error. Takes no props — target starts empty, bar
 * defaults to 45.
 *
 * @returns {JSX.Element} The plate calculator UI.
 */
export default function PlateCalc() {
  const [target, setTarget] = useState('');
  const [bar, setBar] = useState('45');

  const computed = useMemo(() => {
    const t = parseFloat(target);
    const b = parseFloat(bar);
    return computePlates(t, b);
  }, [target, bar]);

  const isValid = computed.kind === 'ok';
  const isInvalid = computed.kind === 'invalid';

  const lblText = isValid ? 'Per Side'
    : isInvalid ? 'Invalid Weight'
    : 'Plate Loading';

  const noteText = isValid ? formatBreakdown(computed.plates)
    : isInvalid ? computed.message
    : null;

  const a11yText = isValid
    ? `${target} pounds loads as: ${formatA11yBreakdown(computed.plates)}, per side`
    : isInvalid ? computed.message
    : 'Enter target weight to see plate loading';

  return (
    <div className="platecalc">
      <div className="tool-num-input-row">
        <div className="tool-num-input-block">
          <label className="tool-num-input-lbl" htmlFor="platecalc-target">Target (lbs)</label>
          <input
            id="platecalc-target"
            type="number"
            inputMode="decimal"
            step="5"
            min="0"
            placeholder="225"
            className="tool-num-input"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
        </div>
        <div className="tool-num-input-block">
          <label className="tool-num-input-lbl" htmlFor="platecalc-bar">Bar (lbs)</label>
          <input
            id="platecalc-bar"
            type="number"
            inputMode="decimal"
            step="2.5"
            min="0"
            className="tool-num-input"
            value={bar}
            onChange={e => setBar(e.target.value)}
          />
        </div>
      </div>

      <div className="tool-result-block">
        <div className="tool-result-val" aria-hidden="true">
          {isValid ? (
            <div className="platecalc-stack-wrap">
              <PlateStackSVG plates={computed.plates} />
            </div>
          ) : (
            <span>—</span>
          )}
        </div>
        <div className="tool-result-lbl" aria-hidden="true">{lblText}</div>
        {noteText && (
          <div className="tool-result-note" aria-hidden="true">{noteText}</div>
        )}
        <span className="sr-only" aria-live="polite">{a11yText}</span>
      </div>
    </div>
  );
}
