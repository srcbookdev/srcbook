import { useState } from 'react';
import { Button } from './button';

/**
 * A simple toggle button that calls onChange(enabled) whenever the toggle is flipped.
 */
export function SequentialThinkingToggle({
  onChange,
}: {
  onChange: (enabled: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(false);

  function handleClick() {
    const newVal = !enabled;
    setEnabled(newVal);
    onChange(newVal);
  }

  return (
    <Button variant="secondary" size="default" onClick={handleClick}>
      {enabled ? 'Sequential: ON' : 'Sequential: OFF'}
    </Button>
  );
}