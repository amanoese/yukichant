import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/yukichant/',
  plugins: [vue()],
  resolve: {
    alias: {
      path: resolve('path-shim.js'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 9000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/natural')) return 'natural'
        },
      },
    },
  },
})
