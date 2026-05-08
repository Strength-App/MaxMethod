import { useState, useEffect, useCallback } from 'react';

// Display ceiling — past 99:59.99 the user has forgotten about the stopwatch.
// State clamps here too so resume after cap doesn't tick past invisibly.
const MAX_MS = 100 * 60 * 1000 - 10; // 99:59.99
const TICK_MS = 100;

const STATUS_LABEL = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(cs)}`;
}

function formatA11y(ms) {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
  return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
}

export default function Stopwatch() {
  const [status, setStatus] = useState('idle'); // idle | running | paused
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedBeforePause, setElapsedBeforePause] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  // Sr-only announcement region. Updated only on state transitions, never
  // on tick — keeps screen readers from announcing every 100ms.
  const [announcement, setAnnouncement] = useState('');

  // Interval lives here. Same timestamp discipline as ToolsContext's timer:
  // Date.now() is read in the callback, never during render. State is clamped
  // at MAX_MS so display and state stay in sync past the cap.
  useEffect(() => {
    if (status !== 'running' || startedAt == null) return;
    const id = setInterval(() => {
      const total = (Date.now() - startedAt) + elapsedBeforePause;
      setElapsedMs(Math.min(total, MAX_MS));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status, startedAt, elapsedBeforePause]);

  const start = useCallback(() => {
    setStartedAt(Date.now());
    setElapsedMs(elapsedBeforePause);
    setStatus('running');
    setAnnouncement(elapsedBeforePause > 0 ? 'Stopwatch resumed' : 'Stopwatch started');
  }, [elapsedBeforePause]);

  const pause = useCallback(() => {
    if (status !== 'running' || startedAt == null) return;
    const total = (Date.now() - startedAt) + elapsedBeforePause;
    const clamped = Math.min(total, MAX_MS);
    setElapsedBeforePause(clamped);
    setElapsedMs(clamped);
    setStartedAt(null);
    setStatus('paused');
    setAnnouncement(`Stopwatch paused at ${formatA11y(clamped)}`);
  }, [status, startedAt, elapsedBeforePause]);

  const reset = useCallback(() => {
    setStartedAt(null);
    setElapsedBeforePause(0);
    setElapsedMs(0);
    setStatus('idle');
    setAnnouncement('Stopwatch reset');
  }, []);

  const isRunning = status === 'running';
  const isIdle = status === 'idle';

  return (
    <div className="stopwatch">
      <div className="tool-result-block">
        <div className="tool-result-val" aria-hidden="true">
          <span>{formatTime(elapsedMs)}</span>
        </div>
        <div className="tool-result-lbl" aria-hidden="true">{STATUS_LABEL[status]}</div>
        <span className="sr-only" aria-live="polite">{announcement}</span>
      </div>
      <div className="stopwatch-buttons">
        <button
          type="button"
          className="tool-action-btn tool-action-btn--primary"
          onClick={isRunning ? pause : start}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          className="tool-action-btn tool-action-btn--secondary"
          onClick={reset}
          disabled={isIdle}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
