import { useState, useEffect, useRef } from 'react';
import { useTimer } from '../../context/ToolsContext';

const PRESETS = [60, 90, 120, 180, 300]; // seconds
const MAX_MINUTES = 30;
const URGENT_THRESHOLD_MS = 10_000;

const STATUS_LABEL = {
  idle: 'Set Duration',
  running: 'Running',
  paused: 'Paused',
  finished: 'Done!',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(ms) {
  // Ceil so display reads "0:01" until exactly 0; never shows "0:00" while still running.
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(totalSecs / 60))}:${pad(totalSecs % 60)}`;
}

function formatA11y(ms) {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m > 0 && s > 0) return `${m} ${m === 1 ? 'minute' : 'minutes'} ${s} ${s === 1 ? 'second' : 'seconds'}`;
  if (m > 0) return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  return `${s} ${s === 1 ? 'second' : 'seconds'}`;
}

// Hold-to-repeat: pointer-down fires immediately, then repeats every 80ms after
// a 400ms initial delay. Keyboard activation goes through onClick (single fire).
function HoldRepeatButton({ children, onTrigger, disabled, className, ariaLabel }) {
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const pointerFiredRef = useRef(false);

  const stop = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handlePointerDown = () => {
    if (disabled) return;
    pointerFiredRef.current = true;
    onTrigger();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(onTrigger, 80);
    }, 400);
  };

  const handleClick = () => {
    // Pointer path already fired; consume the trailing click and reset.
    if (pointerFiredRef.current) {
      pointerFiredRef.current = false;
      return;
    }
    // Keyboard path (Space/Enter) — single fire.
    if (!disabled) onTrigger();
  };

  useEffect(() => stop, []);

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export default function Timer() {
  const { status, remainingMs, start, pause, resume, reset, adjust } = useTimer();

  // Local duration entry — only meaningful while idle. Provider owns running countdown.
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  // Separate sr-only announcement field for ±30s adjustments. Updated only
  // inside handleAdjust — the main aria-live span keeps its per-status text.
  const [adjustAnnouncement, setAdjustAnnouncement] = useState('');

  const totalEnteredMs = (minutes * 60 + seconds) * 1000;
  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isFinished = status === 'finished';

  const displayMs = isIdle ? totalEnteredMs : remainingMs;
  const showUrgent = (isRunning || isPaused) && remainingMs > 0 && remainingMs <= URGENT_THRESHOLD_MS;
  const showSteppers = isIdle || isFinished;

  const decMinutes = () => setMinutes(m => Math.max(0, m - 1));
  const incMinutes = () => setMinutes(m => Math.min(MAX_MINUTES, m + 1));
  const decSeconds = () => setSeconds(s => Math.max(0, s - 1));
  const incSeconds = () => setSeconds(s => Math.min(59, s + 1));

  const applyPreset = (totalSecs) => {
    setMinutes(Math.floor(totalSecs / 60));
    setSeconds(totalSecs % 60);
  };

  const handlePrimary = () => {
    if (isRunning) pause();
    else if (isPaused) resume();
    else if (isIdle && totalEnteredMs > 0) start(totalEnteredMs);
  };

  const handleAdjust = (deltaMs) => {
    // Compute new remaining for the announcement before adjust() — reading
    // remainingMs after adjust() returns the stale value from this render.
    // Slight (≤ TICK_MS) staleness is fine since formatA11y rounds to seconds.
    const newRemaining = Math.max(0, remainingMs + deltaMs);
    adjust(deltaMs);
    const action = deltaMs > 0
      ? `Added ${deltaMs / 1000} seconds`
      : `Removed ${Math.abs(deltaMs) / 1000} seconds`;
    setAdjustAnnouncement(`${action}, ${formatA11y(newRemaining)} remaining`);
  };

  const handleReset = () => {
    reset();
    setMinutes(0);
    setSeconds(0);
  };

  const primaryLabel = isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start';
  const primaryDisabled = isIdle && totalEnteredMs <= 0;
  const resetDisabled = isIdle && totalEnteredMs === 0;

  const blockClass = [
    'tool-result-block',
    showUrgent && 'tool-result-block--urgent',
    isFinished && 'tool-result-block--finished',
  ].filter(Boolean).join(' ');

  return (
    <div className="rest-timer">
      <div className={blockClass}>
        <div className="tool-result-val" aria-hidden="true">
          <span>{formatTime(displayMs)}</span>
        </div>
        <div className="tool-result-lbl" aria-hidden="true">{STATUS_LABEL[status]}</div>
        <span className="sr-only" aria-live="polite">
          {isFinished ? 'Timer finished'
            : isRunning ? `Timer running, ${formatA11y(remainingMs)} remaining`
            : isPaused ? `Timer paused, ${formatA11y(remainingMs)} remaining`
            : totalEnteredMs > 0 ? `Set to ${formatA11y(totalEnteredMs)}, press start to begin`
            : 'Set timer duration'}
        </span>
        <span className="sr-only" aria-live="polite">{adjustAnnouncement}</span>
      </div>

      {showSteppers && (
        <>
          <div className="rest-timer-presets" role="group" aria-label="Duration presets">
            {PRESETS.map(secs => (
              <button
                key={secs}
                type="button"
                className="rest-timer-preset"
                onClick={() => applyPreset(secs)}
              >
                {formatTime(secs * 1000)}
              </button>
            ))}
          </div>

          <div className="rest-timer-steppers-row">
            <div className="rest-timer-stepper-block">
              <div className="rest-timer-stepper-lbl">Minutes</div>
              <div className="rest-timer-stepper">
                <button
                  type="button"
                  className="rest-timer-stepper-btn"
                  onClick={decMinutes}
                  disabled={minutes <= 0}
                  aria-label="Decrease minutes"
                >−</button>
                <div className="rest-timer-stepper-val" aria-live="polite" aria-atomic="true">{minutes}</div>
                <button
                  type="button"
                  className="rest-timer-stepper-btn"
                  onClick={incMinutes}
                  disabled={minutes >= MAX_MINUTES}
                  aria-label="Increase minutes"
                >+</button>
              </div>
            </div>
            <div className="rest-timer-stepper-block">
              <div className="rest-timer-stepper-lbl">Seconds</div>
              <div className="rest-timer-stepper">
                <HoldRepeatButton
                  className="rest-timer-stepper-btn"
                  onTrigger={decSeconds}
                  disabled={seconds <= 0}
                  ariaLabel="Decrease seconds"
                >−</HoldRepeatButton>
                <div className="rest-timer-stepper-val" aria-live="polite" aria-atomic="true">{seconds}</div>
                <HoldRepeatButton
                  className="rest-timer-stepper-btn"
                  onTrigger={incSeconds}
                  disabled={seconds >= 59}
                  ariaLabel="Increase seconds"
                >+</HoldRepeatButton>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="rest-timer-buttons">
        {isFinished ? (
          <button
            type="button"
            className="tool-action-btn tool-action-btn--primary"
            onClick={handleReset}
          >
            Dismiss
          </button>
        ) : (
          <>
            {(isRunning || isPaused) && (
              <button
                type="button"
                className="tool-action-btn tool-action-btn--secondary"
                onClick={() => handleAdjust(-30000)}
                aria-label="Subtract 30 seconds"
              >
                −30s
              </button>
            )}
            <button
              type="button"
              className="tool-action-btn tool-action-btn--primary"
              onClick={handlePrimary}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              className="tool-action-btn tool-action-btn--secondary"
              onClick={handleReset}
              disabled={resetDisabled}
            >
              Reset
            </button>
            {(isRunning || isPaused) && (
              <button
                type="button"
                className="tool-action-btn tool-action-btn--secondary"
                onClick={() => handleAdjust(30000)}
                aria-label="Add 30 seconds"
              >
                +30s
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
