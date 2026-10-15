import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Online play in dev: run `npm run dev:worker` alongside `npm run dev`.
  server: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } },
});
