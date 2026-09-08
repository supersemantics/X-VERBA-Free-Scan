/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Super Semantics REBRAND (Sep 2026) — replaces the earlier navy/cyan
        // token set with the black/white/gray + single green-accent system
        // from "Super Semantics Design System.pdf" (VinkWeb Studios export),
        // confirmed live on supersemantics.org. Kept the dark base per
        // direction — the site itself is light-first, X-VERBA stays dark.
        //
        // Literal tokens from the doc: bg #1A1A1A, accent/badge #67AA38,
        // text-secondary #565656 (defined for light backgrounds).
        // Everything else below is DERIVED, not a literal doc value —
        // marked as such, since the doc only gives light-mode pairings and
        // X-VERBA needs a dark card/border/muted-text scale on top of it.
        verba: {
          bg: '#1A1A1A',        // doc: Background (dark)
          surface: '#242424',   // derived — lightness step off bg for card depth
          border: '#333333',    // derived — subtle separator on dark
          accent: '#67AA38',    // doc: Badge/accent green (only accent color defined)
          red: '#F43F5E',       // unchanged — no severity-red token in the doc
          amber: '#F59E0B',     // unchanged — no severity-amber token in the doc
          green: '#67AA38',     // reuses the brand green for "governed/good" —
                                 // matches the doc's own badge usage (their live
                                 // site uses this green as a status dot), and no
                                 // separate success color is defined
          muted: '#9A9A9A',     // derived — #565656 is a light-mode secondary-text
                                 // tone; inverted toward a lighter gray so it stays
                                 // readable on the dark #1A1A1A base
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        // Headings/display only — body copy stays on Inter (brand spec).
        // Space Grotesk echoes the logo's angular/HUD character without
        // tipping into sci-fi-gimmick territory (Orbitron etc), which would
        // undercut the "enterprise-credible" positioning.
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
