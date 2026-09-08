import { useCursorGlow } from '../hooks/useCursorGlow';

// Fixed, full-viewport, behind everything (z-index: -1, see index.css).
// Three slowly-drifting blurred blobs give the aurora motion, a faint grid
// gives it technical texture, and a screen-blended glow tracks the real
// cursor position — mounted once in Layout so it's shared across every page
// instead of re-rendering per route.
export default function AmbientBackground() {
  useCursorGlow();

  return (
    <div className="ambient-bg print:hidden" aria-hidden="true">
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />
      <div className="ambient-grid" />
      <div className="ambient-cursor-glow" />
    </div>
  );
}
