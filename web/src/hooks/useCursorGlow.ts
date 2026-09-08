import { useEffect } from 'react';

// Drives the page-wide cursor-follow glow (.ambient-cursor-glow in
// index.css) by writing the pointer position to CSS custom properties on
// <html>, rAF-throttled so it never fires more than once per frame. Fades
// in on first move (so there's no glow sitting at a stale 50%/50% default
// before the user's mouse has actually entered the window) and fades out
// when the pointer leaves the viewport.
export function useCursorGlow(): void {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    const apply = () => {
      raf = 0;
      if (!pending) return;
      root.style.setProperty('--cursor-x', `${pending.x}px`);
      root.style.setProperty('--cursor-y', `${pending.y}px`);
      root.style.setProperty('--cursor-glow-opacity', '1');
    };

    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      root.style.setProperty('--cursor-glow-opacity', '0');
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
