import { useEffect, useRef, useState } from 'react';
import { levelProgress } from '../utils/classification';

const PHASE_TRANSITION = 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)';
const HOLD_MS = 80;

function UserLevelBadge({
  sex, bodyweight, total,
  animateFromTotal = null, showProgress = true, wide = false,
  onPhaseTransition,
}) {
  const bw = Number(bodyweight);
  const t = Number(total);
  const valid = Boolean(sex) && bw > 0 && t > 0;

  // Post-state shape — drives final labels and resting state.
  const postProgress = valid
    ? levelProgress({ sex, bodyweight: bw, total: t })
    : { fineLevel: '', nextLevel: null, currentThreshold: 0, nextThreshold: 0, lbsToNext: null };

  const hasAnimation = valid && animateFromTotal != null && Number(animateFromTotal) !== t;
  const preTotal = hasAnimation ? Number(animateFromTotal) : null;
  // Pre-state shape — used to detect level-up and render Phase A's labels.
  const preProgress = hasAnimation
    ? levelProgress({ sex, bodyweight: bw, total: preTotal })
    : null;

  // Level-up = different tiers AND moved up. The currentThreshold check
  // defends against the theoretically-impossible level-DOWN, which falls back
  // to single-stage using post-state thresholds.
  const isLevelUpAnim = hasAnimation
    && preProgress.fineLevel !== postProgress.fineLevel
    && preProgress.currentThreshold < postProgress.currentThreshold;

  // Reduced-motion users skip the staged celebration — same intent as the
  // CSS @media rule, hoisted to JS so the phase machine doesn't run pointlessly.
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // % of progress within `shape`'s tier, clamped [0, 100].
  const computePct = (val, shape) => {
    if (!shape) return 0;
    if (shape.nextLevel == null) return 100;
    const span = shape.nextThreshold - shape.currentThreshold;
    if (span <= 0) return 100;
    return Math.max(0, Math.min(100, ((val - shape.currentThreshold) / span) * 100));
  };

  const postEndPct = computePct(t, postProgress);
  // Phase A start: pre's % using PRE thresholds (where the user actually was).
  const preStartPct = isLevelUpAnim ? computePct(preTotal, preProgress) : 0;
  // Single-stage start: pre's % using POST thresholds (preserves prior behavior).
  const singleStartPct = (hasAnimation && !isLevelUpAnim) ? computePct(preTotal, postProgress) : postEndPct;

  // Phase machine. 'idle': no animation. 'single': single-stage in flight.
  // 'phase-a': level-up Phase A (pre tier, preStartPct → 100%). 'snap':
  // instant tier-swap moment. 'phase-b': level-up Phase B (post tier,
  // 0% → postEndPct). 'done': settled at post tier.
  const initialPhase = !hasAnimation ? 'idle'
    : prefersReducedMotion ? 'done'
    : isLevelUpAnim ? 'phase-a'
    : 'single';
  const initialFillPct = (initialPhase === 'phase-a') ? preStartPct
    : (initialPhase === 'single') ? singleStartPct
    : postEndPct;
  // Inline transition style overrides the CSS rule's 800ms cadence — only
  // for level-up phases (600ms each) and the snap moment ('none'). Single-
  // stage and idle let the CSS rule apply.
  const initialTransition = (initialPhase === 'phase-a') ? PHASE_TRANSITION : undefined;

  const [phase, setPhase] = useState(initialPhase);
  const [fillPct, setFillPct] = useState(initialFillPct);
  const [transitionStyle, setTransitionStyle] = useState(initialTransition);

  // Reduced-motion + level-up: banner-reveal callback fires immediately on
  // mount (the staged build-up is skipped). Ref guards against double-fire
  // across re-renders. Non-level-up reduced-motion: callback never fires.
  const reducedMotionFiredRef = useRef(false);
  useEffect(() => {
    if (prefersReducedMotion && isLevelUpAnim && !reducedMotionFiredRef.current) {
      reducedMotionFiredRef.current = true;
      onPhaseTransition?.();
    }
  }, [prefersReducedMotion, isLevelUpAnim, onPhaseTransition]);

  // Single-stage: existing two-frame gap nudge. fillPct: singleStartPct →
  // postEndPct under the CSS rule's 800ms transition.
  useEffect(() => {
    if (phase !== 'single') return;
    const raf = requestAnimationFrame(() => setFillPct(postEndPct));
    return () => cancelAnimationFrame(raf);
  }, [phase, postEndPct]);

  // Phase A: nudge from preStartPct → 100%.
  useEffect(() => {
    if (phase !== 'phase-a') return;
    const raf = requestAnimationFrame(() => setFillPct(100));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Phase B: nudge from 0 → postEndPct.
  useEffect(() => {
    if (phase !== 'phase-b') return;
    const raf = requestAnimationFrame(() => setFillPct(postEndPct));
    return () => cancelAnimationFrame(raf);
  }, [phase, postEndPct]);

  // The 80ms hold timer between Phase A's end and Phase B's start. Stored on
  // a ref so unmount-during-hold can cancel it without lifting the snap
  // logic into a useEffect (which the set-state-in-effect lint correctly
  // flags as a cascading render — the snap's batched commits belong in the
  // event handler that triggers them, not in a render-cycle effect).
  const snapTimerRef = useRef(null);
  useEffect(() => () => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
  }, []);

  // Advance the machine off the fill's transitionend events. Phase A's end
  // commits the snap inline: setPhase('snap') + transition 'none' + width 0
  // batch into a single render → instant visual snap with no animation.
  // After HOLD_MS the timer transitions into Phase B with the transition
  // style restored. Filtering on propertyName guards against unrelated
  // transitions firing the handler.
  const handleFillTransitionEnd = (e) => {
    if (e.propertyName !== 'width') return;
    if (phase === 'phase-a') {
      setPhase('snap');
      setTransitionStyle('none');
      setFillPct(0);
      onPhaseTransition?.();
      snapTimerRef.current = setTimeout(() => {
        setTransitionStyle(PHASE_TRANSITION);
        setPhase('phase-b');
        snapTimerRef.current = null;
      }, HOLD_MS);
    } else if (phase === 'phase-b') {
      setPhase('done');
    }
  };

  if (!valid) return null;

  // Display tier: pre during Phase A only; post for everything else (snap,
  // phase-b, done, single, idle). Pill, corner labels, and mid-progress all
  // follow this. Aria values lock to post regardless.
  const displayedTier = phase === 'phase-a' ? preProgress : postProgress;
  const { fineLevel, nextLevel, currentThreshold, nextThreshold, lbsToNext } = displayedTier;
  const isElite = nextLevel == null;

  const postPctRounded = Math.round(postEndPct);
  const ariaLabel = postProgress.nextLevel == null
    ? 'Maxed out'
    : `${postPctRounded}% to ${postProgress.nextLevel}`;

  // Mid-percent text shows the displayed tier's snapshot value — pre's start
  // % during Phase A, post's end % otherwise. The bar's animated width tells
  // the journey; the text is the settled snapshot in the displayed tier.
  const displayedPctRounded = Math.round(
    phase === 'phase-a' ? preStartPct : postEndPct
  );

  const rootClass = `user-level-badge${wide ? ' user-level-badge--wide' : ''}`;
  const fillStyle = transitionStyle
    ? { width: `${fillPct}%`, transition: transitionStyle }
    : { width: `${fillPct}%` };

  return (
    <div className={rootClass}>
      <div className="user-level-badge__label">{fineLevel}</div>
      {showProgress && (
        <div className="user-level-badge__bar-region">
          <div className="user-level-badge__bar-top-row">
            <div className="user-level-badge__bar-corner-name">{fineLevel}</div>
            <div className="user-level-badge__bar-mid-progress">
              {!isElite && (
                <>
                  <span className="user-level-badge__bar-progress-lbs">{lbsToNext} lbs</span>
                  {' to '}
                  {nextLevel}
                </>
              )}
            </div>
            <div className="user-level-badge__bar-corner-name user-level-badge__bar-corner-name--right">
              {isElite ? '—' : nextLevel}
            </div>
          </div>
          <div
            className="user-level-badge__bar-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={postPctRounded}
            aria-label={ariaLabel}
          >
            <div
              className="user-level-badge__bar-fill"
              style={fillStyle}
              onTransitionEnd={handleFillTransitionEnd}
            />
          </div>
          <div className="user-level-badge__bar-bottom-row">
            <div className="user-level-badge__bar-corner-value">{currentThreshold}</div>
            <div className="user-level-badge__bar-mid-percent">
              {isElite ? <span className="user-level-badge__bar-maxed">Maxed Out</span> : `${displayedPctRounded}%`}
            </div>
            <div className="user-level-badge__bar-corner-value user-level-badge__bar-corner-value--right">
              {isElite ? '—' : nextThreshold}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserLevelBadge;
