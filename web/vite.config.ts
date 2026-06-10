import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 9051,
    proxy: {
      '/api': 'http://localhost:9050',
      '/ws': { target: 'ws://localhost:9050', ws: true },
      '/download': 'http://localhost:9050',
    },
  },
});
