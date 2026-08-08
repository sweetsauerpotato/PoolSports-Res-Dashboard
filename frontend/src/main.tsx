import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Sprint 1.1 — Request persistent IndexedDB storage so the browser does not
// evict the offline cache under disk pressure. Must be called before first
// render. If denied: offline resilience is degraded but the app still works.
// Installed PWAs receive an auto-grant from Chrome in most cases.
async function bootstrap() {
  if (navigator.storage?.persist) {
    const granted = await navigator.storage.persist()
    console.info('[PWA] Persistent storage:', granted ? 'granted' : 'denied — eviction possible')
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
