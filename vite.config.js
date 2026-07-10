import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
});
