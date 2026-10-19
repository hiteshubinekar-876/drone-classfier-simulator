import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { aarAiProxyPlugin } from './src/server/aiProxyHandler';

export default defineConfig({
  plugins: [react(), aarAiProxyPlugin()],
  server: {
    port: 5173,
    host: true,
    cors: true,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  }
});
