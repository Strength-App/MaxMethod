import { useState, useCallback } from 'react';
import { useTimer } from '../../context/ToolsContext';
import ToolsFAB from './ToolsFAB';
import ToolsPanel from './ToolsPanel';

export default function Tools() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('menu');
  // Destructure to hoist stable references — useCallback dep array can then
  // depend on these locals, which the exhaustive-deps lint can statically
  // verify. Depending on `timer` directly would re-create open() every tick
  // because the context value rebuilds on each remainingMs update.
  const { status, reset } = useTimer();

  // Timer-aware open routing:
  //   idle      → menu (default)
  //   running   → Timer view
  //   paused    → Timer view
  //   finished  → Timer view AND reset() — tap on indicator dismisses the
  //               finished state per F-UX2a
  const open = useCallback(() => {
    if (status === 'idle') {
      setActiveTool('menu');
    } else {
      if (status === 'finished') {
        reset();
      }
      setActiveTool('timer');
    }
    setIsOpen(true);
  }, [status, reset]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {!isOpen && <ToolsFAB onClick={open} />}
      <ToolsPanel
        isOpen={isOpen}
        onClose={close}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
      />
    </>
  );
}
