import { useState, useEffect } from 'react';

/**
 * RestTimer — the little countdown that appears under an exercise after a set,
 * giving the lifter a moment to rest before the next one.
 *
 * It starts at a number of seconds chosen by the page that shows it (longer for
 * the big lifts, shorter for accessories) and counts down to zero, one second at
 * a time. The lifter can pause and resume it, add or remove 30 seconds, or skip
 * the rest entirely. When the countdown hits zero — or the lifter taps Skip — the
 * timer tells the page it is finished so the page can clear it away.
 *
 * Shared by the program-workout screen (`day.jsx`) and the free-logging screen
 * (`logger.jsx`); extracted verbatim in Batch 10 (see
 * `docs/comparisons/rest-timer.md`).
 *
 * Accessibility: the whole thing is announced as a "timer" with a spoken label
 * (e.g. "Rest timer: 1 minutes 30 seconds remaining"). The ticking number itself
 * is deliberately NOT read aloud every second — that would flood a screen reader
 * — which is why the display is marked `aria-live="off"`.
 *
 * @param {Object} props
 * @param {number} props.initialSeconds - How many seconds to start the rest
 *   countdown at. Read once when the timer first appears; callers remount the
 *   timer (via a changing React `key`) to start a fresh rest period, so this
 *   value is always read fresh and never goes stale.
 * @param {() => void} props.onSkip - Called when the rest is over: either the
 *   countdown reached zero, or the lifter pressed Skip. The page typically uses
 *   this to remove the timer from the screen. Fires exactly once per rest period.
 * @returns {JSX.Element} The rest-timer panel with its display and controls.
 */
function RestTimer({ initialSeconds, onSkip }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSeconds(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (seconds === 0) onSkip();
  }, [seconds]);

  const adjust = (delta) => setSeconds(s => Math.max(0, s + delta));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="rest-timer" role="timer" aria-label={`Rest timer: ${mins} minutes ${secs} seconds remaining`}>
      <div className="rest-timer-label" aria-hidden="true">Rest Timer</div>
      {/* aria-live="off" intentional: announcing every second would spam SR.
          A 10-second milestone announcement would require new state — flagged
          as a post-audit follow-up. */}
      <div className="rest-timer-display" aria-live="off">{mins}:{String(secs).padStart(2, '0')}</div>
      <div className="rest-timer-controls">
        <button className="rest-timer-btn" onClick={() => adjust(-30)} aria-label="Subtract 30 seconds">
          <span aria-hidden="true">-30s</span>
        </button>
        <button
          className="rest-timer-btn rest-timer-btn--pause"
          onClick={() => setPaused(p => !p)}
          aria-label={paused ? 'Resume timer' : 'Pause timer'}
          aria-pressed={paused}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="rest-timer-btn rest-timer-btn--skip" onClick={onSkip} aria-label="Skip rest">Skip</button>
        <button className="rest-timer-btn" onClick={() => adjust(30)} aria-label="Add 30 seconds">
          <span aria-hidden="true">+30s</span>
        </button>
      </div>
    </div>
  );
}

export default RestTimer;
