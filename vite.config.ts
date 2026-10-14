import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// The share-preview image needs an absolute address. On Vercel the build is
// told the site's address (a custom domain once there is one), so the page's
// __SITE_URL__ is filled in from that; anywhere else it is left empty.
export default defineConfig(({ mode }) => {
  const host = loadEnv(mode, '.', '').VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = host ? `https://${host}` : '';
  return {
    plugins: [
      {
        name: 'site-url',
        transformIndexHtml: (html: string) => html.replaceAll('__SITE_URL__', siteUrl),
      },
    ],
    base: './',
    build: {
      rollupOptions: {
        input: { main: 'index.html', settings: 'settings.html' },
      },
    },
    test: { environment: 'jsdom' },
  };
});
