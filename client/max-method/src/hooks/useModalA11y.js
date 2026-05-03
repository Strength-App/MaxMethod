import { useEffect, useRef } from 'react';

/**
 * Modal accessibility primitive (WCAG 2.1 AA).
 *
 * Wires up the four behaviors every accessible modal needs:
 *   1. Initial focus moves into the modal (first focusable, or initialFocusRef).
 *   2. Tab / Shift+Tab is trapped inside the modal.
 *   3. Escape calls onClose.
 *   4. On close, focus returns to the element that opened the modal.
 *
 * Also locks <body> scroll while the modal is open.
 *
 * Usage:
 *   const modalRef = useModalA11y({ isOpen, onClose });
 *   return isOpen ? (
 *     <div className="overlay" onClick={onClose}>
 *       <div
 *         ref={modalRef}
 *         role="dialog"
 *         aria-modal="true"
 *         aria-labelledby="my-modal-title"
 *         onClick={(e) => e.stopPropagation()}
 *       >
 *         <h2 id="my-modal-title">…</h2>
 *         …
 *       </div>
 *     </div>
 *   ) : null;
 */
export function useModalA11y({ isOpen, onClose, initialFocusRef = null }) {
  const modalRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    openerRef.current = document.activeElement;

    const node = modalRef.current;
    if (!node) return;

    const target = initialFocusRef?.current ?? getFirstFocusable(node) ?? node;
    if (target && typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusables(node);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      const opener = openerRef.current;
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [isOpen, onClose, initialFocusRef]);

  return modalRef;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

function getFocusables(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);
}

function getFirstFocusable(root) {
  return getFocusables(root)[0] ?? null;
}

function isVisible(el) {
  if (el.hasAttribute('disabled')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return el.offsetParent !== null || style.position === 'fixed';
}
