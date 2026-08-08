import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Reservation } from '../../services/reservationApi'
import { ReservationList } from './ReservationList'
import { TYPE_COLORS } from '../../config/colors'
import { TableType } from '../../types'

interface Props {
  date: string            // YYYY-MM-DD
  reservations: Reservation[]
  onRefresh: () => void
}

const SUMMARY_CONFIG = [
  { id: 'pool', label: 'Pool', match: ['Pool', 'Billard'], type: TableType.Pool },
  { id: 'snooker', label: 'Snooker', match: ['Snooker'], type: TableType.Snooker },
  { id: 'tt', label: 'TT', match: ['Tischtennis', 'TT'], type: TableType.TT },
  { id: 'darts', label: 'Darts', match: ['Darts', 'Dart'], type: TableType.Dart },
  { id: 'kicker', label: 'Kicker', match: ['Kicker'], type: TableType.Kicker },
  { id: 'gastro', label: 'Gastro', match: ['Gastro'], type: TableType.Gastro },
]

export function DayDetailPanel({ date, reservations, onRefresh }: Props) {
  const displayDate = format(parseISO(date), 'd. MMMM yyyy', { locale: de })

  const summary = useMemo(() => {
    return SUMMARY_CONFIG.map(cfg => ({
      ...cfg,
      count: reservations.filter(r => cfg.match.includes(r.art)).length,
      color: TYPE_COLORS[cfg.type]
    }))
  }, [reservations])

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(10,14,28,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 48px rgba(0,0,0,0.45)',
      }}
    >
      <div className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-semibold text-white">
          Reservierungen für {displayDate}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {summary.map(item => (
            <div
              key={item.id}
              className={`
                px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all
                ${item.count > 0 ? 'opacity-100' : 'opacity-30 grayscale-[30%]'}
              `}
              style={{
                backgroundColor: `${item.color}15`, // ~10% opacity tint
                borderColor: `${item.color}33`,      // ~20% opacity blended stroke
                color: item.count > 0 ? item.color : '#94a3b8' // Gray-400 if empty
              }}
            >
              <span className="mr-1.5">{item.label}</span>
              <span className="tabular-nums font-bold">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ReservationList
        datum={date}
        reservations={reservations}
        onRefresh={onRefresh}
      />
      </div>
    </div>
  )
}

