import { create } from 'zustand'
import { produce } from 'immer'
import {
  AppState,
  Reservation,
  TableStatus,
  CsvFile,
} from '../types'
import { todayISO } from '../utils/time'
import { api } from '../services/api'
import { TABLE_MAP } from '../config/tables'

// Sprint 2.2 — Module-level delta sequence tracker.
// Not in Zustand state: no persistence, no reactivity needed.
// Reset to 0 on every WS connect (server resets its counter on restart).
let _lastDeltaSeq = 0

function _checkSeq(incoming: number): void {
  if (_lastDeltaSeq !== 0 && incoming !== _lastDeltaSeq + 1) {
    console.warn(`[Delta] Gap: expected ${_lastDeltaSeq + 1}, got ${incoming}`)
  }
  _lastDeltaSeq = incoming
}

/** Called from useWebSocket on every ws.onopen — server resets seq on restart. */
export function resetDeltaSeq(): void { _lastDeltaSeq = 0 }

/** Active multi-table linking session — null when not in linking mode */
export interface LinkingMode {
  reservationId: string
  placedTableIds: string[]   // tables already placed
  needed: number             // total tischanzahl
  art: string                // used to filter valid drop targets
}

const initialState: AppState = {
  version: '1.1.0',
  date: todayISO(),
  reservations: {},
  csv_files: [],
  table_sessions: {},
  tables_defekt: [],
  last_updated: new Date().toISOString(),
}

interface TableStore {
  state: AppState
  loading: boolean
  linkingMode: LinkingMode | null
  isDragging: boolean

  replaceState: (s: AppState) => void
  setDragging: (v: boolean) => void
  loadFromServer: () => Promise<void>
  assignTable: (reservationId: string, tableId: string, standort?: string) => void
  unassignTable: (reservationId: string) => void
  setTableBelegt: (tableId: string, reservationId: string) => void
  setTableFrei: (tableId: string) => void
  walkIn: (tableId: string) => void
  markNoShow: (reservationId: string) => void
  toggleDefekt: (tableId: string) => void
  importCsv: (file: CsvFile, reservations: Reservation[]) => void
  deleteCsv: (filename: string) => void
  neuerTag: () => void
  undoStatus: (reservationId: string) => void
  /** Called when staff taps a glowing table during linking mode */
  completeLinking: (secondTableId: string) => void
  /** Cancel linking mode and revert the partial assignment */
  cancelLinking: () => void
  // Sprint 2.2 — Delta handlers (surgical, server-authoritative, parallel with stateupdate)
  applyTableStatusChanged: (ev: { tisch_id: string; status: string; reservation_id: string | null; last_updated: string; seq: number }) => void
  applyReservationAssigned: (ev: { reservation_id: string; tisch_id: string | null; kunde: string; last_updated: string; seq: number }) => void
  applyTimerStarted: (ev: { tisch_id: string; occupied_since: string | null; last_updated: string; seq: number }) => void
}

/**
 * Optimistically update local state, then call the backend.
 * Uses Immer's produce() for surgical mutations — only copies the
 * branches that change, avoiding full structuredClone GC pressure
 * on tablet hardware. (PERF-02 / S4.1)
 */
function optimistic<T>(
  set: (fn: (prev: { state: AppState }) => { state: AppState }) => void,
  localMutator: (s: AppState) => void,
  apiFn: () => Promise<T>,
) {
  // 1. Instant local update via Immer (surgical copy)
  set((prev) => {
    const s = produce(prev.state, (draft) => {
      localMutator(draft)
      draft.last_updated = new Date().toISOString()
    })
    return { state: s }
  })
  // 2. Persist to backend (WebSocket will sync authoritative state back)
  apiFn().catch((err) => {
    console.error('API sync error:', err)
    // On failure the WebSocket will soon push the real backend state,
    // which will rollback any inconsistency automatically.
  })
}

export const useTableStore = create<TableStore>((set, get) => ({
  state: initialState,
  loading: false,
  linkingMode: null,
  isDragging: false,

  replaceState: (s) => set({ state: s }),
  setDragging: (v) => set({ isDragging: v }),

  loadFromServer: async () => {
    set({ loading: true })
    try {
      const serverState = await api.getState()
      set({ state: serverState, loading: false })
    } catch (err) {
      console.error('Failed to load state from server:', err)
      set({ loading: false })
    }
  },

  // ── Assign ───────────────────────────────────────────────────────────────
  assignTable: (reservationId, tableId, standort) => {
    const res = get().state.reservations[reservationId]
    const tischanzahl = res?.tischanzahl ?? 1
    const isMulti = tischanzahl > 1

    // Fallback: if standort not provided, lookup the floor of the table
    // ⚠ ARCHITECTURAL NOTE (AUDIT-V2 / Sprint 10): standort is derived from the
    // frontend TABLE_MAP. Post-MVP, this should move to the backend assign route
    // so the backend is the single source of truth for table-to-floor mapping.
    const targetStandort = standort || TABLE_MAP[tableId]?.floor || ''

    optimistic(
      set,
      (s) => {
        const r = s.reservations[reservationId]
        if (!r) return
        r.standort = targetStandort
        if (isMulti) {
          // First drop of a multi-table booking: mark as partial
          r.tisch_id = tableId
          r.tisch_ids = [tableId]
          r.status = 'partial'
        } else {
          r.tisch_id = tableId
          r.tisch_ids = [tableId]
          r.status = 'assigned'
        }
      },
      () => isMulti
        ? api.assignMulti(reservationId, [tableId], targetStandort)   // partial: 1 of N
        : api.assign(reservationId, tableId, targetStandort),
    )

    // Enter linking mode after first drop for multi-table bookings
    if (isMulti) {
      set({
        linkingMode: {
          reservationId,
          placedTableIds: [tableId],
          needed: tischanzahl,
          art: res?.art ?? '',
        }
      })
    }
  },

  // ── Complete Linking (tap on glowing table) ──────────────────────────────
  completeLinking: (secondTableId) => {
    const lm = get().linkingMode
    if (!lm) return
    const allTableIds = [...lm.placedTableIds, secondTableId]

    const targetStandort = TABLE_MAP[secondTableId]?.floor || ''

    optimistic(
      set,
      (s) => {
        const r = s.reservations[lm.reservationId]
        if (!r) return
        r.tisch_ids = allTableIds
        r.tisch_id = allTableIds[0] ?? null
        r.status = allTableIds.length >= lm.needed ? 'assigned' : 'partial'
        r.standort = targetStandort
      },
      () => api.assignMulti(lm.reservationId, allTableIds, targetStandort),
    )

    if (allTableIds.length >= lm.needed) {
      set({ linkingMode: null })
    } else {
      // More tables still needed (3+ tables case)
      set({
        linkingMode: {
          ...lm,
          placedTableIds: allTableIds,
        }
      })
    }
  },

  // ── Cancel Linking ───────────────────────────────────────────────────────
  cancelLinking: () => {
    const lm = get().linkingMode
    if (!lm) return
    // Revert the partial assignment
    optimistic(
      set,
      (s) => {
        const r = s.reservations[lm.reservationId]
        if (!r) return
        r.tisch_id = null
        r.tisch_ids = []
        r.status = 'unassigned'
      },
      () => api.unassign(lm.reservationId),
    )
    set({ linkingMode: null })
  },

  // ── Unassign ─────────────────────────────────────────────────────────────
  unassignTable: (reservationId) =>
    optimistic(
      set,
      (s) => {
        const res = s.reservations[reservationId]
        if (!res) return

        const tisch_ids = res.tisch_ids?.length ? res.tisch_ids : (res.tisch_id ? [res.tisch_id] : [])
        if (tisch_ids.length === 0) return

        // Only clear the session if this was the actively-seated reservation.
        for (const tid of tisch_ids) {
          const session = s.table_sessions[tid]
          if (session?.reservationId === reservationId) {
            delete s.table_sessions[tid]
          }
        }
        res.tisch_id = null
        res.tisch_ids = []
        res.status = 'unassigned'
      },
      () => api.unassign(reservationId),
    ),

  // ── Belegt ───────────────────────────────────────────────────────────────
  setTableBelegt: (tableId, reservationId) =>
    optimistic(
      set,
      (s) => {
        const res = s.reservations[reservationId]
        if (!res) return
        res.status = 'seated'

        const tisch_ids = res.tisch_ids?.length ? res.tisch_ids : (res.tisch_id ? [res.tisch_id] : [])

        // Revert any newer inadvertently-seated reservations back to assigned
        Object.values(s.reservations).forEach((otherRes) => {
          const other_ids = otherRes.tisch_ids?.length ? otherRes.tisch_ids : (otherRes.tisch_id ? [otherRes.tisch_id] : [])
          const overlaps = other_ids.some(tid => tisch_ids.includes(tid))

          if (
            otherRes.id !== reservationId &&
            overlaps &&
            otherRes.status === 'seated' &&
            otherRes.startzeit > res.startzeit
          ) {
            otherRes.status = 'assigned'
          }
        })

        for (const tid of tisch_ids) {
          const existing = s.table_sessions[tid]
          const wasReal = existing?.reservationId === reservationId && !existing?.isGhost
          const isGhost = (tid !== tableId) && !wasReal

          s.table_sessions[tid] = {
            status: TableStatus.Belegt,
            reservationId,
            guest: res.kunde,
            occupiedSince: existing?.occupiedSince || new Date().toISOString(),
            isGhost,
          }
        }
      },
      () => api.updateTableStatus(tableId, 'belegt', undefined, reservationId),
    ),


  // ── Freigeben ────────────────────────────────────────────────────────────
  setTableFrei: (tableId) =>
    optimistic(
      set,
      (s) => {
        delete s.table_sessions[tableId]
      },
      () => api.updateTableStatus(tableId, 'frei'),
    ),

  // ── Walk-In ──────────────────────────────────────────────────────────────
  walkIn: (tableId) =>
    optimistic(
      set,
      (s) => {
        s.table_sessions[tableId] = {
          status: TableStatus.Belegt,
          reservationId: null,
          guest: 'Walk-in',
          occupiedSince: new Date().toISOString(),
        }
      },
      () => api.walkIn(tableId),
    ),

  // ── No-Show ──────────────────────────────────────────────────────────────
  markNoShow: (reservationId) =>
    optimistic(
      set,
      (s) => {
        const res = s.reservations[reservationId]
        if (!res) return
        // Only flip the status — keep tisch_ids and sessions intact so the
        // card stays visible on the floor plan and staff can undo the mistake.
        res.status = 'no-show'
      },
      () => api.noShow(reservationId),
    ),

  // ── Undo Status (Revert to Assigned) ─────────────────────────────────────
  undoStatus: (reservationId) =>
    optimistic(
      set,
      (s) => {
        const res = s.reservations[reservationId]
        if (!res) return

        res.status = 'assigned'

        const tisch_ids = res.tisch_ids?.length ? res.tisch_ids : (res.tisch_id ? [res.tisch_id] : [])
        for (const tid of tisch_ids) {
          const session = s.table_sessions[tid]
          if (session?.reservationId === reservationId) {
            delete s.table_sessions[tid]
          }
        }
      },
      () => api.undoStatus(reservationId),
    ),

  // ── Defekt ───────────────────────────────────────────────────────────────
  toggleDefekt: (tableId) =>
    optimistic(
      set,
      (s) => {
        const idx = s.tables_defekt.indexOf(tableId)
        if (idx >= 0) {
          s.tables_defekt.splice(idx, 1)
          delete s.table_sessions[tableId]
        } else {
          s.tables_defekt.push(tableId)
          s.table_sessions[tableId] = {
            status: TableStatus.Defekt,
            reservationId: null,
            guest: null,
            occupiedSince: null,
          }
        }
      },
      () => {
        const isCurrentlyDefekt = get().state.tables_defekt.includes(tableId)
        // Note: local state has already been updated optimistically, so we check
        // the NEW state (after toggle) to determine the API call direction.
        // After optimistic update, if tableId IS in defekt → we just added it.
        return api.defekt(tableId, isCurrentlyDefekt)
      },
    ),

  // ── CSV: Upload (local-only optimistic, primary handled by CsvManager via api.uploadCsv) ─
  importCsv: (file, reservations) =>
    set((prev) => {
      const s = structuredClone(prev.state)
      // Avoid duplicate file entries
      if (!s.csv_files.find((f) => f.filename === file.filename)) {
        s.csv_files.push(file)
      }
      for (const r of reservations) {
        s.reservations[r.id] = r
      }
      s.last_updated = new Date().toISOString()
      return { state: s }
    }),

  // ── CSV: Delete ──────────────────────────────────────────────────────────
  deleteCsv: (filename) =>
    optimistic(
      set,
      (s) => {
        s.csv_files = s.csv_files.filter((f) => f.filename !== filename)
        for (const [id, r] of Object.entries(s.reservations)) {
          if (r.csv_file === filename) {
            if (r.tisch_id) delete s.table_sessions[r.tisch_id]
            delete s.reservations[id]
          }
        }
      },
      () => api.deleteCsv(filename),
    ),

  // ── Neuer Tag ────────────────────────────────────────────────────────────
  neuerTag: () =>
    optimistic(
      set,
      (s) => {
        const defekt = [...s.tables_defekt]
        s.reservations = {}
        s.csv_files = []
        s.table_sessions = {}
        s.tables_defekt = defekt
        s.date = todayISO()
        defekt.forEach((tid) => {
          s.table_sessions[tid] = {
            status: TableStatus.Defekt,
            reservationId: null,
            guest: null,
            occupiedSince: null,
          }
        })
      },
      () => api.neuerTag(),
    ),

  // ── Sprint 2.2: Delta handlers ────────────────────────────────────────────
  // Each handler: (1) updates seq tracker, (2) no-op guard on last_updated,
  // (3) surgical Immer produce — only named payload fields written.
  // stateupdate is still primary during parallel phase and will correct any
  // partial delta. These handlers exist to eliminate the round-trip latency.

  applyTableStatusChanged: (ev) => {
    _checkSeq(ev.seq)
    if (ev.last_updated <= get().state.last_updated) return
    set((prev) => ({
      state: produce(prev.state, (draft) => {
        if (ev.status === 'frei') {
          delete draft.table_sessions[ev.tisch_id]
        } else if (draft.table_sessions[ev.tisch_id]) {
          draft.table_sessions[ev.tisch_id].status = ev.status as TableStatus
        }
        draft.last_updated = ev.last_updated
      }),
    }))
  },

  applyReservationAssigned: (ev) => {
    _checkSeq(ev.seq)
    if (ev.last_updated <= get().state.last_updated) return
    set((prev) => ({
      state: produce(prev.state, (draft) => {
        const res = draft.reservations[ev.reservation_id]
        if (res && ev.tisch_id !== undefined) {
          res.tisch_id = ev.tisch_id
          res.status = 'assigned'
        }
        draft.last_updated = ev.last_updated
      }),
    }))
  },

  applyTimerStarted: (ev) => {
    _checkSeq(ev.seq)
    if (ev.last_updated <= get().state.last_updated) return
    set((prev) => ({
      state: produce(prev.state, (draft) => {
        const session = draft.table_sessions[ev.tisch_id]
        if (session) {
          session.occupiedSince = ev.occupied_since
        }
        draft.last_updated = ev.last_updated
      }),
    }))
  },
}))

