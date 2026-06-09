/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        verba: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          accent: '#6366f1',
          red: '#ef4444',
          amber: '#f59e0b',
          green: '#22c55e',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
