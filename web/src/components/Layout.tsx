import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-verba-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-verba-accent flex items-center justify-center font-mono font-bold text-sm">
              XV
            </div>
            <div>
              <span className="font-semibold text-white group-hover:text-verba-accent transition-colors">
                X-VERBA
              </span>
              <span className="text-verba-muted text-xs ml-2">Governance Scanner</span>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <a
              href="https://github.com/4vish/x-verba"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-verba-muted hover:text-white transition-colors"
            >
              Docs
            </a>
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
      <footer className="border-t border-verba-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-verba-muted">
          <span>Super Semantics &mdash; supersemantics.org</span>
          <span>v0.2.0</span>
        </div>
      </footer>
    </div>
  );
}
