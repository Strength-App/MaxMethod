// Group all identical sets regardless of order, keyed on `${reps}|${weight}`.
// Returns [{ count, reps, weight }] in first-seen order.
export function collapseSetDetails(setDetails) {
  const order = [];
  const map = new Map();
  for (const s of setDetails) {
    const key = `${s.reps}|${s.weight}`;
    if (!map.has(key)) {
      map.set(key, { count: 0, reps: s.reps, weight: s.weight });
      order.push(key);
    }
    map.get(key).count += 1;
  }
  return order.map(k => map.get(k));
}

// "3x8 @ 150 lbs" or "3x10 @ BW" (weight === 0 → bodyweight).
// `count` may be 1 — render "1x8 @ 150 lbs" rather than collapsing the count
// away; preserves visual rhythm in mixed-set displays.
export function formatSetLine({ count, reps, weight }) {
  const load = weight === 0 ? 'BW' : `${weight.toLocaleString()} lbs`;
  return `${count}x${reps} @ ${load}`;
}
