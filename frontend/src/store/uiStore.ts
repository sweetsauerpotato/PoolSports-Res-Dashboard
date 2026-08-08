import { create } from 'zustand'
import { Floor, TableType, TableStatus } from '../types'

interface UiState {
  activeFloor: Floor
  activeView: 'board' | 'tabelle'
  selectedTableId: string | null
  activeSidePanel: 'wartend' | 'agenda' | null
  sortKey: 'time' | 'personen'
  sortAsc: boolean
  filterType: TableType | null
  filterStatus: TableStatus | 'belres' | null
  wsStatus: 'connected' | 'disconnected' | 'reconnecting'
  reconnectTrigger: number
  /** Sprint 1.2: false when IndexedDB write or read has failed — banner shows no-cache variant */
  cacheHealthy: boolean
  setActiveFloor: (f: Floor) => void
  setActiveView: (v: 'board' | 'tabelle') => void
  setSelectedTableId: (id: string | null) => void
  setActiveSidePanel: (panel: 'wartend' | 'agenda' | null) => void
  setSort: (key: 'time' | 'personen') => void
  setFilterType: (t: TableType | null) => void
  setFilterStatus: (s: TableStatus | 'belres' | null) => void
  setWsStatus: (s: 'connected' | 'disconnected' | 'reconnecting') => void
  triggerReconnect: () => void
  setCacheHealthy: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeFloor: Floor.EG,
  activeView: 'board',
  selectedTableId: null,
  activeSidePanel: 'wartend',
  sortKey: 'time',
  sortAsc: true,
  filterType: null,
  filterStatus: null,
  wsStatus: 'connected',
  reconnectTrigger: 0,
  cacheHealthy: true,

  setActiveFloor: (f) => set({ activeFloor: f }),
  setActiveView: (v) => set({ activeView: v }),
  setSelectedTableId: (id) => set({ selectedTableId: id }),
  setActiveSidePanel: (panel) => set((s) => ({
    activeSidePanel: s.activeSidePanel === panel ? null : panel
  })),
  setSort: (k) => set((s) => ({
    sortKey: k,
    sortAsc: s.sortKey === k ? !s.sortAsc : true
  })),
  setFilterType: (t) => set({ filterType: t }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setWsStatus: (s) => set({ wsStatus: s }),
  triggerReconnect: () => set((s) => ({ reconnectTrigger: s.reconnectTrigger + 1 })),
  setCacheHealthy: (v) => set({ cacheHealthy: v }),
}))
