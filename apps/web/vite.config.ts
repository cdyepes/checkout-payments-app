import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // The monorepo keeps a single .env at the root (mirrors the `api` workspace's
  // `dotenv -e ../../.env` convention) rather than a duplicate one per package.
  envDir: path.resolve(__dirname, '../../'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@checkout/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
