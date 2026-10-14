import { defineConfig } from 'vitest/config';

// The share-preview image needs an absolute address. On Vercel the build is
// told the site's address (a custom domain once there is one), so the page's
// __SITE_URL__ is filled in from that; anywhere else it is left empty.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : '';

export default defineConfig({
  plugins: [
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    },
  ],
  base: './',
  build: {
    rollupOptions: {
      input: { main: 'index.html', settings: 'settings.html' },
    },
  },
  test: { environment: 'jsdom' },
});
