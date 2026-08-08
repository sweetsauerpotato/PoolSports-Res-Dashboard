import { useMemo, useState, useRef, useEffect } from 'react'
import { useTableStore } from '../../store/tableStore'
import { TABLE_MAP } from '../../config/tables'
import { TYPE_BADGE_CLASSES, TYPE_COLORS } from '../../config/colors'
import { CsvManager } from '../csv/CsvManager'
import { cn } from '../../utils/cn'
import { ART_TO_TYPE } from '../../config/gameTypes'
import { ChevronDown } from 'lucide-react'

export interface TabelleansichtRow {
  id: string;
  startzeit: string;
  endzeit: string;
  kunde: string;
  art: string;
  personen: string | number;
  standort: string;
  status: string;
  tisch_ids: string;
  tischanzahl: string | number;
  bemerkung: string;
}

type SortKey = 'startzeit' | 'kunde' | 'personen' | 'art' | 'standort' | 'status' | 'tisch_ids' | 'tischanzahl' | 'bemerkung'

const STANDORT_OPTIONS = ['', 'EG', 'UG', 'Veranstaltungsraum']

const STATUS_LABELS: Record<string, string> = {
  'Unzugewiesen': 'bg-gray-600 text-gray-200',
  'Zugewiesen': 'bg-blue-700 text-blue-100',
  'Belegt': 'bg-orange-700 text-orange-100',
  'Abgeschlossen': 'bg-green-700 text-green-100',
}

function formatZeit(start: string, end: string) {
  const parseTime = (val: string) => {
    if (!val) return ''
    const m = val.match(/\d{2}:\d{2}/)
    return m ? m[0] : val.trim()
  }
  const s = parseTime(start)
  const e = parseTime(end)
  if (!s && !e) return '—'
  return `${s}${e ? `–${e}` : ' - Offen'}`
}

// ── Custom Select ─────────────────────────────────────────────────────────────
// Native <select> options cannot be styled cross-browser (Windows always renders
// the dropdown in OS-default white). This replaces all three filter dropdowns
// with a fully custom, dark-themed component.

interface SelectOption { value: string; label: string }

function CustomSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value) ?? options[0]
  const isFiltered = value !== ''

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs rounded-xl px-3 py-1.5 min-h-[34px] transition-all duration-150 whitespace-nowrap"
        style={{
          background: isFiltered ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.06)',
          border: isFiltered ? '1px solid rgba(59,130,246,0.45)' : '1px solid rgba(255,255,255,0.1)',
          color: isFiltered ? '#93c5fd' : '#cbd5e1',
        }}
      >
        {selected.label}
        <ChevronDown
          size={12}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 left-0 z-50 rounded-xl overflow-hidden min-w-full"
          style={{
            background: 'rgba(8,12,24,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs transition-colors duration-100"
              style={{
                background: opt.value === value ? 'rgba(59,130,246,0.22)' : 'transparent',
                color: opt.value === value ? '#93c5fd' : '#94a3b8',
                borderLeft: opt.value === value ? '2px solid rgba(59,130,246,0.7)' : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={e => {
                if (opt.value !== value) e.currentTarget.style.background = 'transparent'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Tabellenansicht() {
  const reservations = useTableStore((s) => s.state.reservations)
  const tableSessions = useTableStore((s) => s.state.table_sessions)

  const [sortKey, setSortKey] = useState<SortKey>('startzeit')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterArt, setFilterArt] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStandort, setFilterStandort] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const liveRows: TabelleansichtRow[] = useMemo(() => {
    return Object.values(reservations).map(r => {
      const ids = r.tisch_ids?.length ? r.tisch_ids : (r.tisch_id ? [r.tisch_id] : [])
      const isBelres = r.status === 'assigned' && ids.some(id => tableSessions[id]?.status === 'belegt')
      const isCompleted = r.status === 'seated' && ids.length > 0 && ids.every(id => tableSessions[id]?.reservationId !== r.id)

      let computedStatus = r.status;
      if (isCompleted) computedStatus = 'Abgeschlossen';
      else if (isBelres) computedStatus = 'Zugewiesen';
      else if (r.status === 'unassigned') computedStatus = 'Unzugewiesen';
      else if (r.status === 'assigned') computedStatus = 'Zugewiesen';
      else if (r.status === 'seated') computedStatus = 'Belegt';
      else if (r.status === 'no-show') computedStatus = 'No-Show';
      else if (r.status === 'partial') computedStatus = 'Teilweise';

      const tischLabels = ids.map((id: string) => TABLE_MAP[id]?.label ?? id).join(', ')

      return {
        id: r.id,
        startzeit: r.startzeit || '',
        endzeit: r.endzeit || '',
        kunde: r.kunde || '',
        art: r.art || '',
        personen: r.personen || '',
        standort: r.standort || (ids[0] ? TABLE_MAP[ids[0]]?.floor || '' : ''),
        status: computedStatus,
        tisch_ids: tischLabels,
        tischanzahl: r.tischanzahl || (ids.length > 0 ? ids.length : 1),
        bemerkung: r.bemerkung || ''
      }
    })
  }, [reservations, tableSessions])

  const rows = useMemo(() => {
    let list = [...liveRows]

    if (filterArt) list = list.filter((r) => r.art === filterArt)
    if (filterStatus) list = list.filter((r) => r.status === filterStatus)
    if (filterStandort) list = list.filter((r) =>
      r.standort === filterStandort ||
      (filterStandort === 'EG' && r.standort === '')
    )
    if (filterOpen) list = list.filter((r) => !r.endzeit)

    list.sort((a, b) => {
      if (sortKey === 'personen' || sortKey === 'tischanzahl') {
        const numA = parseInt(String(a[sortKey]) || '0')
        const numB = parseInt(String(b[sortKey]) || '0')
        return sortAsc ? numA - numB : numB - numA
      }
      const av = String(a[sortKey] ?? '')
      const bv = String(b[sortKey] ?? '')
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [liveRows, sortKey, sortAsc, filterArt, filterStatus, filterStandort, filterOpen])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const arts = [...new Set(liveRows.map((r) => r.art))].filter(Boolean).sort()
  const statuses = [...new Set(liveRows.map((r) => r.status))].filter(Boolean).sort()
  const activeFilters = filterArt || filterStatus || filterStandort || filterOpen

  const artOptions: SelectOption[] = [{ value: '', label: 'Alle Arten' }, ...arts.map(a => ({ value: a, label: a }))]
  const statusOptions: SelectOption[] = [{ value: '', label: 'Alle Status' }, ...statuses.map(s => ({ value: s, label: s }))]
  const standortOptions: SelectOption[] = STANDORT_OPTIONS.map(s => ({ value: s, label: s || 'Alle Standorte' }))

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* CSV section */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <CsvManager />
      </div>

      {/* Outer frosted glass card — contains filter bar + table */}
      <div
        className="flex-1 overflow-hidden flex flex-col mx-3 mb-3 mt-2 rounded-2xl min-h-0"
        style={{
          background: 'rgba(10,14,28,0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Filter bar */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 flex-wrap flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Filter</span>

          <CustomSelect value={filterArt} onChange={setFilterArt} options={artOptions} />
          <CustomSelect value={filterStatus} onChange={setFilterStatus} options={statusOptions} />
          <CustomSelect value={filterStandort} onChange={setFilterStandort} options={standortOptions} />

          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={filterOpen}
              onChange={(e) => setFilterOpen(e.target.checked)}
              className="rounded w-3.5 h-3.5 accent-blue-500"
            />
            Offene Spiele
          </label>

          {activeFilters && (
            <button
              onClick={() => { setFilterArt(''); setFilterStatus(''); setFilterStandort(''); setFilterOpen(false) }}
              className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors ml-1"
            >
              Zurücksetzen
            </button>
          )}

          <span
            className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {rows.length} Einträge
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead
              className="sticky top-0 text-gray-300 uppercase tracking-wider text-[10px] font-semibold"
              style={{
                background: 'rgba(8,12,24,0.92)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <tr>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white whitespace-nowrap transition-colors" onClick={() => toggleSort('startzeit')} style={{ width: '140px' }}>
                  ZEIT {sortKey === 'startzeit' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('kunde')} style={{ width: '180px' }}>
                  KUNDE {sortKey === 'kunde' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white text-center transition-colors" onClick={() => toggleSort('personen')} style={{ width: '80px' }}>
                  PERSONEN {sortKey === 'personen' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('art')} style={{ width: '100px' }}>
                  ART {sortKey === 'art' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('standort')} style={{ width: '100px' }}>
                  STANDORT {sortKey === 'standort' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('status')} style={{ width: '120px' }}>
                  STATUS {sortKey === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('tisch_ids')} style={{ width: '120px' }}>
                  TISCH {sortKey === 'tisch_ids' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white text-center transition-colors" onClick={() => toggleSort('tischanzahl')} style={{ width: '80px' }}>
                  TISCHANZAHL {sortKey === 'tischanzahl' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('bemerkung')}>
                  BEMERKUNG {sortKey === 'bemerkung' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const statusClasses = STATUS_LABELS[r.status] ?? 'bg-gray-700 text-gray-300'
                const valPersonen = parseInt(String(r.personen))
                const valTischAnzahl = parseInt(String(r.tischanzahl))
                const hasTisch = r.tisch_ids && r.tisch_ids.trim() !== ''
                const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'

                return (
                  <tr
                    key={r.id}
                    className="border-b transition-colors duration-150"
                    style={{ borderColor: 'rgba(255,255,255,0.04)', backgroundColor: rowBg }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = rowBg)}
                  >
                    <td className="px-3 py-3.5 text-gray-300 font-mono whitespace-nowrap">
                      {formatZeit(r.startzeit, r.endzeit)}
                    </td>
                    <td className="px-3 py-3.5 text-white font-bold truncate">
                      {r.kunde || '—'}
                    </td>
                    <td className="px-3 py-3.5 text-gray-300 text-center">
                      {valPersonen > 0 ? valPersonen : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      {r.art ? (
                        <span
                          className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap',
                            ART_TO_TYPE[r.art] ? TYPE_BADGE_CLASSES[ART_TO_TYPE[r.art]] : 'bg-gray-700 text-gray-300'
                          )}
                          style={ART_TO_TYPE[r.art] ? {
                            boxShadow: `inset 0 0 7px ${TYPE_COLORS[ART_TO_TYPE[r.art]]}30`
                          } : undefined}
                        >
                          {r.art}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3.5 text-gray-400">{r.standort || '—'}</td>
                    <td className="px-3 py-3.5">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', statusClasses)}>
                        {r.status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-gray-300">
                      {hasTisch ? r.tisch_ids : '—'}
                    </td>
                    <td className="px-3 py-3.5 text-gray-300 text-center">
                      {valTischAnzahl > 0 ? valTischAnzahl : '—'}
                    </td>
                    <td className="px-3 py-3.5 text-gray-500 truncate max-w-[130px]">
                      {r.bemerkung || '—'}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-16 text-sm"
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    Keine Reservierungen
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
