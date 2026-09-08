import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AmbientBackground from './AmbientBackground';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <AmbientBackground />
      {/* bg-verba-bg (solid, not transparent): without it, the ambient
          grid/blob texture behind the header showed straight through and
          visually competed with the logo's fine linework — looked like the
          background was "masking" part of the logo, even though nothing
          was actually clipped (confirmed via computed layout: logo sits
          fully inside the header box with ~8-9px clearance before the
          border). A solid backing here fixes that without touching the
          ambient system itself. */}
      <header className="bg-verba-bg border-b border-verba-border px-6 py-2 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {/* Sep 2026 rebrand lockup, split into two assets: the S-mark
                icon is genuinely black-filled (two-tone, light-background
                design, matching the standalone Super Semantics mark) and
                was disappearing into the dark header. It gets the same
                light chip treatment as the footer's S-mark. The wordmark
                portion (white "VERBA" + green "X", zero black) stays
                directly on the dark header, where it already has full
                contrast. */}
            <div className="bg-white rounded-lg p-1 flex items-center justify-center opacity-95 group-hover:opacity-100 transition-opacity">
              <img src="/x-verba-icon.png" alt="" className="h-9 w-auto" />
            </div>
            <img
              src="/x-verba-wordmark.png"
              alt="X-VERBA — powered by Super Semantics"
              className="h-14 w-auto opacity-95 group-hover:opacity-100 transition-opacity"
            />
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-sm text-verba-muted hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/docs" className="text-sm text-verba-muted hover:text-white transition-colors">
              Docs
            </Link>
            <button className="text-sm px-4 py-1.5 rounded-lg bg-verba-surface border border-verba-border text-verba-muted hover:text-white hover:border-verba-accent transition-all">
              Sign In
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-verba-border px-6 py-4 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-verba-muted">
          <a
            href="https://www.supersemantics.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            {/* The standalone S-mark is black/light-gray — designed for a
                light background (matches the live marketing site), not
                this dark footer directly. A small light chip gives it its
                own correct backdrop instead of inverting the true brand
                colors. */}
            <div className="bg-white rounded-lg p-1.5 flex items-center justify-center">
              <img src="/super-semantics-logo.png" alt="Super Semantics" className="h-6 w-auto" />
            </div>
            <span>supersemantics.org</span>
          </a>
          <span>v0.2.0</span>
        </div>
      </footer>
    </div>
  );
}
