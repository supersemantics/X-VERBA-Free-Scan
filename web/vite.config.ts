import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/scan/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/scan/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scan/, ''),
      },
    },
  },
});
