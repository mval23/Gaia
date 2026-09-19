import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    // auth-redirect.html is the page the Microsoft sign-in popup returns to.
    // docs/plans.html is also the in-app What's coming page (/plans), so it ships with the app.
    rollupOptions: { input: { main: 'index.html', authRedirect: 'auth-redirect.html', plans: 'docs/plans.html' } },
  },
});
