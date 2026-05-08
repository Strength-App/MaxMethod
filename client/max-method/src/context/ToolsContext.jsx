import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const ToolsContext = createContext(null);

const TICK_MS = 250;
const BEEP_FREQ_HZ = 720;
const BEEP_DURATION_S = 0.3;
const BEEP_PEAK_GAIN = 0.4;

export function ToolsProvider({ children }) {
  // Timer state — timestamp model. Source of truth for accuracy is
  // (endsAt - Date.now()), read from interval callbacks (impure read kept
  // out of render). remainingMs is held in state and re-synced every TICK_MS;
  // tab backgrounding and React reconciliation pauses can't drift the source.
  const [status, setStatus] = useState('idle'); // idle | running | paused | finished
  const [endsAt, setEndsAt] = useState(null);
  const [durationMs, setDurationMs] = useState(0);
  const [pauseRemainingMs, setPauseRemainingMs] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const audioCtxRef = useRef(null);

  const playBeep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = BEEP_FREQ_HZ;

    const now = ctx.currentTime;
    const end = now + BEEP_DURATION_S;
    // Gentle attack/release envelope avoids the click of an abrupt on/off.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(BEEP_PEAK_GAIN, now + 0.02);
    gain.gain.setValueAtTime(BEEP_PEAK_GAIN, end - 0.05);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(end);
  }, []);

  // Single interval lives here, not at consumers. Active only while running;
  // cleanup clears it the instant status leaves 'running', so no ghost intervals.
  // Initial remainingMs is set synchronously by start()/resume() — this effect
  // only owns the periodic re-sync from the source-of-truth (endsAt - Date.now()).
  useEffect(() => {
    if (status !== 'running' || endsAt == null) return;

    const id = setInterval(() => {
      const remaining = Math.max(0, endsAt - Date.now());
      if (remaining <= 0) {
        setRemainingMs(0);
        setStatus('finished');
        playBeep();
      } else {
        setRemainingMs(remaining);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [status, endsAt, playBeep]);

  const start = useCallback((ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return;
    // AudioContext must be created/resumed inside a user gesture; start() is
    // called from the Start button's click handler so this is the unlock point.
    if (!audioCtxRef.current) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      } catch { /* no audio support — timer still works, just silent */ }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setDurationMs(ms);
    setEndsAt(Date.now() + ms);
    setPauseRemainingMs(null);
    setRemainingMs(ms);
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    if (status !== 'running' || endsAt == null) return;
    const remaining = Math.max(0, endsAt - Date.now());
    setPauseRemainingMs(remaining);
    setRemainingMs(remaining);
    setStatus('paused');
  }, [status, endsAt]);

  const resume = useCallback(() => {
    if (status !== 'paused' || pauseRemainingMs == null) return;
    setEndsAt(Date.now() + pauseRemainingMs);
    setRemainingMs(pauseRemainingMs);
    setPauseRemainingMs(null);
    setStatus('running');
  }, [status, pauseRemainingMs]);

  const reset = useCallback(() => {
    setStatus('idle');
    setEndsAt(null);
    setDurationMs(0);
    setPauseRemainingMs(null);
    setRemainingMs(0);
  }, []);

  const adjust = useCallback((deltaMs) => {
    if (!Number.isFinite(deltaMs) || deltaMs === 0) return;
    if (status === 'running' && endsAt != null) {
      const newEndsAt = endsAt + deltaMs;
      setEndsAt(newEndsAt);
      // newEndsAt may be in the past after a large negative delta — display
      // clamps at 0 and the interval callback's existing finish detection
      // fires within TICK_MS.
      setRemainingMs(Math.max(0, newEndsAt - Date.now()));
    } else if (status === 'paused' && pauseRemainingMs != null) {
      const newRemaining = Math.max(0, pauseRemainingMs + deltaMs);
      setPauseRemainingMs(newRemaining);
      setRemainingMs(newRemaining);
      // No interval running while paused — paused-at-0 stays paused until
      // user resumes (next tick fires finished) or resets.
    }
    // No-op for idle / finished. durationMs intentionally untouched.
  }, [status, endsAt, pauseRemainingMs]);

  const value = {
    timer: {
      status,
      remainingMs,
      durationMs,
      start,
      pause,
      resume,
      reset,
      adjust,
    },
  };

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useTools() {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error('useTools must be used inside <ToolsProvider>');
  return ctx;
}

export function useTimer() {
  return useTools().timer;
}
