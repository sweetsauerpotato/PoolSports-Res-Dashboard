import { create } from 'zustand'
import { Role } from '../types'

const MAX_ATTEMPTS = 3
const LOCKOUT_MS = 30000

interface AuthState {
  role: Role | null
  isAuthenticated: boolean
  failedAttempts: number
  lockoutUntil: number | null
  error: string | null
  isLoading: boolean
  login: (pin: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
  getPin: () => string
}

export const useAuthStore = create<AuthState>((set, get) => ({
  role: sessionStorage.getItem('role') as Role | null,
  isAuthenticated: !!sessionStorage.getItem('role'),
  failedAttempts: 0,
  lockoutUntil: null,
  error: null,
  isLoading: false,

  login: async (pin: string) => {
    const { failedAttempts, lockoutUntil } = get()
    if (lockoutUntil && Date.now() < lockoutUntil) {
      set({ error: `Gesperrt — bitte warten` })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      const BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${BASE}/api/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (res.ok) {
        const data = await res.json()
        const role = data.role as Role
        sessionStorage.setItem('role', role)
        sessionStorage.setItem('pin', pin)          // stored for X-PIN header
        set({ role, isAuthenticated: true, failedAttempts: 0, lockoutUntil: null, error: null, isLoading: false })
        return true
      }

      // PIN rejected by server
      const newAttempts = failedAttempts + 1
      if (newAttempts >= MAX_ATTEMPTS) {
        set({
          failedAttempts: newAttempts,
          lockoutUntil: Date.now() + LOCKOUT_MS,
          error: `Zu viele Versuche — 30s gesperrt`,
          isLoading: false,
        })
      } else {
        set({ failedAttempts: newAttempts, error: 'Falsche PIN', isLoading: false })
      }
      return false
    } catch {
      set({ error: 'Verbindungsfehler', isLoading: false })
      return false
    }
  },

  logout: () => {
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('pin')
    set({ role: null, isAuthenticated: false, error: null })
  },

  clearError: () => set({ error: null }),

  getPin: () => sessionStorage.getItem('pin') ?? '',
}))

