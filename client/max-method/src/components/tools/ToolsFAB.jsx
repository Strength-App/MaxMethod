import { useTimer } from '../../context/ToolsContext';

const URGENT_THRESHOLD_MS = 10_000;

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(ms) {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(totalSecs / 60))}:${pad(totalSecs % 60)}`;
}

export default function ToolsFAB({ onClick }) {
  const { status, remainingMs } = useTimer();
  const isIndicator = status !== 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isFinished = status === 'finished';
  const isUrgent = (isRunning || isPaused) && remainingMs > 0 && remainingMs <= URGENT_THRESHOLD_MS;

  const className = [
    'tools-fab',
    isIndicator && 'tools-fab--indicator',
    isFinished && 'tools-fab--indicator-finished',
    isUrgent && 'tools-fab--indicator-urgent',
  ].filter(Boolean).join(' ');

  const ariaLabel = isFinished
    ? 'Timer finished, tap to dismiss and open Tools'
    : isRunning
      ? `Timer running, ${formatTime(remainingMs)} remaining, tap to view`
      : isPaused
        ? `Timer paused, ${formatTime(remainingMs)} remaining, tap to view`
        : 'Open Tools';

  return (
    <button type="button" className={className} onClick={onClick} aria-label={ariaLabel}>
      {isIndicator ? (
        <span className="tools-fab-indicator-time">
          {isFinished ? 'Done!' : formatTime(remainingMs)}
        </span>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="21" y1="4" x2="14" y2="4" />
          <line x1="10" y1="4" x2="3" y2="4" />
          <line x1="21" y1="12" x2="12" y2="12" />
          <line x1="8" y1="12" x2="3" y2="12" />
          <line x1="21" y1="20" x2="16" y2="20" />
          <line x1="12" y1="20" x2="3" y2="20" />
          <line x1="14" y1="2" x2="14" y2="6" />
          <line x1="8" y1="10" x2="8" y2="14" />
          <line x1="16" y1="18" x2="16" y2="22" />
        </svg>
      )}
    </button>
  );
}
