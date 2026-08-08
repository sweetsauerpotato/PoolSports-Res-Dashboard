import { useState, Fragment, useMemo, useRef, useEffect } from 'react'
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown, Link2 } from 'lucide-react'
import { Reservation, reservationApi, ApiError } from '../../services/reservationApi'
import { useAuthStore } from '../../store/authStore'
import { Role } from '../../types'
import { cn } from '../../utils/cn'
import { TYPE_BADGE_CLASSES, TYPE_COLORS } from '../../config/colors'
import { InlineReservationRow } from './InlineReservationRow'
import { ART_TO_TYPE } from '../../config/gameTypes'

interface Props {
  datum: string
  reservations: Reservation[]
  onRefresh: () => void
}

function timeOnly(datetime: string): string {
  // "2026-03-14 19:00:00" → "19:00"
  return datetime.split(' ')[1]?.slice(0, 5) ?? datetime
}

export function ReservationList({ datum, reservations, onRefresh }: Props) {
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === Role.Admin

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: 'art' | 'standort' | 'personen', direction: 'asc' | 'desc'} | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAdding) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [reservations.length, isAdding])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await reservationApi.delete(id)
      showToast('Reservierung gelöscht', true)
      onRefresh()
    } catch (e) {
      const err = e as ApiError
      showToast(err.detail ?? 'Fehler beim Löschen', false)
    } finally {
      setDeleting(false)
      setConfirmId(null)
    }
  }

  const sortedReservations = useMemo(() => {
    if (!sortConfig) return reservations;
    return [...reservations].sort((a, b) => {
      const isNumeric = sortConfig.key === 'personen';
      const valA = isNumeric 
        ? Number(a[sortConfig.key]) || 0 
        : (String(a[sortConfig.key]) || '').toLowerCase();
      const valB = isNumeric 
        ? Number(b[sortConfig.key]) || 0 
        : (String(b[sortConfig.key]) || '').toLowerCase();
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [reservations, sortConfig]);



  const handleSort = (key: 'art' | 'standort' | 'personen') => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  }

  return (
    <div className="relative">
      {toast && (
        <div className={cn(
          'absolute top-0 right-0 text-sm px-3 py-2 rounded-lg z-10 transition-all',
          toast.ok ? 'bg-green-700 text-white' : 'bg-red-700 text-white'
        )}>
          {toast.msg}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-700">
            <th className="pb-2 pr-4 font-medium">Zeit</th>
            <th className="pb-2 pr-4 font-medium">Kunde</th>
            <th 
              className="pb-2 pr-4 font-medium hidden sm:table-cell cursor-pointer hover:text-white transition-colors group select-none"
              onClick={() => handleSort('art')}
            >
              <div className="flex items-center gap-1">
                Spielart
                <div className="flex flex-col -space-y-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  <ArrowUp size={10} className={cn(sortConfig?.key === 'art' && sortConfig.direction === 'asc' ? "text-blue-400 opacity-100" : "")} />
                  <ArrowDown size={10} className={cn(sortConfig?.key === 'art' && sortConfig.direction === 'desc' ? "text-blue-400 opacity-100" : "")} />
                </div>
              </div>
            </th>
            <th 
              className="pb-2 pr-4 font-medium hidden sm:table-cell cursor-pointer hover:text-white transition-colors group select-none"
              onClick={() => handleSort('personen')}
            >
              <div className="flex items-center gap-1">
                Pers.
                <div className="flex flex-col -space-y-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  <ArrowUp size={10} className={cn(sortConfig?.key === 'personen' && sortConfig.direction === 'asc' ? "text-blue-400 opacity-100" : "")} />
                  <ArrowDown size={10} className={cn(sortConfig?.key === 'personen' && sortConfig.direction === 'desc' ? "text-blue-400 opacity-100" : "")} />
                </div>
              </div>
            </th>
            <th 
              className="pb-2 pr-4 font-medium hidden sm:table-cell cursor-pointer hover:text-white transition-colors group select-none"
              onClick={() => handleSort('standort')}
            >
              <div className="flex items-center gap-1">
                Standort
                <div className="flex flex-col -space-y-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  <ArrowUp size={10} className={cn(sortConfig?.key === 'standort' && sortConfig.direction === 'asc' ? "text-blue-400 opacity-100" : "")} />
                  <ArrowDown size={10} className={cn(sortConfig?.key === 'standort' && sortConfig.direction === 'desc' ? "text-blue-400 opacity-100" : "")} />
                </div>
              </div>
            </th>
            <th className="pb-2 pr-4 font-medium hidden xl:table-cell">Bemerkung</th>
            <th className="pb-2 font-medium text-right">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {reservations.length === 0 && !isAdding && (
            <tr>
              <td colSpan={7} className="text-gray-500 text-sm text-center py-6">
                Keine Reservierungen für diesen Tag.
              </td>
            </tr>
          )}
          {sortedReservations.map((r) => (
            <Fragment key={r.id}>
              {editingId === r.id ? (
                <InlineReservationRow 
                  datum={datum} 
                  editId={r.id} 
                  existingReservation={r} 
                  onSaved={() => { setEditingId(null); onRefresh(); }} 
                  onCancel={() => setEditingId(null)} 
                />
              ) : (
                <Fragment>
                  <tr className={cn(
                    "group border-b border-gray-700/40 hover:bg-white/[0.04] transition-all duration-150",
                    r.bemerkung ? "border-b-0" : "",
                    "border-l-2 border-l-transparent"
                  )}>
                    <td className="py-2.5 pl-2 pr-4 text-white font-mono">
                  {timeOnly(r.startzeit)}{r.endzeit ? `–${timeOnly(r.endzeit)}` : ' - Offen'}
                </td>
                <td className="py-2.5 pr-4 text-white">
                  {r.kunde}
                  {r.telefon && <span className="block text-xs text-gray-500">{r.telefon}</span>}
                </td>
                <td className="py-2.5 pr-4 text-gray-300 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                        ART_TO_TYPE[r.art] ? TYPE_BADGE_CLASSES[ART_TO_TYPE[r.art]] : 'bg-gray-700 text-gray-300'
                      )}
                      style={ART_TO_TYPE[r.art] ? {
                        boxShadow: `inset 0 0 7px ${TYPE_COLORS[ART_TO_TYPE[r.art]]}30`
                      } : undefined}
                    >
                      {r.art}
                    </span>
                    {(r.tischanzahl ?? 1) >= 2 && (
                      <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-semibold" title={`${r.tischanzahl} Tische`}>
                        <Link2 size={10} />{r.tischanzahl}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-gray-300 hidden sm:table-cell">{r.personen}</td>
                <td className="py-2.5 pr-4 text-gray-300 hidden sm:table-cell">
                  {r.standort ? (
                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{r.standort}</span>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-gray-400 text-xs hidden xl:table-cell italic max-w-[200px] truncate" title={r.bemerkung || ''}>
                  {r.bemerkung}
                </td>
                <td className="py-2.5 text-right align-top">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-1 justify-end">
                    <button
                      data-testid="edit-btn"
                      onClick={() => setEditingId(r.id)}
                      className="p-2 rounded-lg text-gray-500 opacity-40 group-hover:opacity-100 hover:text-blue-400 hover:bg-blue-500/10 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Bearbeiten"
                    >
                      <Pencil size={15} />
                    </button>
                    {isAdmin && (
                      <button
                        data-testid="delete-btn"
                        onClick={() => setConfirmId(confirmId === r.id ? null : r.id)}
                        className={cn(
                          "p-2 rounded-lg text-gray-500 opacity-40 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center",
                          confirmId === r.id && "text-red-400 opacity-100 bg-red-500/10"
                        )}
                        title="Löschen"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {isAdmin && confirmId === r.id && (
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-gray-400 whitespace-nowrap">Wirklich löschen?</span>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting}
                        className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs min-h-[36px] font-medium transition-colors whitespace-nowrap"
                      >
                        Ja, löschen
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs min-h-[36px] font-medium transition-colors"
                      >
                        Nein
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
            </Fragment>
              )}
            </Fragment>
          ))}
          
          {isAdding && (
            <InlineReservationRow 
              datum={datum}
              editId={null}
              onSaved={() => { onRefresh(); }}
              onCancel={() => setIsAdding(false)}
            />
          )}

          {!isAdding && (
            <tr className="border-t border-gray-700">
              <td colSpan={7} className="py-3 pl-2">
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  {reservations.length === 0 ? 'Neue Reservierung' : 'Weitere Reservierung hinzufügen'}
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div ref={bottomRef} className="h-4 w-full" />
    </div>
  )
}
