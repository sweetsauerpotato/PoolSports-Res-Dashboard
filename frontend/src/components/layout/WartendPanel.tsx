import { useMemo, useState, useRef, useEffect } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { useTableStore } from '../../store/tableStore'
import { useUiStore } from '../../store/uiStore'
import { TableType } from '../../types'
import { TYPE_BADGE_CLASSES } from '../../config/colors'
import { Clock, Users, ArrowUp, ArrowDown, Link2, CalendarClock, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

const ART_TO_TYPE: Record<string, TableType> = {
  'Billard': TableType.Pool,
  'Pool': TableType.Pool,
  'Snooker': TableType.Snooker,
  'Darts': TableType.Dart,
  'Dart': TableType.Dart,
  'Tischtennis': TableType.TT,
  'TT': TableType.TT,
  'Kicker': TableType.Kicker,
  'Gastro': TableType.Gastro,
}

const ART_OPTIONS = ['Alle', 'Pool', 'Snooker', 'Darts', 'Tischtennis', 'Kicker', 'Gastro']

/** Floor pills — 'Alle' resets to '' (show all), others match r.standort exactly.
 *  Reservations with empty/null standort are treated as EG (same convention used
 *  across Tabellenansicht and AppShell). */
const FLOOR_OPTIONS = ['Alle', 'EG', 'UG', 'VRA'] as const
type FloorOption = (typeof FLOOR_OPTIONS)[number]

/** Returns the effective floor of a reservation: empty/null standort → 'EG'. */
function effectiveFloor(standort?: string): string {
  return standort?.trim() || 'EG'
}

function formatTime(val?: string) {
  if (!val) return ''
  const m = val.match(/\d{2}:\d{2}/)
  return m ? m[0] : val.trim()
}

export function WartendPanel() {
  const reservations = useTableStore((s) => s.state.reservations)
  const { sortKey, sortAsc, setSort } = useUiStore()
  const [filterArt, setFilterArt] = useState('')
  const [filterFloor, setFilterFloor] = useState<FloorOption>('Alle')
  const [openDropdown, setOpenDropdown] = useState<'art' | 'floor' | null>(null)
  const filterBarRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside the filter bar
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const unassigned = useMemo(() => {
    let list = Object.values(reservations).filter((r) => r.status === 'unassigned')
    if (filterArt && filterArt !== 'Alle') list = list.filter((r) => r.art === filterArt)
    if (filterFloor && filterFloor !== 'Alle') {
      list = list.filter((r) => effectiveFloor(r.standort) === filterFloor)
    }
    list.sort((a, b) => {
      if (sortKey === 'personen') {
        const pA = parseInt(String(a.personen || '0'))
        const pB = parseInt(String(b.personen || '0'))
        return sortAsc ? pA - pB : pB - pA
      } else {
        return sortAsc
          ? a.startzeit.localeCompare(b.startzeit)
          : b.startzeit.localeCompare(a.startzeit)
      }
    })
    return list
  }, [reservations, sortKey, sortAsc, filterArt, filterFloor])

  return (
    <aside className="w-64 border-l border-gray-700 flex flex-col shrink-0 bg-gray-900 border-t-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
          <CalendarClock size={16} className="text-amber-400" />
          Wartend ({unassigned.length})
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setSort('time')}
            title="Nach Zeit sortieren"
            className={cn('p-1.5 flex items-center gap-1 rounded-md transition-colors min-h-[32px]',
              sortKey === 'time' ? 'bg-blue-900/40 text-blue-300' : 'text-gray-400 hover:text-white hover:bg-gray-800')}
          >
            <Clock size={14} />
            {sortKey === 'time' && (sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
          </button>
          <button
            onClick={() => setSort('personen')}
            title="Nach Personen sortieren"
            className={cn('p-1.5 flex items-center gap-1 rounded-md transition-colors min-h-[32px]',
              sortKey === 'personen' ? 'bg-blue-900/40 text-blue-300' : 'text-gray-400 hover:text-white hover:bg-gray-800')}
          >
            <Users size={14} />
            {sortKey === 'personen' && (sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
          </button>
        </div>
      </div>

      {/* Filter bar — two compact dropdowns side by side */}
      <div ref={filterBarRef} className="relative px-2 py-1.5 border-b border-gray-700 flex gap-1.5">

        {/* ── Sport dropdown ── */}
        <div className="relative flex-1">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'art' ? null : 'art')}
            className={cn(
              'w-full flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border',
              filterArt
                ? 'bg-blue-900/40 text-blue-300 border-blue-700/60'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700',
            )}
          >
            <span className="truncate">{filterArt || 'Alle Arten'}</span>
            <ChevronDown size={11} className={cn('shrink-0 transition-transform', openDropdown === 'art' && 'rotate-180')} />
          </button>

          {openDropdown === 'art' && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl shadow-black/40 p-1.5 flex flex-wrap gap-1">
              {ART_OPTIONS.map((art) => (
                <button
                  key={art}
                  onClick={() => { setFilterArt(art === 'Alle' ? '' : art); setOpenDropdown(null) }}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                    (filterArt === art || (art === 'Alle' && !filterArt))
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600',
                  )}
                >
                  {art}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Etage dropdown ── */}
        <div className="relative flex-1">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'floor' ? null : 'floor')}
            className={cn(
              'w-full flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border',
              filterFloor !== 'Alle'
                ? 'bg-blue-900/40 text-blue-300 border-blue-700/60'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700',
            )}
          >
            <span className="truncate">{filterFloor !== 'Alle' ? filterFloor : 'Alle Standorte'}</span>
            <ChevronDown size={11} className={cn('shrink-0 transition-transform', openDropdown === 'floor' && 'rotate-180')} />
          </button>

          {openDropdown === 'floor' && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl shadow-black/40 p-1.5 flex gap-1">
              {FLOOR_OPTIONS.map((floor) => (
                <button
                  key={floor}
                  onClick={() => { setFilterFloor(floor); setOpenDropdown(null) }}
                  className={cn(
                    'flex-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium transition-colors text-center',
                    filterFloor === floor
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600',
                  )}
                >
                  {floor}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Reservation list */}
      <Droppable droppableId="sidebar-reservations">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-2 space-y-1.5"
          >
            {unassigned.length === 0 && (
              <p className="text-gray-500 text-xs text-center py-6">
                Keine offenen Reservierungen
              </p>
            )}
            {unassigned.map((r, index) => {
              const isMultiTable = (r.tischanzahl ?? 1) > 1
              const isPartial = r.status === 'partial'
              const typeKey = ART_TO_TYPE[r.art]
              const badgeClass = typeKey ? TYPE_BADGE_CLASSES[typeKey] : 'bg-gray-700 text-gray-300'
              return (
                <Draggable key={r.id} draggableId={r.id} index={index} isDragDisabled={isPartial}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={cn(
                        'bg-gray-800 rounded-xl p-2.5 text-sm border transition-all',
                        snapshot.isDragging
                          ? 'border-blue-500 shadow-lg shadow-blue-900/40 scale-[1.02]'
                          : isPartial
                            ? 'border-amber-500/70 border-dashed'
                            : isMultiTable
                              ? 'border-amber-500/50 border-dashed'
                              : 'border-gray-700',
                        isPartial && 'opacity-90',
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-white text-xs truncate leading-tight flex-1">{r.kunde || 'Unbekannt'}</span>
                        <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1.5 ml-2">
                          {formatTime(r.startzeit)}{formatTime(r.endzeit) ? `–${formatTime(r.endzeit)}` : ' - Offen'}
                          {r.personen && String(r.personen).trim() !== '' && (
                            <span className="flex items-center gap-0.5 text-blue-300 bg-blue-900/40 px-1.5 py-0.5 rounded-md ml-0.5">
                              <Users size={10} /> {String(r.personen).trim()}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', badgeClass)}>
                          {r.art}
                        </span>
                        {isMultiTable && (
                          <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-semibold bg-amber-900/30 px-1.5 py-0.5 rounded-md">
                            <Link2 size={9} /> {r.tischanzahl} Tische
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">{r.standort}</span>
                      </div>
                      {/* Partial state: first table placed, waiting for second */}
                      {isPartial && (
                        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-amber-500/30">
                          <span className="text-[10px] text-green-400 font-medium">✓ {r.tisch_id}</span>
                          <span className="flex items-center gap-1 text-[10px] text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                            Tisch {(r.tisch_ids?.length ?? 1) + 1} ausständig…
                          </span>
                        </div>
                      )}
                      {r.bemerkung && !isPartial && (
                        <p className="text-[10px] text-gray-500 mt-1 truncate">{r.bemerkung}</p>
                      )}
                    </div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </aside>
  )
}
