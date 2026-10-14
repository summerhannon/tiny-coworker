import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { main: 'index.html', settings: 'settings.html' },
    },
  },
  test: { environment: 'jsdom' },
});
