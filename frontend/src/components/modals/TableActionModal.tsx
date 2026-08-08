import { useUiStore } from '../../store/uiStore'
import { useTableStore } from '../../store/tableStore'
import { useAuthStore } from '../../store/authStore'
import { TABLE_MAP } from '../../config/tables'
import { TableStatus, Role, Reservation } from '../../types'
import { X, AlertTriangle, RotateCcw, Users, ArrowRight, XCircle, Undo2 } from 'lucide-react'
import { cn } from '../../utils/cn'

function doOverlap(a: { start: string; end: string }, b: { start: string; end: string }) {
  const m = (t: string) => { const [h, v] = t.split(':').map(Number); return (h ?? 0) * 60 + (v ?? 0) }
  return m(a.start) < m(b.end) && m(b.start) < m(a.end)
}
function elapsedMin(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

export function TableActionModal() {
  const selectedTableId = useUiStore((s) => s.selectedTableId)
  const setSelectedTableId = useUiStore((s) => s.setSelectedTableId)
  const wsStatus = useUiStore((s) => s.wsStatus)
  const session = useTableStore((s) => selectedTableId ? s.state.table_sessions[selectedTableId] : undefined)
  const isDefekt = useTableStore((s) => selectedTableId ? s.state.tables_defekt.includes(selectedTableId) : false)
  const reservations = useTableStore((s) => s.state.reservations)
  const { setTableBelegt, setTableFrei, walkIn, markNoShow, toggleDefekt, unassignTable, undoStatus } = useTableStore()
  const role = useAuthStore((s) => s.role)

  if (!selectedTableId) return null
  const tableDef = TABLE_MAP[selectedTableId]
  if (!tableDef) return null
  // Lock out mutations for BOTH 'disconnected' and 'reconnecting' states.
  // 'reconnecting' means the TCP handshake completed but the first state_update
  // has not arrived yet — the backend is not confirmed live. Only 'connected'
  // (set on first state_update received) permits write actions.
  const isReadOnly = wsStatus !== 'connected'

  // All reservations on this table, sorted by start time
  const allRes: Reservation[] = Object.values(reservations)
    .filter(r => {
      const ids = r.tisch_ids?.length ? r.tisch_ids : (r.tisch_id ? [r.tisch_id] : [])
      return ids.includes(selectedTableId)
    })
    .sort((a, b) => a.startzeit.localeCompare(b.startzeit))

  const assigned = allRes.filter(r => r.status === 'assigned')
  const nextRes = assigned[0] ?? null
  const activeId = session?.reservationId  // the ONE currently active reservation
  const hasActiveSomewhere = !!activeId

  // Status — mirrors TableCard exactly
  type Ext = TableStatus | 'belres'
  const status: Ext = isDefekt ? TableStatus.Defekt
    : session?.status === TableStatus.Belegt && !session.reservationId && assigned.length > 0 ? 'belres'
      : session?.status === TableStatus.Belegt ? TableStatus.Belegt
        : assigned.length > 0 ? TableStatus.Reserviert
          : TableStatus.Frei

  const isBelRes = status === 'belres'
  const isBelegt = status === TableStatus.Belegt || isBelRes

  // Overlap detection
  const withEnd = assigned.filter(r => r.endzeit).map(r => ({ id: r.id, start: r.startzeit, end: r.endzeit! }))
  const conflictIds = new Set<string>()
  for (let i = 0; i < withEnd.length; i++)
    for (let j = i + 1; j < withEnd.length; j++)
      if (doOverlap(withEnd[i]!, withEnd[j]!)) {
        conflictIds.add(withEnd[i]!.id)
        conflictIds.add(withEnd[j]!.id)
      }

  const close = () => setSelectedTableId(null)

  const chipMap: Record<Ext, { label: string; cls: string }> = {
    [TableStatus.Frei]: { label: 'Frei', cls: 'bg-emerald-900/50 text-emerald-300' },
    [TableStatus.Reserviert]: { label: 'Reserviert', cls: 'bg-yellow-900/50 text-yellow-300' },
    [TableStatus.Belegt]: { label: 'Belegt', cls: 'bg-red-900/50 text-red-300' },
    [TableStatus.Defekt]: { label: 'Defekt', cls: 'bg-gray-700 text-gray-400' },
    belres: { label: 'Belegt + Res.', cls: 'bg-blue-900/80 text-blue-200' },
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={close}>
      <div
        className={cn(
          'bg-gray-900/85 backdrop-blur-xl rounded-2xl w-full max-w-md border-2 shadow-2xl animate-fade-in',
          isBelRes ? 'border-blue-500'
            : isBelegt ? 'border-red-500'
              : 'border-gray-700',
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isBelRes ? 'border-blue-800/30' : isBelegt ? 'border-red-800/30' : 'border-gray-700',
        )}>
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-base font-bold text-white">{tableDef.label}</h2>
              <p className="text-xs text-gray-500">{tableDef.type}</p>
            </div>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', chipMap[status].cls)}>
              {chipMap[status].label}
            </span>
          </div>
          <button onClick={close} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors w-8 h-8 flex items-center justify-center">
            <X size={17} />
          </button>
        </div>

        {/* ── BelRes: next reservation banner ────────────────────────── */}
        {isBelRes && nextRes && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-blue-900/30 border border-blue-600/50 rounded-xl text-xs text-blue-200">
            <ArrowRight size={12} className="text-blue-400 shrink-0" />
            <span>Nächste Reservierung: <strong>{nextRes.kunde}</strong></span>
            <span className="ml-auto font-mono font-bold text-blue-300">{nextRes.startzeit}</span>
          </div>
        )}

        {/* ── Walk-in session row (when no reservation is active) ─────── */}
        {isBelegt && session && !activeId && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-700/30 rounded-xl text-sm">
            <Users size={14} className="text-red-400 shrink-0" />
            <span className="text-white font-medium">{session.guest ?? 'Walk-in'}</span>
            {session.occupiedSince && (
              <span className="ml-auto text-xs text-red-300 font-mono">{elapsedMin(session.occupiedSince)}m</span>
            )}
          </div>
        )}

        {/* ── ALL RESERVATION ROWS ───────────────────────────────────── */}
        {allRes.length > 0 && (
          <div className="p-4 border-b border-gray-700/50">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Reservierungen ({allRes.length})
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {allRes.map((r) => {
                const isActive = r.status === 'seated' && r.id === activeId  // ONLY after Belegt clicked
                const isSeated = r.status === 'seated'
                const isAssigned = r.status === 'assigned'
                const isNoShow = r.status === 'no-show'
                const isCompleted = isSeated && !isActive  // seated but NOT the current active one
                const isNextUp = isAssigned && r.id === nextRes?.id
                const hasConflict = conflictIds.has(r.id)

                const rowCls = isActive
                  ? 'border-emerald-500 bg-emerald-900/40 ring-1 ring-emerald-500/30'
                  : isCompleted
                    ? 'border-gray-700 bg-gray-900/40 opacity-50'
                    : isNoShow
                      ? 'border-gray-700 bg-gray-900/30 opacity-40'
                      : hasActiveSomewhere
                        ? 'border-gray-700 bg-gray-900/60 opacity-60'
                        : 'border-gray-700 bg-gray-900/60'

                // "Belegt" button style varies by row state
                const belegtBtnCls = isActive
                  ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-200'
                  : isNextUp && hasActiveSomewhere
                    ? 'bg-blue-700 hover:bg-blue-600 text-white'
                    : isCompleted || isNoShow
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-emerald-700 hover:bg-emerald-600 text-white'

                const belegtLabel = isNextUp && hasActiveSomewhere
                  ? <><ArrowRight size={10} /> Nächste</>
                  : 'Belegt'

                return (
                  <div key={r.id} className={cn('rounded-xl border px-3 py-2 flex items-center gap-2 transition-all', rowCls, hasConflict && 'border-orange-500')}>
                    {/* Status dot */}
                    <div className="shrink-0 w-3.5">
                      {isActive && <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />}
                      {isCompleted && <span className="inline-block w-2 h-2 rounded-full bg-gray-500" />}
                      {isNoShow && <XCircle size={13} className="text-red-500" />}
                      {isAssigned && hasConflict && <AlertTriangle size={13} className="text-orange-400" />}
                      {isAssigned && !hasConflict && <span className="inline-block w-2 h-2 rounded-full bg-gray-600" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn('text-sm font-semibold truncate',
                          isActive ? 'text-white' : isCompleted || isNoShow ? 'text-gray-500' : 'text-gray-200')}>
                          {r.kunde}
                        </span>
                        {isActive && <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">AKTIV</span>}
                        {isCompleted && <span className="text-[9px] bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-full font-bold shrink-0">FERTIG</span>}
                        {isNoShow && <span className="text-[9px] bg-red-900 text-red-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">NO-SHOW</span>}
                        {isNextUp && !isActive && <span className="text-[9px] bg-blue-800 text-blue-200 px-1.5 py-0.5 rounded-full font-bold shrink-0">NÄCHSTE</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className={cn('text-xs', isActive ? 'text-emerald-300/80' : 'text-gray-500')}>
                          {r.startzeit}{r.endzeit ? `–${r.endzeit}` : ''} · {r.art}
                        </p>
                        {r.personen && (
                          <span className={cn('flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md',
                            isActive ? 'bg-emerald-900/40 text-emerald-200' : 'bg-gray-800 text-gray-400'
                          )}>
                            <Users size={10} /> {r.personen}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── BUTTONS on EVERY row ── */}
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* 1. ↩ return to Wartend (unassign) */}
                        {role === Role.Admin && (
                          <button onClick={() => unassignTable(r.id)} title="Zurück zu Wartend"
                            className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-amber-900/20 rounded-lg transition-colors w-7 h-7 flex items-center justify-center">
                            <RotateCcw size={13} />
                          </button>
                        )}

                        {/* 2. Undo/Revert (restart from this reservation) */}
                        <button onClick={() => { undoStatus(r.id); close() }} title="Aus Versehen angeklickt? (Undo)"
                          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors w-7 h-7 flex items-center justify-center">
                          <Undo2 size={13} />
                        </button>

                        {/* 3. Belegt / Nächste */}
                        <button
                          onClick={() => { setTableBelegt(selectedTableId, r.id); close() }}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[28px]', belegtBtnCls)}
                        >
                          {belegtLabel}
                        </button>

                        {/* 4. No-Show */}
                        <button
                          onClick={() => { markNoShow(r.id); close() }}
                          className="px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-500 rounded-lg text-xs font-medium transition-colors min-h-[28px]"
                        >
                          No-Show
                        </button>
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── BOTTOM ACTIONS ──────────────────────────────────────────── */}
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {isReadOnly && <p className="w-full text-xs text-yellow-400">Nur-Lese-Modus</p>}

          {status === TableStatus.Reserviert && !isReadOnly && (
            <button onClick={() => { walkIn(selectedTableId); close() }}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium transition-colors">
              <Users size={14} />
              Walk-In vergeben
              {nextRes && <span className="text-orange-200 text-xs font-normal">bis {nextRes.startzeit}</span>}
            </button>
          )}

          {status === TableStatus.Frei && !isReadOnly && (
            <button onClick={() => { walkIn(selectedTableId); close() }}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium transition-colors">
              <Users size={14} /> Walk-In
            </button>
          )}

          {/* Tisch freigeben — always visible when occupied */}
          {isBelegt && !isReadOnly && (
            <button
              onClick={() => { setTableFrei(selectedTableId); close() }}
              className={cn('px-3 py-2 rounded-xl text-sm font-medium transition-colors text-white',
                isBelRes ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-700 hover:bg-blue-600')}
            >
              {isBelRes ? 'Walk-In freigeben' : 'Tisch freigeben'}
            </button>
          )}

          {role === Role.Admin && status === TableStatus.Frei && !isReadOnly && (
            <button onClick={() => { toggleDefekt(selectedTableId); close() }}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-xl text-sm font-medium transition-colors">
              Defekt
            </button>
          )}
          {role === Role.Admin && status === TableStatus.Defekt && !isReadOnly && (
            <button onClick={() => { toggleDefekt(selectedTableId); close() }}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
              Repariert
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
