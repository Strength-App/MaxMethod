import { useEffect, useRef } from 'react';

/**
 * Toast — generic notification surface for "operation completed with notable
 * side effect" UX (e.g. PR change after a history edit). Light alternative to
 * a stacked modal: no focus trap, no demand-attention modality, dismissible
 * via X / action / auto-timeout.
 *
 * a11y: role="status" + aria-live="polite" by default (informational). Pass
 * role="alert" + aria-live="assertive" for urgent notices. Action buttons are
 * focusable but the toast does NOT auto-focus them — users shouldn't be yanked
 * away from whatever they were doing when the toast appears.
 *
 * Auto-dismiss pauses while the pointer is over the toast or focus is inside,
 * so users have time to read longer messages or act on the action button.
 */
export default function Toast({
  open,
  onDismiss,
  autoDismissMs = 12000,
  role = 'status',
  children,
}) {
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!open || autoDismissMs <= 0) return undefined;

    const start = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onDismiss?.(), autoDismissMs);
    };
    const pause = () => { pausedRef.current = true; clearTimeout(timerRef.current); };
    const resume = () => { if (pausedRef.current) { pausedRef.current = false; start(); } };

    start();
    const node = containerRef.current;
    node?.addEventListener('mouseenter', pause);
    node?.addEventListener('mouseleave', resume);
    node?.addEventListener('focusin', pause);
    node?.addEventListener('focusout', resume);
    return () => {
      clearTimeout(timerRef.current);
      node?.removeEventListener('mouseenter', pause);
      node?.removeEventListener('mouseleave', resume);
      node?.removeEventListener('focusin', pause);
      node?.removeEventListener('focusout', resume);
    };
  }, [open, autoDismissMs, onDismiss]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="toast"
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
    >
      <div className="toast-content">{children}</div>
      <button
        type="button"
        className="toast-dismiss"
        onClick={() => { clearTimeout(timerRef.current); onDismiss?.(); }}
        aria-label="Dismiss notification"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
