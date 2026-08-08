import './index.css'
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useTableStore } from './store/tableStore'
import { PinScreen } from './components/auth/PinScreen'
import { AppShell } from './components/layout/AppShell'
import { KalenderPage } from './pages/KalenderPage'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loadFromServer = useTableStore((s) => s.loadFromServer)
  useWebSocket()

  useEffect(() => {
    loadFromServer()
  }, [loadFromServer])

  if (!isAuthenticated) {
    return <PinScreen />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />} />
        <Route path="/kalender" element={<KalenderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
