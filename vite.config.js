import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite usa el plugin oficial de React para transformar JSX y habilitar Fast Refresh.
export default defineConfig({
  plugins: [react()],
  // En desarrollo y preview, los endpoints locales llegan al servidor Node con base SQLite.
  server: {
    proxy: { '/api': { target: `http://127.0.0.1:${process.env.MASTERDEX_API_PORT || 3001}` } },
  },
  preview: {
    proxy: { '/api': { target: `http://127.0.0.1:${process.env.MASTERDEX_API_PORT || 3001}` } },
  },
});
