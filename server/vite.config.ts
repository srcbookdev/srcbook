/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mts'],
    globals: true,
  },
  server: {
    hmr: true,
  },
});
