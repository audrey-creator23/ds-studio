import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Deux interfaces : la version actuelle et l'itération v3.
      input: { main: 'index.html', v3: 'v3.html' },
      // Directives « use client » de Mantine : sans objet hors serveur React.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
  server: { host: '127.0.0.1' },
});
