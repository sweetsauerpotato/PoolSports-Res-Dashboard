import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { reservationApi, MonthResponse, Reservation, ApiError } from '../../services/reservationApi'
import { CalendarHeader } from './CalendarHeader'
import { CalendarGrid } from './CalendarGrid'
import { DayDetailPanel } from './DayDetailPanel'
import { QuickCheckModal } from './QuickCheckModal'
import { useUiStore } from '../../store/uiStore'

export function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [data, setData] = useState<MonthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickCheckOpen, setQuickCheckOpen] = useState(false)
  
  const wsStatus = useUiStore(s => s.wsStatus)
  const currentMonth = format(currentDate, 'yyyy-MM')

  // S4.3: In-memory cache for month data — avoids re-fetching on month navigation
  const monthCache = useRef<Map<string, MonthResponse>>(new Map())

  const fetchMonth = useCallback(async (silent = false) => {
    // Use cache on normal navigation; bypass on forced refresh (silent=false means first load)
    if (!silent) {
      const cached = monthCache.current.get(currentMonth)
      if (cached) {
        setData(cached)
        setError(null)
        return
      }
      setLoading(true)
    }
    setError(null)
    try {
      const result = await reservationApi.getMonth(currentMonth)
      setData(result)
      monthCache.current.set(currentMonth, result)
    } catch (e) {
      // Error contract §8: no field to highlight on a GET — always global error banner
      const err = e as ApiError
      setError(err?.detail ?? 'Verbindungsfehler — bitte Backend prüfen')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchMonth()
  }, [fetchMonth])

  // TASK-7.2: Auto-refresh when WebSocket reconnects to clear stale error states
  useEffect(() => {
    if (wsStatus === 'connected' && error) {
      fetchMonth(true)
    }
  }, [wsStatus, error, fetchMonth])

  // Called by QuickCheckModal on successful booking — bust cache then re-fetch silently
  const handleQuickCheckSuccess = useCallback(() => {
    monthCache.current.delete(currentMonth)
    fetchMonth(true)
  }, [currentMonth, fetchMonth])

  const reservationsForDay = (date: string): Reservation[] =>
    data?.reservations.filter((r) => r.datum === date) ?? []



  // Pre-fill modal with selected date if available, else today
  const modalDate = selectedDate ?? format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="max-w-4xl mx-auto">
      <CalendarHeader
        currentDate={currentDate}
        selectedDate={selectedDate}
        onPrev={() => { setCurrentDate(d => subMonths(d, 1)); setSelectedDate(null) }}
        onNext={() => { setCurrentDate(d => addMonths(d, 1)); setSelectedDate(null) }}
        onRefresh={fetchMonth}
        onQuickCheck={() => setQuickCheckOpen(true)}
      />

      {loading && (
        <div className="flex justify-center items-center py-16" data-testid="loading-spinner">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="text-red-400 text-center py-8 bg-red-900/20 rounded-lg flex flex-col gap-2 animate-in fade-in duration-500">
          <p className="font-bold text-lg">
            {wsStatus !== 'connected' ? 'Keine Server-Verbindung' : 'Datenladefehler'}
          </p>
          <p className="text-sm opacity-80">
            {wsStatus !== 'connected' ? 'Das System ist offline. Der Kalender wird automatisch aktualisiert, sobald die Verbindung steht.' : error}
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          <CalendarGrid
            currentDate={currentDate}
            countPerDay={data?.count_per_day ?? {}}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
          />

          {selectedDate && (
            <DayDetailPanel
              date={selectedDate}
              reservations={reservationsForDay(selectedDate)}
              onRefresh={() => fetchMonth(true)}
            />
          )}
        </>
      )}

      {quickCheckOpen && (
        <QuickCheckModal
          initialDate={modalDate}
          onClose={() => setQuickCheckOpen(false)}
          onSuccess={handleQuickCheckSuccess}
        />
      )}
    </div>
  )
}
