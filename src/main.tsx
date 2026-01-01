import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { queryClient } from '@/lib/queryClient'

/**
 * main.tsx
 *
 * 앱 진입점
 *
 * Providers:
 * 1. StrictMode (개발 모드 체크)
 * 2. QueryClientProvider (TanStack Query)
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
