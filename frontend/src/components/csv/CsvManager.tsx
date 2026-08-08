import { useRef, useState } from 'react'
import { useTableStore } from '../../store/tableStore'
import { useAuthStore } from '../../store/authStore'
import { Role } from '../../types'
import { Upload, Trash2, FileText, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import { formatDateTime } from '../../utils/time'
import { ConfirmDialog } from '../modals/ConfirmDialog'
import { api } from '../../services/api'

interface PendingDelete {
  filename: string
  total: number
  activeCount: number
}

const REQUIRED_INTERNAL_FIELDS = [
  'startzeit', 'endzeit', 'kunde', 'art', 'personen',
  'standort', 'status', 'tisch_ids', 'tischanzahl', 'bemerkung'
]

const COLUMN_DISPLAY_NAMES: Record<string, string> = {
  startzeit: 'Startzeit',
  endzeit: 'Endzeit',
  kunde: 'Kunde',
  art: 'Art',
  personen: 'Personen',
  standort: 'Standort',
  status: 'Status',
  tisch_ids: 'Tisch-IDs',
  tischanzahl: 'Tischanzahl',
  bemerkung: 'Bemerkung',
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function CsvManager() {
  const role = useAuthStore((s) => s.role)
  const csvFiles = useTableStore((s) => s.state.csv_files)
  const reservations = useTableStore((s) => s.state.reservations)
  const deleteCsv = useTableStore((s) => s.deleteCsv)
  const loadFromServer = useTableStore((s) => s.loadFromServer)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [showFormat, setShowFormat] = useState(false)

  if (role !== Role.Admin) return null

  const validateHeaders = (file: File): Promise<string | null> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = (e.target?.result as string) ?? ''
        const firstLine = text.split('\n')[0] ?? ''
        if (!firstLine) return resolve('Datei ist leer')

        const delimiter = firstLine.includes(';') ? ';' : ','
        const rawHeaders = parseCsvLine(firstLine.replace(/^\uFEFF/, ''), delimiter).map(h => h.trim().toLowerCase())

        const missing = REQUIRED_INTERNAL_FIELDS.filter(f => !rawHeaders.includes(f))
        if (missing.length > 0) {
          const missingDisplay = missing.map(m => COLUMN_DISPLAY_NAMES[m]).join(', ')
          return resolve(`Falsche Spalten! Fehlend: ${missingDisplay}`)
        }
        resolve(null)
      }
      reader.readAsText(file, 'utf-8')
    })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''

    setError(null)
    const headerError = await validateHeaders(file)
    if (headerError) {
      setError(headerError)
      return
    }

    setUploading(true)
    try {
      await api.uploadCsv(file)
      await loadFromServer()
    } catch (err: any) {
      setError(err instanceof Error ? err.message : (err?.detail || 'Upload fehlgeschlagen'))
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteRequest = (filename: string) => {
    const entries = Object.values(reservations).filter((r) => r.csv_file === filename)
    const activeCount = entries.filter((r) => r.status === 'seated').length
    setPendingDelete({ filename, total: entries.length, activeCount })
  }

  const handleDeleteConfirm = () => {
    if (!pendingDelete) return
    deleteCsv(pendingDelete.filename)
    setPendingDelete(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Compact toolbar row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[34px] transition-all disabled:opacity-50"
          style={{
            background: 'rgba(37,99,235,0.85)',
            color: '#fff',
            border: '1px solid rgba(37,99,235,0.4)',
          }}
        >
          {uploading
            ? <><Loader2 size={14} className="animate-spin" /> Wird hochgeladen...</>
            : <><Upload size={14} /> CSV hochladen</>
          }
        </button>

        {/* Format instructions toggle */}
        <button
          onClick={() => setShowFormat(v => !v)}
          title="Format-Info"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronDown
            size={15}
            style={{ transform: showFormat ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
      </div>

      {/* Collapsible format instructions */}
      {showFormat && (
        <div
          className="rounded-xl p-3 text-xs"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="font-semibold text-gray-300 mb-2">Erwartetes CSV-Format (mit Kopfzeile):</p>
          <p className="font-mono text-[10px] text-gray-500 mb-2">
            startzeit;endzeit;kunde;art;personen;standort;status;tisch_ids;tischanzahl;bemerkung
          </p>
          <ul className="space-y-0.5 text-gray-500 text-[11px] list-disc list-inside">
            <li>Trennzeichen: Semikolon (;) oder Komma (,)</li>
            <li>Zeitformat: YYYY-MM-DD HH:MM oder HH:MM</li>
            <li>Art: Pool, Snooker, Tischtennis, Darts, Kicker, Gastro</li>
            <li>Standort: EG, UG, Veranstaltungsraum</li>
            <li>Status: Offen, Zugewiesen, Belegt, Abgeschlossen</li>
          </ul>
        </div>
      )}

      {csvFiles.length === 0 && (
        <p className="text-gray-500 text-xs text-center py-1">Keine Dateien hochgeladen</p>
      )}

      <div className="space-y-2">
        {csvFiles.map((f) => (
          <div key={f.filename} className="flex items-center justify-between bg-gray-900 rounded-xl p-3 border border-gray-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={15} className="text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{f.filename}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateTime(f.uploaded_at)} · {f.row_count} Reservierungen
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDeleteRequest(f.filename)}
              title="Datei löschen"
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ml-2 shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <AlertCircle size={14} className="text-red-400" />
            <p className="text-sm text-red-300 font-medium">Upload Fehler</p>
          </div>
          <p className="text-xs text-red-400 ml-5">{error}</p>
          <button onClick={() => setError(null)} className="mt-1.5 text-xs text-red-400 hover:text-red-300 underline ml-5">
            Schließen
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

      {pendingDelete && (
        <ConfirmDialog
          open={true}
          title="Datei löschen?"
          confirmDanger
          confirmLabel="Löschen"
          body={
            <div className="space-y-2">
              <p>
                <strong className="text-white">{pendingDelete.filename}</strong> und{' '}
                <strong className="text-white">{pendingDelete.total} Reservierungen</strong> werden entfernt.
              </p>
              {pendingDelete.activeCount > 0 && (
                <div className="flex items-start gap-2 p-2.5 bg-orange-900/30 border border-orange-700 rounded-lg">
                  <AlertCircle size={15} className="text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-orange-300 text-sm">
                    <strong>{pendingDelete.activeCount}</strong> Reservierungen sind gerade aktiv belegt.
                  </p>
                </div>
              )}
            </div>
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
