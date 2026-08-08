import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { Floor, Role } from '../../types'
import { useTableStore } from '../../store/tableStore'
import { LogOut, LayoutGrid, Table, CalendarClock, CalendarCheck, CalendarDays, ArrowLeft, AlertCircle } from 'lucide-react'
import { cn } from '../../utils/cn'
import { ConfirmDialog } from '../modals/ConfirmDialog'

const FLOORS: Floor[] = [Floor.EG, Floor.UG, Floor.VRA]
const FLOOR_LABELS: Record<Floor, string> = {
  [Floor.EG]: 'EG',
  [Floor.UG]: 'UG',
  [Floor.VRA]: 'Veranstaltung',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function TopBar() {
  const { activeFloor, setActiveFloor, activeView, setActiveView, activeSidePanel, setActiveSidePanel } = useUiStore()
  const role = useAuthStore((s) => s.role)
  const logout = useAuthStore((s) => s.logout)
  const neuerTag = useTableStore((s) => s.neuerTag)

  // Step-1: normal confirm dialog
  const [neuerTagOpen, setNeuerTagOpen] = useState(false)
  // Step-2: extra danger warning when already run today
  const [neuerTagWarnOpen, setNeuerTagWarnOpen] = useState(false)
  // Track the date on which Neuer Tag was last executed in this browser session
  const [lastNeuerTagDate, setLastNeuerTagDate] = useState<string>('')

  const navigate = useNavigate()
  const location = useLocation()
  const isKalender = location.pathname === '/kalender'

  const isFailsafe = useTableStore((s) => s.state.csv_files.length > 0)

  /** Called when staff confirms the first dialog */
  function handleFirstConfirm() {
    setNeuerTagOpen(false)
    if (lastNeuerTagDate === todayStr()) {
      // Already ran today — show the extra warning before proceeding
      setNeuerTagWarnOpen(true)
    } else {
      // First time today — execute immediately
      executeNeuerTag()
    }
  }

  /** Final execution — always works, no backend restriction */
  function executeNeuerTag() {
    setLastNeuerTagDate(todayStr())
    neuerTag()
  }

  return (
    <>
      {isFailsafe && (
        <div className="bg-orange-600 text-white font-bold text-center py-1.5 px-4 text-sm flex items-center justify-center gap-2 shrink-0">
          <AlertCircle size={18} />
          NOTFALLMODUS — Das System läuft im Backup-Modus!
        </div>
      )}
      <header className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
        <span className="font-bold text-base text-white mr-1 hidden sm:inline">Pool Sports</span>

        {/* Back button when on kalender page */}
        {isKalender ? (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-gray-400 hover:text-white transition-colors min-h-[40px]"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        ) : (
          /* Floor tabs — only shown on dashboard board view */
          activeView === 'board' && (
            <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
              {FLOORS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFloor(f)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[40px]',
                    activeFloor === f
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white',
                  )}
                >
                  {FLOOR_LABELS[f]}
                </button>
              ))}
            </div>
          )
        )}

        {/* View toggle — only on dashboard */}
        {!isKalender && (
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5 ml-1">
            <button
              onClick={() => setActiveView('board')}
              title="Board-Ansicht"
              className={cn(
                'p-2 rounded-md min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors',
                activeView === 'board' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white',
              )}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              onClick={() => setActiveView('tabelle')}
              title="Tabellenansicht"
              className={cn(
                'p-2 rounded-md min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors',
                activeView === 'tabelle' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white',
              )}
            >
              <Table size={17} />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Calendar nav button */}
        {!isKalender && (
          <button
            onClick={() => navigate('/kalender')}
            title="Buchungs-Kalender"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md text-sm font-medium min-h-[40px] transition-colors"
          >
            <CalendarDays size={16} />
            <span className="hidden sm:inline">Kalender</span>
          </button>
        )}

        {/* Admin-only: Neuer Tag — Hide on Kalender */}
        {role === Role.Admin && !isKalender && (
          <button
            onClick={() => setNeuerTagOpen(true)}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm font-medium min-h-[40px] transition-colors"
          >
            Neuer Tag
          </button>
        )}

        {/* Dual Panel Toggle Buttons — Only on Dashboard */}
        {!isKalender && (
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5 ml-1">
            {role === Role.Admin && (
              <button
                onClick={() => setActiveSidePanel('wartend')}
                title="Wartend-Panel öffnen/schließen"
                className={cn(
                  'p-2 rounded-md min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors',
                  activeSidePanel === 'wartend' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white',
                )}
              >
                <CalendarClock size={17} />
              </button>
            )}

            <button
              onClick={() => setActiveSidePanel('agenda')}
              title="Agenda-Panel öffnen/schließen"
              className={cn(
                'p-2 rounded-md min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors',
                activeSidePanel === 'agenda' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white',
              )}
            >
              <CalendarCheck size={17} />
            </button>
          </div>
        )}

        <button
          onClick={logout}
          title="Abmelden"
          className="p-2 text-gray-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
        >
          <LogOut size={17} />
        </button>
      </header>

      {/* Step 1 — Normal Neuer Tag confirmation */}
      <ConfirmDialog
        open={neuerTagOpen}
        title="Neuen Tag starten?"
        body={
          <p>
            <strong className="text-white">Alle Reservierungen, Sitzungen und CSV-Dateien</strong> werden gelöscht.
            <br /><br />
            Der Defekt-Status der Tische bleibt erhalten.
          </p>
        }
        confirmLabel="Neuen Tag starten"
        confirmDanger
        onConfirm={handleFirstConfirm}
        onCancel={() => setNeuerTagOpen(false)}
      />

      {/* Step 2 — Extra warning when already run today (same session) */}
      <ConfirmDialog
        open={neuerTagWarnOpen}
        title="Neuer Tag wurde heute bereits ausgeführt!"
        body={
          <p>
            Der Tagesstart wurde <strong className="text-amber-400">heute bereits durchgeführt</strong>.
            <br /><br />
            Ein erneuter Start löscht alle aktuellen Sitzungen und lädt die heutigen Reservierungen neu.
            <br /><br />
            <span className="text-gray-400 text-xs">Nur fortfahren, wenn du dir sicher bist.</span>
          </p>
        }
        confirmLabel="Trotzdem fortfahren"
        confirmDanger
        onConfirm={() => { setNeuerTagWarnOpen(false); executeNeuerTag() }}
        onCancel={() => setNeuerTagWarnOpen(false)}
      />
    </>
  )
}
