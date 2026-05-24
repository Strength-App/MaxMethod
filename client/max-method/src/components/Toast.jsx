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
 * Leaving (mouseleave / focusout) restarts a fresh full-duration countdown.
 * The pending timer is cleared on unmount and whenever `open` flips to false,
 * so a closed or unmounted toast never fires a late `onDismiss`.
 *
 * @param {Object} props
 * @param {boolean} props.open Whether the toast is shown. When false the
 *   component renders nothing and any pending auto-dismiss timer is cleared.
 * @param {() => void} [props.onDismiss] Called when the toast should close — on
 *   auto-timeout and on the × button, but never on pause. The parent owns `open`
 *   and is expected to flip it to false in response.
 * @param {number} [props.autoDismissMs=12000] Auto-dismiss delay in ms. A value
 *   `<= 0` disables auto-dismiss entirely (the toast stays until manually closed).
 * @param {'status'|'alert'} [props.role='status'] ARIA live-region role.
 *   `'status'` pairs with `aria-live="polite"` (informational); `'alert'` pairs
 *   with `aria-live="assertive"` (urgent).
 * @param {React.ReactNode} props.children Toast body content.
 * @returns {JSX.Element|null} The toast element, or `null` when `open` is false.
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
