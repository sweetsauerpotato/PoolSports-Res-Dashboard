import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../../utils/cn'

interface Props {
  currentDate: Date
  selectedDate: string | null
  onPrev: () => void
  onNext: () => void
  onRefresh: () => Promise<void>
  onQuickCheck: () => void
}

export function CalendarHeader({ currentDate, selectedDate, onPrev, onNext, onRefresh, onQuickCheck }: Props) {
  const label = format(currentDate, 'MMMM yyyy', { locale: de })
  const wsStatus = useUiStore((s) => s.wsStatus)
  const triggerReconnect = useUiStore((s) => s.triggerReconnect)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    // Brief visual feedback — max 800ms
    setTimeout(() => setIsRefreshing(false), 700)
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">📅 Buchungs-Kalender</h1>
        
        <div className="flex items-center gap-1 ml-1">
          {/* SIGNAL BUTTON */}
          <button
            onClick={triggerReconnect}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-800/60 transition-colors group relative"
          >
            <div className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-500",
              wsStatus === 'connected' ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
            )} />
            
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 border border-gray-700 text-[10px] text-gray-300 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50 shadow-2xl">
              {wsStatus === 'connected' ? 'Verbunden' : 'Verbindung unterbrochen — Neu verbinden'}
            </span>
          </button>

          {/* REFRESH BUTTON */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-800/60 text-gray-400 hover:text-white transition-all group relative"
          >
            <RefreshCw size={18} className={cn("transition-transform", isRefreshing && "animate-spin text-blue-400")} />
            
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 border border-gray-700 text-[10px] text-gray-300 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50 shadow-2xl">
              Kalender aktualisieren
            </span>
          </button>

          {/* QUICK CHECK BUTTON */}
          <button
            id="quick-check-trigger"
            onClick={onQuickCheck}
            title={selectedDate ? `Verfügbarkeit für ${selectedDate} prüfen` : 'Verfügbarkeit prüfen'}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-blue-700/40 text-blue-400 hover:text-blue-300 transition-all group relative border border-blue-700/30 hover:border-blue-500/60"
          >
            <Search size={16} />
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 border border-gray-700 text-[10px] text-gray-300 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50 shadow-2xl">
              Verfügbarkeit prüfen
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          data-testid="prev-month-btn"
          onClick={onPrev}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-lg font-semibold text-white min-w-[160px] text-center capitalize">
          {label}
        </span>
        <button
          data-testid="next-month-btn"
          onClick={onNext}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
