import { useState, useMemo } from 'react';

// Descending so index 0 is RPE 10 (highest), index 7 is RPE 6.5 (lowest).
// Steppers walk this array by index to avoid float-math accumulation.
const RPE_VALUES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5];

const PERCENTAGES = {
  10:  [100.0, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0],
  9.5: [ 97.8, 93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7],
  9:   [ 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3],
  8.5: [ 93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0],
  8:   [ 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6],
  7.5: [ 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3],
  7:   [ 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9],
  6.5: [ 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3, 58.6],
};

export default function RPECalc() {
  const [oneRM, setOneRM] = useState('');
  const [reps, setReps] = useState(5);
  const [rpe, setRpe] = useState(8);

  const pct = PERCENTAGES[rpe][reps - 1];

  // Floor-to-5 matches the gym-plates rule established by OneRMCalc — gym
  // plates increment by 5 lbs at the smallest, so prescribed weight should
  // be loadable in real-world conditions.
  const prescribedWeight = useMemo(() => {
    const orm = parseFloat(oneRM);
    if (!Number.isFinite(orm) || orm <= 0) return null;
    return Math.floor((orm * pct / 100) / 5) * 5;
  }, [oneRM, pct]);

  const decReps = () => setReps(r => Math.max(1, r - 1));
  const incReps = () => setReps(r => Math.min(12, r + 1));
  const decRpe = () => setRpe(r => {
    const i = RPE_VALUES.indexOf(r);
    return i < RPE_VALUES.length - 1 ? RPE_VALUES[i + 1] : r;
  });
  const incRpe = () => setRpe(r => {
    const i = RPE_VALUES.indexOf(r);
    return i > 0 ? RPE_VALUES[i - 1] : r;
  });

  const rpeIdx = RPE_VALUES.indexOf(rpe);
  const hasResult = prescribedWeight != null;

  return (
    <div className="rpe-tool">
      {/* 1RM input — full-width row using the shared .tool-num-input-* primitive. */}
      <div className="tool-num-input-row">
        <div className="tool-num-input-block">
          <label className="tool-num-input-lbl" htmlFor="rpecalc-1rm">1RM (lbs)</label>
          <input
            id="rpecalc-1rm"
            type="number"
            inputMode="decimal"
            step="5"
            min="0"
            placeholder="315"
            className="tool-num-input"
            value={oneRM}
            onChange={e => setOneRM(e.target.value)}
          />
        </div>
      </div>

      <div className="rpe-steppers-row">
        <div className="rpe-stepper-block">
          <div className="rpe-stepper-lbl">Reps</div>
          <div className="rpe-stepper">
            <button
              type="button"
              className="rpe-stepper-btn"
              onClick={decReps}
              disabled={reps <= 1}
              aria-label="Decrease reps"
            >−</button>
            <div className="rpe-stepper-val" aria-live="polite" aria-atomic="true">{reps}</div>
            <button
              type="button"
              className="rpe-stepper-btn"
              onClick={incReps}
              disabled={reps >= 12}
              aria-label="Increase reps"
            >+</button>
          </div>
        </div>
        <div className="rpe-stepper-block">
          <div className="rpe-stepper-lbl">RPE</div>
          <div className="rpe-stepper">
            <button
              type="button"
              className="rpe-stepper-btn"
              onClick={decRpe}
              disabled={rpeIdx >= RPE_VALUES.length - 1}
              aria-label="Decrease RPE"
            >−</button>
            <div className="rpe-stepper-val" aria-live="polite" aria-atomic="true">{rpe.toFixed(1)}</div>
            <button
              type="button"
              className="rpe-stepper-btn"
              onClick={incRpe}
              disabled={rpeIdx <= 0}
              aria-label="Increase RPE"
            >+</button>
          </div>
        </div>
      </div>

      <div className="tool-result-block">
        <div className="tool-result-val" aria-hidden="true">
          <span>{hasResult ? `${prescribedWeight.toLocaleString()} lbs` : '—'}</span>
        </div>
        <div className="tool-result-lbl" aria-hidden="true">Prescribed Weight</div>
        {hasResult && (
          <div className="tool-result-note" aria-hidden="true">
            {pct.toFixed(1)}% of 1RM
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {hasResult
            ? `Prescribed weight: ${prescribedWeight.toLocaleString()} pounds, ${pct.toFixed(1)} percent of one rep max`
            : 'Enter your one rep max to see prescribed weight'}
        </span>
      </div>
    </div>
  );
}
