import { useState, useEffect } from 'react';

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
