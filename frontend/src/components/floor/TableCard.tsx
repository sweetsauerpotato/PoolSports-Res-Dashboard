import { memo, useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { Droppable } from '@hello-pangea/dnd'
import { TableDefinition, TableStatus } from '../../types'
import { TYPE_BG_CLASSES, DEFEKT_CLASSES } from '../../config/colors'
import { useTableStore } from '../../store/tableStore'
import { useUiStore } from '../../store/uiStore'
import { elapsedMinutes } from '../../utils/time'
import { cn } from '../../utils/cn'

const ART_TO_TABLE_TYPE: Record<string, string> = {
  'Billard': 'Pool', 'Pool': 'Pool', 'Snooker': 'Snooker',
  'Darts': 'Dart', 'Dart': 'Dart', 'Tischtennis': 'TT', 'TT': 'TT',
  'Kicker': 'Kicker', 'Gastro': 'Gastro',
}

interface Props { table: TableDefinition }

function toMin(t: string) { const [h, m] = t.split(':').map(Number); return (h ?? 0) * 60 + (m ?? 0) }
function overlaps(sA: string, eA: string, sB: string, eB: string) {
  return toMin(sA) < toMin(eB) && toMin(sB) < toMin(eA)
}

export const TableCard = memo(function TableCard({ table }: Props) {
  const session = useTableStore((s) => s.state.table_sessions[table.id])
  const isDefekt = useTableStore((s) => s.state.tables_defekt.includes(table.id))
  const reservations = useTableStore((s) => s.state.reservations)
  const linkingMode = useTableStore((s) => s.linkingMode)
  const completeLinking = useTableStore((s) => s.completeLinking)
  const setSelected = useUiStore((s) => s.setSelectedTableId)
  const filterType = useUiStore((s) => s.filterType)
  const filterStatus = useUiStore((s) => s.filterStatus)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick(t => t + 1), 30_000); return () => clearInterval(id) }, [])

  // Assigned reservations (upcoming, not yet seated)
  const assigned = Object.values(reservations)
    .filter(r => {
      const ids = r.tisch_ids?.length ? r.tisch_ids : (r.tisch_id ? [r.tisch_id] : [])
      return ids.includes(table.id) && r.status === 'assigned'
    })
    .sort((a, b) => a.startzeit.localeCompare(b.startzeit))
  const nextRes = assigned[0] ?? null

  // ── Effective table status ──────────────────────────────────────────
  type Ext = TableStatus | 'belres' | 'ghost'
  const isGhost = session?.isGhost === true
  
  const status: Ext = isDefekt
    ? TableStatus.Defekt
    // BelRes ONLY when it's a pure walk-in (no reservationId) AND has upcoming reservations
    : session?.status === TableStatus.Belegt && !session.reservationId && assigned.length > 0 ? 'belres'
      : isGhost ? 'ghost'
      : session?.status === TableStatus.Belegt ? TableStatus.Belegt
        : assigned.length > 0 ? TableStatus.Reserviert
          : TableStatus.Frei

  // Elapsed timer
  const elapsed = (status === TableStatus.Belegt || status === 'belres') && session?.occupiedSince
    ? elapsedMinutes(session.occupiedSince) : null

  // All historical reservations (seated + no-show still linked by tisch_ids)
  const allOnTable = Object.values(reservations).filter(r => {
    const ids = r.tisch_ids?.length ? r.tisch_ids : (r.tisch_id ? [r.tisch_id] : [])
    return ids.includes(table.id)
  })
  const totalCount = assigned.length + allOnTable.filter(r => r.status === 'seated').length

  // Conflict check
  const w = assigned.filter(r => r.endzeit)
  let hasConflict = false
  for (let i = 0; i < w.length && !hasConflict; i++)
    for (let j = i + 1; j < w.length && !hasConflict; j++)
      if (overlaps(w[i]!.startzeit, w[i]!.endzeit!, w[j]!.startzeit, w[j]!.endzeit!)) hasConflict = true
  // ── Linking mode logic ─────────────────────────────────────────────
  // A table is a valid link target if: linking mode is active, this table
  // is Frei, and it matches the required art for the booking
  const isLinkingActive = linkingMode !== null
  const alreadyPlaced = linkingMode?.placedTableIds.includes(table.id) ?? false
  const requiredTableType = linkingMode ? ART_TO_TABLE_TYPE[linkingMode.art] : null
  const isValidLinkTarget = isLinkingActive
    && !isDefekt
    && !alreadyPlaced
    && requiredTableType === table.type.toString()

  const isDimmed =
    (filterType && table.type !== filterType) ||
    (filterStatus && !(
      status === filterStatus ||
      (filterStatus === TableStatus.Belegt && status === 'belres') ||
      (filterStatus === TableStatus.Reserviert && status === 'ghost')
    ))

  // Styles
  const bg = isDefekt ? DEFEKT_CLASSES : TYPE_BG_CLASSES[table.type]
  const textMain = 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'

  const ring = hasConflict
    ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-gray-900'
    : isValidLinkTarget
      ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-gray-900 animate-pulse'
      : alreadyPlaced
        ? 'ring-2 ring-green-600 ring-offset-1 ring-offset-gray-900'
        : status === 'ghost'
          ? 'ring-[3px] ring-amber-500 ring-offset-1 ring-offset-gray-900'
          : status === 'belres'
            ? 'ring-[3px] ring-blue-600 ring-offset-1 ring-offset-gray-900'
            : status === TableStatus.Belegt
              ? 'ring-[3px] ring-red-500 ring-offset-1 ring-offset-gray-900'
              : ''

  const style: React.CSSProperties = {
    gridRow: table.rowSpan ? `${table.gridRow} / span ${table.rowSpan}` : table.gridRow,
    gridColumn: table.colSpan ? `${table.gridCol} / span ${table.colSpan}` : table.gridCol,
  }

  // ── What to show in the CENTER ─────────────────────────────────────
  // BelRes → next reservation name + time (walk-in is obvious from status)
  // Belegt → seated guest name (from session or seated reservation)
  // Reserviert/Ghost → next reservation name + time
  const seatedRes = session?.reservationId ? reservations[session.reservationId] : null
  const centerName = (() => {
    if (status === 'belres') return nextRes?.kunde ?? null
    if (status === TableStatus.Belegt) return seatedRes?.kunde ?? session?.guest ?? null
    if (status === TableStatus.Reserviert || status === 'ghost') return nextRes?.kunde ?? seatedRes?.kunde ?? null
    return null
  })()
  // Unified time display: "HH:MM-HH:MM" or "HH:MM" — same format for all statuses
  const centerTimeDisplay = (() => {
    const res = status === TableStatus.Belegt ? seatedRes : (nextRes ?? seatedRes)
    if (!res) return null
    const start = res.startzeit?.match(/\d{2}:\d{2}/)?.[0] ?? null
    const end   = res.endzeit?.match(/\d{2}:\d{2}/)?.[0]   ?? null
    if (!start) return null
    return end ? `${start}-${end}` : start
  })()

  const isMultiTable = seatedRes ? (seatedRes.tischanzahl ?? 1) > 1 : (nextRes ? (nextRes.tischanzahl ?? 1) > 1 : false);
  const multiTableCount = seatedRes ? (seatedRes.tischanzahl ?? 1) : (nextRes ? (nextRes.tischanzahl ?? 1) : 1);

  const statusLabel = (() => {
    if (status === TableStatus.Defekt) return { t: 'DEFEKT', cls: 'bg-gray-700/80 text-white px-1 rounded-sm' }
    if (status === TableStatus.Frei) return null
    if (status === 'belres') return { t: 'BELRES', cls: 'bg-blue-800 text-blue-100 px-1 rounded-sm font-extrabold shadow-sm' }
    if (status === 'ghost') return { t: 'WARTET', cls: 'bg-amber-500 text-amber-950 px-1 rounded-sm font-extrabold shadow-sm' }
    if (status === TableStatus.Belegt) return { t: 'BELEGT', cls: 'bg-red-600 text-white px-1 rounded-sm shadow-sm' }
    if (status === TableStatus.Reserviert) return { t: 'RES', cls: 'bg-yellow-500 text-white px-1 rounded-sm shadow-sm' }
    return null
  })()

  return (
    <Droppable droppableId={`table-${table.id}`}>
      {(provided, snapshot) => (
        <button
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={style}
          onClick={() => {
            if (isValidLinkTarget) {
              completeLinking(table.id)
            } else if (!isLinkingActive) {
              setSelected(table.id)
            }
            // If linking is active but this is not a valid target: do nothing (prevents accidentally opening modal)
          }}
          className={cn(
            'relative flex flex-col justify-between rounded-xl cursor-pointer select-none transition-all duration-200 overflow-hidden',
            'w-full h-full p-1 shrink-0 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-white/20',
            bg, ring,
            snapshot.isDraggingOver && 'brightness-125',
            isDimmed && 'opacity-20 pointer-events-none',
          )}
        >
          {/* ── TOP ROW: table name left, count badge right ── */}
          <div className="flex items-start justify-between w-full gap-0.5">
            <span className={cn('text-[11px] font-bold leading-tight truncate', textMain,
              status === TableStatus.Defekt && 'line-through opacity-50')}>
              {table.label}
            </span>
            {(assigned.length > 1 || totalCount > 1) && (
              <span className={cn(
                'text-[9px] font-bold rounded px-0.5 shrink-0 leading-tight',
                status === 'belres' ? 'bg-blue-900/60 text-blue-300'
                  : status === TableStatus.Belegt ? 'bg-red-900/40 text-red-300'
                    : 'bg-black/30 text-white',
              )}>
                ×{status === 'belres' ? totalCount : assigned.length}
              </span>
            )}
          </div>

          {/* ── MIDDLE: name + time on one line, uniform for all statuses ── */}
          {centerName && (
            <div className="flex items-center justify-center flex-1 py-0 w-full overflow-hidden px-0.5">
              <span className={cn(
                'text-[10px] font-semibold leading-tight px-1 rounded-sm truncate max-w-full text-center shadow-sm',
                status === TableStatus.Reserviert ? 'bg-yellow-500 text-white' :
                status === 'ghost'               ? 'bg-amber-500 text-amber-950' :
                status === TableStatus.Belegt    ? 'bg-red-600 text-white' :
                status === 'belres'              ? 'bg-blue-800 text-blue-100' :
                                                  'bg-black/30 text-white'
              )}>
                {centerName.split(' ')[0]}
                {centerTimeDisplay && (
                  <span className="font-mono text-[9px] opacity-90"> {centerTimeDisplay}</span>
                )}
              </span>
            </div>
          )}

          {/* ── BOTTOM ROW: status left, timer right ── */}
          <div className="flex items-end justify-between w-full">
            <div className="flex items-center gap-1">
              {statusLabel ? (
                <span className={cn('text-[9px] font-bold leading-tight', statusLabel.cls)}>
                  {statusLabel.t}
                </span>
              ) : <span />}
              {isMultiTable && (
                <span className="flex items-center gap-0.5 text-amber-400 text-[9px] font-semibold bg-gray-900/80 px-1 rounded-sm shadow-sm" title={`${multiTableCount} Tische`}>
                  <Link2 size={9} />{multiTableCount}
                </span>
              )}
            </div>

            {elapsed !== null && (
              <span className={cn('text-[9px] font-mono font-bold leading-tight px-1 rounded-sm shadow-sm',
                status === 'belres' ? 'bg-blue-800 text-blue-100' : 'bg-red-600 text-white')}>
                {elapsed}m
              </span>
            )}
            {hasConflict && elapsed === null && (
              <span className="text-[9px] text-orange-400 font-bold">!</span>
            )}
          </div>

          <span className="hidden">{provided.placeholder}</span>
        </button>
      )}
    </Droppable>
  )
})
