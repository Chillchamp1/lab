import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode artifact` inlines everything into one HTML file (for claude.ai artifact previews).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'artifact' ? 'dist-artifact' : 'dist', chunkSizeWarningLimit: 2000 },
  test: { environment: 'node' },
}));
