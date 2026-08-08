import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Delete } from 'lucide-react'
import { cn } from '../../utils/cn'

export function PinScreen() {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const { login, error, lockoutUntil, clearError, isLoading } = useAuthStore()
  const [lockSeconds, setLockSeconds] = useState(0)

  useEffect(() => {
    if (!lockoutUntil) return
    const update = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setLockSeconds(remaining > 0 ? remaining : 0)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lockoutUntil])

  const handleDigit = (d: string) => {
    if (pin.length >= 4 || isLoading) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      setTimeout(async () => {
        const ok = await login(next)
        if (!ok) {
          setShake(true)
          setTimeout(() => setShake(false), 500)
        }
        setPin('')
      }, 100)
    }
  }

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1))
    clearError()
  }

  const isLocked = lockSeconds > 0 || isLoading

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-900">
      <h1 className="text-2xl font-bold text-white mb-8">Pool Sports Leipzig</h1>

      <div
        className={cn(
          'flex gap-3 mb-6',
          shake && 'animate-[shake_0.5s_ease-in-out]',
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 border-gray-500 transition-colors',
              i < pin.length && 'bg-blue-500 border-blue-500',
            )}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}
      {lockSeconds > 0 && (
        <p className="text-yellow-400 text-sm mb-4">
          Gesperrt: {lockSeconds}s
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(
          (key) => {
            if (key === '')
              return <div key="empty" className="w-[56px] h-[56px]" />
            if (key === 'del')
              return (
                <button
                  key="del"
                  onClick={handleDelete}
                  disabled={isLocked}
                  className="w-[56px] h-[56px] rounded-xl bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-700 disabled:opacity-30"
                >
                  <Delete size={20} />
                </button>
              )
            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                disabled={isLocked}
                className="w-[56px] h-[56px] rounded-xl bg-gray-800 text-white text-xl font-semibold hover:bg-gray-700 disabled:opacity-30"
              >
                {key}
              </button>
            )
          },
        )}
      </div>
    </div>
  )
}
