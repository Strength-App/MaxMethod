import { useState, useMemo } from 'react';

// Epley formula: 1RM = weight × (1 + reps / 30). Special-cased at reps=1 to
// avoid the formula's 1.033× artifact (a true 1-rep set IS the 1RM).
function estimateOneRM(weight, reps) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export default function OneRMCalc() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const result = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!Number.isFinite(w) || w <= 0) return null;
    if (!Number.isInteger(r) || r <= 0) return null;
    return Math.floor(estimateOneRM(w, r) / 5) * 5;
  }, [weight, reps]);

  const showLowAccuracyNote = useMemo(() => {
    const r = parseInt(reps, 10);
    return Number.isInteger(r) && r > 10;
  }, [reps]);

  return (
    <div className="onerm-calc">
      <div className="tool-num-input-row">
        <div className="tool-num-input-block">
          <label className="tool-num-input-lbl" htmlFor="onerm-weight">Weight (lbs)</label>
          <input
            id="onerm-weight"
            type="number"
            inputMode="decimal"
            step="2.5"
            min="0"
            placeholder="225"
            className="tool-num-input"
            value={weight}
            onChange={e => setWeight(e.target.value)}
          />
        </div>
        <div className="tool-num-input-block">
          <label className="tool-num-input-lbl" htmlFor="onerm-reps">Reps</label>
          <input
            id="onerm-reps"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            placeholder="5"
            className="tool-num-input"
            value={reps}
            onChange={e => setReps(e.target.value)}
          />
        </div>
      </div>
      <div className="tool-result-block">
        <div className="tool-result-val" aria-hidden="true">
          <span>{result != null ? `${result.toLocaleString()} lbs` : '—'}</span>
        </div>
        <div className="tool-result-lbl" aria-hidden="true">Estimated 1RM</div>
        {showLowAccuracyNote && (
          <div className="tool-result-note" aria-hidden="true">
            Estimates beyond 10 reps lose accuracy
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {result != null
            ? `Estimated one rep max: ${result.toLocaleString()} pounds${showLowAccuracyNote ? '. Accuracy decreases beyond ten reps.' : ''}`
            : 'Enter weight and reps to estimate one rep max'}
        </span>
      </div>
    </div>
  );
}
