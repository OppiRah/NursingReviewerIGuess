import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

/** Strict CSP: no inline scripts or styles, no remote origins. Exported for the security test. */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** Adds the CSP meta tag to the production build only (Vite's dev HMR preamble is an inline script). */
function cspPlugin(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
  };
}

// Offline app shell. No runtime caching of remote URLs: the app makes no remote calls.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    cspPlugin(),
    react(),
    VitePWA({
      // AUDIT-001 A-03: a new version waits until the student taps "update" (src/app/update.ts registers
      // the worker and shows the banner). Nothing reloads the app on its own, so a session is never interrupted.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Nursing Reviewer',
        short_name: 'Reviewer',
        description: 'Turn your own reviewers into short daily active-recall sessions.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#1d1233',
        theme_color: '#4b2a8c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // The PDF/Word readers (BUILD-005) are not precached: most students never need them, and they
        // would add ~1.8 MB to every install. They are cached the first time a file is imported, so
        // later imports also work offline.
        globIgnores: ['**/assets/pdf-*.js', '**/assets/pdf.worker*', '**/assets/mammoth-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/(pdf-|pdf\.worker|mammoth-)/.test(url.pathname),
            handler: 'CacheFirst', // file names are content-hashed, so a cached copy is never stale
            options: { cacheName: 'import-readers', expiration: { maxEntries: 8 } },
          },
        ],
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        // Name the lazy Word-reader chunk after its library (it would otherwise be called "lib").
        chunkFileNames: (chunk) => (chunk.facadeModuleId?.includes('/mammoth/') ? 'assets/mammoth-[hash].js' : 'assets/[name]-[hash].js'),
      },
    },
  },
});
