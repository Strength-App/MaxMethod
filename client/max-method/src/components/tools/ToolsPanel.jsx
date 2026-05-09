import { useEffect, useRef } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import OneRMCalc from './OneRMCalc';
import RPECalc from './RPECalc';
import PlateCalc from './PlateCalc';
import Stopwatch from './Stopwatch';
import Timer from './Timer';

const TOOLS = [
  { id: '1rm',       title: '1RM Calculator',   subtitle: 'Estimate one-rep max' },
  { id: 'rpe',       title: 'RPE Calculator',   subtitle: 'Prescribe weight from RPE' },
  { id: 'plates',    title: 'Plate Calculator', subtitle: 'Visualize plate loading' },
  { id: 'timer',     title: 'Rest Timer',       subtitle: 'Countdown with alarm' },
  { id: 'stopwatch', title: 'Stopwatch',        subtitle: 'Count up' },
];

// Per-tool render dispatch. Each new group adds a case here. Default is the
// pre-Group placeholder for tools that haven't landed yet.
function renderTool(activeTool, tool) {
  switch (activeTool) {
    case '1rm':
      return <OneRMCalc />;
    case 'rpe':
      return <RPECalc />;
    case 'plates':
      return <PlateCalc />;
    case 'stopwatch':
      return <Stopwatch />;
    case 'timer':
      return <Timer />;
    default:
      return (
        <div className="tools-tool-placeholder">
          {tool?.title} — coming in a future group
        </div>
      );
  }
}

export default function ToolsPanel({ isOpen, onClose, activeTool, onSelectTool }) {
  const modalRef = useModalA11y({ isOpen, onClose });
  const backBtnRef = useRef(null);
  const firstMenuItemRef = useRef(null);
  const initialMountRef = useRef(true);

  // Focus management on activeTool change. Skips the initial open — useModalA11y
  // owns initial focus. Subsequent transitions land focus inside the panel so
  // keyboard users don't drop to body when content swaps.
  useEffect(() => {
    if (!isOpen) {
      initialMountRef.current = true;
      return;
    }
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (activeTool === 'menu') {
      firstMenuItemRef.current?.focus();
    } else {
      backBtnRef.current?.focus();
    }
  }, [activeTool, isOpen]);

  if (!isOpen) return null;

  const onMenu = activeTool === 'menu';
  const tool = TOOLS.find(t => t.id === activeTool);

  return (
    <div className="tools-overlay">
      {/* Backdrop is a real <button> sibling of the panel — closes on click and
          on Enter/Space natively. tabIndex=-1 keeps it out of the tab order so
          useModalA11y's focus trap (which scopes to the panel) is the sole
          keyboard navigation surface. Click events on the panel don't reach
          the backdrop because they're siblings, not parent–child. */}
      <button
        type="button"
        className="tools-overlay-backdrop"
        aria-label="Close tools panel"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="tools-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tools-panel-title"
      >
        <div className="tools-panel-handle" aria-hidden="true" />

        <div className="tools-panel-header">
          {!onMenu && (
            <button
              ref={backBtnRef}
              type="button"
              className="tools-panel-back"
              onClick={() => onSelectTool('menu')}
              aria-label="Back to tools menu"
            >
              <span aria-hidden="true">←</span> Back
            </button>
          )}
          <div className="tools-panel-title" id="tools-panel-title">
            {onMenu ? 'Tools' : tool?.title}
          </div>
        </div>

        {onMenu ? (
          <ul className="tools-menu">
            {TOOLS.map((t, i) => (
              <li key={t.id}>
                <button
                  ref={i === 0 ? firstMenuItemRef : null}
                  type="button"
                  className="tools-menu-item"
                  onClick={() => onSelectTool(t.id)}
                >
                  <span className="tools-menu-item-title">{t.title}</span>
                  <span className="tools-menu-item-subtitle">{t.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tools-tool-slot">
            {renderTool(activeTool, tool)}
          </div>
        )}
      </div>
    </div>
  );
}
