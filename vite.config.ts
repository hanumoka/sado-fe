import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 환경 변수 로드 (.env, .env.local, .env.[mode] 등)
  const env = loadEnv(mode, process.cwd(), '')

  // 백엔드 API 서버 URL (환경 변수로 설정 가능)
  // 기본값: Nginx 캐시 프록시 (10202) - 캐싱으로 성능 향상
  // 직접 연결: VITE_API_TARGET=http://localhost:10201
  // 원격 서버: VITE_API_TARGET=http://192.168.1.100:10201
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:10202'

  return {
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
          target: apiTarget,
          changeOrigin: true,
        },
        // REST API (Patient, Study, Admin)
        '/api': {
          target: apiTarget,
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
  }
})
