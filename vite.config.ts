import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    // auth-redirect.html is the page the Microsoft sign-in popup returns to.
    rollupOptions: { input: { main: 'index.html', authRedirect: 'auth-redirect.html' } },
  },
});
