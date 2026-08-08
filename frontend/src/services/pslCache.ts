/**
 * Sprint 1.2 — PSL IndexedDB cache via Dexie.
 *
 * One database, one table, one row ever: { id: 'snapshot', data: AppState }
 * Write: setInterval every 30 s (never from WS event handler — GC pressure).
 * Read: once on WS disconnect.
 */
import Dexie from 'dexie'
import type { AppState } from '../types'
import { useUiStore } from '../store/uiStore'
import { useTableStore } from '../store/tableStore'

// ── DB schema ─────────────────────────────────────────────────────────────────

interface SnapshotRow {
    id: string        // always 'snapshot'
    data: AppState
}

class PSLDatabase extends Dexie {
    state!: Dexie.Table<SnapshotRow, string>

    constructor() {
        super('psl-cache')
        this.version(1).stores({
            state: 'id',
        })
    }
}

const db = new PSLDatabase()

// ── Write path (called by setInterval every 30 000 ms) ───────────────────────

export async function persistSnapshot(): Promise<void> {
    try {
        const snapshot = useTableStore.getState().state
        await db.state.put({ id: 'snapshot', data: snapshot })
    } catch (err) {
        console.error('[Cache] IndexedDB write failed:', err)
        useUiStore.getState().setCacheHealthy(false)
    }
}

// ── Read path (called once on WS disconnect) ──────────────────────────────────

export async function loadSnapshot(): Promise<AppState | null> {
    try {
        const row = await db.state.get('snapshot')
        if (!row?.data) {
            useUiStore.getState().setCacheHealthy(false)
            return null
        }
        return row.data
    } catch (err) {
        console.error('[Cache] IndexedDB read failed:', err)
        useUiStore.getState().setCacheHealthy(false)
        return null
    }
}
