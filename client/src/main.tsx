import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.DEV) {
  import('@/store/useGameStore').then(({ useGameStore }) => {
    ;(window as unknown as Record<string, unknown>).__gameStore = useGameStore
  })
  import('@/store/useDashboardStore').then(({ useDashboardStore }) => {
    ;(window as unknown as Record<string, unknown>).__dashboardStore = useDashboardStore
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
