/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['**/*.test.mts'],
    globals: true,
    environment: 'node',
  },
  server: {
    hmr: true,
  },
});
