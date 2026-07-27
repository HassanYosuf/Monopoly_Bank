import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // The shared game-state package is symlinked in via a file: dependency
    // and compiled as CommonJS (the server side needs CJS) — without this,
    // Vite serves it as raw source and the browser can't resolve its
    // `require()` calls, since named ESM exports don't exist on it.
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ['@monopoly-money/game-state'],
  },
})
