import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteCommonjs()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 10300,
    host: true,
    proxy: {
      // DICOMweb Standard API (QIDO-RS, WADO-RS, STOW-RS)
      '/dicomweb': {
        target: 'http://localhost:10201',
        changeOrigin: true,
      },
      // REST API (Patient, Study, Admin)
      '/api': {
        target: 'http://localhost:10201',
        changeOrigin: true,
      },
    },
  },
  worker: {
    format: 'es',  // Cornerstone3D worker compatibility (Vite 7.x)
  },
  optimizeDeps: {
    include: [
      'globalthis',       // CommonJS polyfill (mini-pacs-poc 검증)
      '@kitware/vtk.js',  // vtk.js 사전 번들링 (mini-pacs-poc 검증)
      'dicom-parser',     // Cornerstone3D 권장 의존성
    ],
    exclude: [
      '@cornerstonejs/dicom-image-loader', // Web Worker 포함으로 인한 Vite 최적화 제외
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'es2022',  // More stable than esnext (sonix-viviane config)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          cornerstone: [
            '@cornerstonejs/core',
            '@cornerstonejs/tools',
          ],
        },
      },
    },
  },
})
