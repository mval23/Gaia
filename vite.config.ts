import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { icsResponse } from './api/_ics';

/**
 * Calendar feeds while developing. On Vercel, api/ics.ts answers this; with
 * `npm run dev` there are no functions, so the dev server answers it here with
 * the same code. Local addresses are allowed, since this only ever runs on
 * your own machine.
 */
function icsDevEndpoint(): Plugin {
  return {
    name: 'gaia-ics-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ics', (req, res) => {
        const asked = new URL(req.url ?? '', 'http://localhost').searchParams.get('url');
        void icsResponse(asked, { allowLocal: true }).then(async (response) => {
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(await response.text());
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), icsDevEndpoint()],
  server: { port: 5173, strictPort: true },
  build: {
    // auth-redirect.html is the page the Microsoft sign-in popup returns to.
    // docs/plans.html is also the in-app What's coming page (/plans), so it ships with the app.
    rollupOptions: { input: { main: 'index.html', authRedirect: 'auth-redirect.html', plans: 'docs/plans.html' } },
  },
});
