import { useCallback, type MouseEvent } from 'react';

// Pair with the `spotlight-card` CSS class (index.css): tracks the pointer
// position relative to the element itself and writes it to local --mx/--my
// custom properties, so the card's hover highlight follows the cursor
// instead of just being a flat on/off hover state.
export function useSpotlight() {
  const onMouseMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  return { onMouseMove, className: 'spotlight-card' };
}
