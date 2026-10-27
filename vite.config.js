import { defineConfig } from 'vite';

// GitHub Pages serves the site from /shopping-cart/, not the domain root.
export default defineConfig({
  base: '/shopping-cart/',
  server: { port: 5500 },
});
