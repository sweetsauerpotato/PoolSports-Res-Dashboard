import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, isToday } from 'date-fns'
import { cn } from '../../utils/cn'

interface Props {
  currentDate: Date
  countPerDay: Record<string, number>
  selectedDate: string | null
  onDateClick: (date: string) => void
}

const DAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function CalendarGrid({ currentDate, countPerDay, selectedDate, onDateClick }: Props) {
  // Generate a full calendar grid: Mon-aligned, includes prev/next month padding
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div data-testid="calendar-grid">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-xs font-semibold text-gray-500 py-2">
            {h}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const count = countPerDay[dateStr] ?? 0
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)
          const selected = selectedDate === dateStr

          return (
            <button
              key={dateStr}
              data-testid={today ? 'date-cell-today' : `date-cell-${dateStr}`}
              onClick={() => onDateClick(dateStr)}
              className={cn(
                'relative flex flex-col items-center justify-start pt-2 pb-1 rounded-lg min-h-[56px] transition-colors text-sm font-medium border',
                inMonth ? 'text-white' : 'text-gray-600',
                today ? 'border-blue-500 bg-blue-950/40' : 'border-transparent',
                selected ? 'bg-blue-600 border-blue-500' : 'hover:bg-gray-800',
              )}
            >
              <span>{format(day, 'd')}</span>
              {count > 0 && (
                <span
                  data-testid="count-badge"
                  className={cn(
                    'mt-1 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
                    selected ? 'bg-white text-blue-700' : 'bg-blue-600/80 text-white',
                  )}
                  style={!selected ? { boxShadow: '0 0 8px rgba(37,99,235,0.45)' } : undefined}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
