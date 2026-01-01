import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 10300,
    host: true,
    proxy: {
      // Gateway API (REST)
      '/api': {
        target: 'http://localhost:10200',
        changeOrigin: true,
      },
      // MiniPACS DICOMweb API (QIDO-RS, WADO-RS)
      '/dicomweb': {
        target: 'http://localhost:10201',
        changeOrigin: true,
      },
    },
  },
  // Cornerstone3D Web Worker 호환성 설정
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
  },
  build: {
    // Cornerstone3D 대용량 번들 경고 억제
    chunkSizeWarningLimit: 2000,
  },
})
