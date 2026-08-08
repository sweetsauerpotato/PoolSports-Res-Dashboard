import { useState, useEffect } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { TopBar } from './TopBar'
import { SidePanel } from './SidePanel'
import { FloorPlan } from '../floor/FloorPlan'
import { Tabellenansicht } from '../table-view/Tabellenansicht'
import { useUiStore } from '../../store/uiStore'
import { useTableStore } from '../../store/tableStore'
import { TableActionModal } from '../modals/TableActionModal'
import { ConfirmDialog } from '../modals/ConfirmDialog'
import { ConnectionBanner } from './ConnectionBanner'
import { TABLE_MAP } from '../../config/tables'
import { ART_TO_TYPE } from '../../config/gameTypes'

export function AppShell() {
  const activeView = useUiStore((s) => s.activeView)
  const selectedTableId = useUiStore((s) => s.selectedTableId)
  const wsStatus = useUiStore((s) => s.wsStatus)
  const assignTable = useTableStore((s) => s.assignTable)
  const cancelLinking = useTableStore((s) => s.cancelLinking)
  const setDragging = useTableStore((s) => s.setDragging)
  const linkingMode = useTableStore((s) => s.linkingMode)
  const reservations = useTableStore((s) => s.state.reservations)
  const tablesDefekt = useTableStore((s) => s.state.tables_defekt)

  const [artMismatchOpen, setArtMismatchOpen] = useState(false)
  const [floorMismatchOpen, setFloorMismatchOpen] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<{ reservationId: string; tableId: string } | null>(null)
  const [undoVisible, setUndoVisible] = useState(false)

  // Same guard as TableActionModal: block drag-drop mutations during 'reconnecting'
  // as well as 'disconnected'. Only 'connected' (confirmed by first state_update) permits drops.
  const isReadOnly = wsStatus !== 'connected'

  // Show undo toast when linking mode activates; auto-dismiss after 30s
  useEffect(() => {
    if (linkingMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUndoVisible(true)
      const t = setTimeout(() => setUndoVisible(false), 30_000)
      return () => clearTimeout(t)
    } else {
      setUndoVisible(false)
    }
  }, [linkingMode])

  const onDragEnd = (result: DropResult) => {
    setDragging(false)
    if (isReadOnly) return
    const { draggableId, destination } = result
    if (!destination) return

    const destId = destination.droppableId

    // Sidebar drops — no-op (reservations moved to Wartend via the ↩ button in modal)
    if (destId === 'sidebar-reservations') return

    // Drop onto a table
    if (!destId.startsWith('table-')) return
    const realTableId = destId.replace('table-', '')

    const tableDef = TABLE_MAP[realTableId]
    if (!tableDef) return

    // Block: defekt tables cannot receive reservations
    if (tablesDefekt.includes(realTableId)) return

    const res = reservations[draggableId]
    if (!res) return

    // Block: already assigned to the same table (prevent duplicate drops)
    if (res.tisch_id === realTableId) return

    // Type validation: reservation art must match table type
    const expectedType = ART_TO_TYPE[res.art]
    if (expectedType && expectedType !== tableDef.type) {
      setArtMismatchOpen(true)
      return
    }

    // Floor mismatch: warn if reservation has a standort that differs from table.floor
    // Quick Check reservations have standort=null/empty — skip dialog
    if (res.standort && res.standort.trim() && res.standort !== tableDef.floor) {
      setPendingDrop({ reservationId: draggableId, tableId: realTableId })
      setFloorMismatchOpen(true)
      return
    }

    assignTable(draggableId, realTableId)
  }

  return (
    <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}>
      <div className="h-full flex flex-col bg-gray-900 text-white">
        <TopBar />
        <ConnectionBanner />
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 p-1 overflow-auto flex flex-col min-h-0">
            {activeView === 'board' ? <FloorPlan /> : <Tabellenansicht />}
          </main>
          {activeView === 'board' && <SidePanel />}
        </div>
        {selectedTableId && <TableActionModal />}

        {/* Linking mode undo toast */}
        {linkingMode && undoVisible && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-800 border border-amber-500/50 text-white rounded-xl px-4 py-3 shadow-xl animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-medium">Tisch verankert — wähle den zweiten Tisch</span>
            <button
              onClick={() => { cancelLinking(); setUndoVisible(false) }}
              className="ml-2 px-3 py-1 text-xs font-semibold bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Rückgängig
            </button>
          </div>
        )}

        {/* Art mismatch dialog */}
        <ConfirmDialog
          open={artMismatchOpen}
          title="Falscher Tischtyp"
          body="Diese Reservierung passt nicht zu diesem Tischtyp. Bitte auf den richtigen Tisch ziehen."
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={() => setArtMismatchOpen(false)}
          onCancel={() => setArtMismatchOpen(false)}
        />

        {/* Floor mismatch dialog — Sprint 3.4 */}
        <ConfirmDialog
          open={floorMismatchOpen}
          title="Achtung: Falscher Bereich!"
          body={
            pendingDrop
              ? (() => {
                  const res = reservations[pendingDrop.reservationId]
                  const tbl = TABLE_MAP[pendingDrop.tableId]
                  return `Diese Reservierung ist für ${res?.standort ?? '?'}. Trotzdem auf ${tbl?.floor ?? '?'} zuweisen?`
                })()
              : ''
          }
          confirmLabel="Trotzdem zuweisen"
          cancelLabel="Abbrechen"
          onConfirm={() => {
            if (pendingDrop) assignTable(pendingDrop.reservationId, pendingDrop.tableId)
            setFloorMismatchOpen(false)
            setPendingDrop(null)
          }}
          onCancel={() => {
            setFloorMismatchOpen(false)
            setPendingDrop(null)
          }}
        />
      </div>
    </DragDropContext>
  )
}
