import { useState, useEffect, Fragment } from 'react'
import { reservationApi, Reservation, ApiError } from '../../services/reservationApi'
import { cn } from '../../utils/cn'
import { Check, X, Link2 } from 'lucide-react'

interface Props {
  datum: string
  editId: string | null
  existingReservation?: Reservation
  onSaved: () => void
  onCancel: () => void
}

const SPIELARTEN = [
  { value: 'Pool', label: 'Pool' },
  { value: 'Snooker', label: 'Snooker' },
  { value: 'Darts', label: 'Darts' },
  { value: 'Tischtennis', label: 'Tischtennis' },
  { value: 'Kicker', label: 'Kicker' },
  { value: 'Gastro', label: 'Gastro' },
]

const STANDORTE = [
  { value: '', label: 'Egal' },
  { value: 'EG', label: 'Erdgeschoss (EG)' },
  { value: 'UG', label: 'Untergeschoss (UG)' },
  { value: 'VRA', label: 'Veranstaltungsraum' },
]

const TIME_OPTIONS = (() => {
  const times: string[] = []
  for (let h = 14; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  times.push('00:00')
  return times
})()

interface FormState {
  kunde: string
  telefon: string
  art: string
  personen: string
  standort: string
  startzeit: string
  endzeit: string
  bemerkung: string
  tischanzahl: number
}

const DEFAULT_FORM: FormState = {
  kunde: '', telefon: '', art: 'Pool', standort: '',
  personen: '2', startzeit: '19:00', endzeit: '21:00', bemerkung: '',
  tischanzahl: 1,
}

export function InlineReservationRow({ datum, editId, existingReservation, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [isOpenEnd, setIsOpenEnd] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (existingReservation) {
      const r = existingReservation
      setForm({
        kunde: r.kunde,
        telefon: r.telefon ?? '',
        art: r.art ?? 'Pool',
        personen: String(r.personen) || '2',
        standort: r.standort ?? '',
        startzeit: r.startzeit ? r.startzeit.split(' ')[1]?.slice(0, 5) ?? r.startzeit : '',
        endzeit: r.endzeit ? r.endzeit.split(' ')[1]?.slice(0, 5) ?? r.endzeit : '',
        bemerkung: r.bemerkung ?? '',
        tischanzahl: r.tischanzahl ?? 1,
      })
      setIsOpenEnd(!r.endzeit)
      return
    }
    
    if (!editId) { setForm(DEFAULT_FORM); return }
    reservationApi.getOne(editId).then((r: Reservation) => {
      setForm({
        kunde: r.kunde,
        telefon: r.telefon ?? '',
        art: r.art ?? 'Pool',
        personen: String(r.personen) || '2',
        standort: r.standort ?? '',
        startzeit: r.startzeit ? r.startzeit.split(' ')[1]?.slice(0, 5) ?? r.startzeit : '',
        endzeit: r.endzeit ? r.endzeit.split(' ')[1]?.slice(0, 5) ?? r.endzeit : '',
        bemerkung: r.bemerkung ?? '',
        tischanzahl: r.tischanzahl ?? 1,
      })
      setIsOpenEnd(!r.endzeit)
    }).catch(() => setToast('Fehler beim Laden'))
  }, [editId, existingReservation])

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (form.kunde.trim().length < 2) errs.kunde = 'Kunde ist Pflichtfeld (min. 2 Zeichen)'
    if (!form.startzeit) errs.startzeit = 'Startzeit erforderlich'
    if (!isOpenEnd && !form.endzeit) errs.endzeit = 'Endzeit erforderlich'
    if (!isOpenEnd && form.startzeit && form.endzeit && form.endzeit <= form.startzeit) {
      errs.endzeit = 'Endzeit muss nach Startzeit liegen'
    }
    const p = Number(form.personen)
    if (!p || p < 1 || p > 30) errs.personen = 'Personen: 1–30'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveClick = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        datum,
        startzeit: form.startzeit,
        endzeit: isOpenEnd ? '' : form.endzeit,
        kunde: form.kunde.trim(),
        telefon: form.telefon.trim() || null,
        art: form.art,
        personen: form.personen,
        standort: form.standort,
        bemerkung: form.bemerkung.trim() || null,
        tischanzahl: form.tischanzahl,
      }
      if (editId) {
        await reservationApi.update(editId, payload)
      } else {
        await reservationApi.create(payload)
        setForm(DEFAULT_FORM)
      }
      onSaved()
    } catch (e) {
      const err = e as ApiError
      if (err.error_code === 'UNAUTHORIZED') {
        setToast('Keine Berechtigung — bitte neu anmelden')
      } else if (err.field) {
        setErrors(prev => ({ ...prev, [err.field!]: err.detail }))
      } else {
        setToast(err.detail ?? 'Fehler beim Speichern')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (name: keyof FormState, extra?: string) => cn(
    'bg-gray-700 border rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 transition-colors w-full',
    errors[name] ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500',
    extra
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveClick();
    }
  }

  return (
    <Fragment>
      <tr className="bg-gray-800 shadow-inner border-y border-gray-600" onKeyDown={handleKeyDown}>
        <td className="py-2 pl-2 pr-4 align-top">
          <div className="flex flex-col gap-1 w-20">
            <select aria-label="Start" className={inputClass('startzeit', 'appearance-none text-center bg-gray-700')} value={form.startzeit} onChange={set('startzeit')} autoFocus>
              <option value="" disabled>Start</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            
            <div className="flex items-center gap-1.5 mt-0.5 justify-center">
              <input 
                type="checkbox" 
                id={`open-end-${editId || 'new'}`}
                checked={isOpenEnd}
                onChange={(e) => setIsOpenEnd(e.target.checked)}
                className="w-3 h-3 rounded bg-gray-800 border-gray-600 outline-none text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <label htmlFor={`open-end-${editId || 'new'}`} className="text-[10px] text-gray-300 select-none cursor-pointer">Offen</label>
            </div>

            {!isOpenEnd && (
              <select aria-label="Ende" className={inputClass('endzeit', 'appearance-none text-center bg-gray-700')} value={form.endzeit} onChange={set('endzeit')}>
                <option value="" disabled>Ende</option>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
          {(errors.startzeit || errors.endzeit) && <p className="text-red-400 text-[10px] mt-1 line-clamp-2 leading-tight">Zeit fehlt/falsch</p>}
        </td>
        <td className="py-2 pr-4 align-top">
          <div className="flex flex-col gap-1 min-w-[120px]">
            <input aria-label="Kunde" className={inputClass('kunde')} value={form.kunde} onChange={set('kunde')} placeholder="Name des Gastes" />
            <input aria-label="Telefon" className={inputClass('telefon')} value={form.telefon} onChange={set('telefon')} placeholder="Telefon (opt.)" />
          </div>
          {errors.kunde && <p className="text-red-400 text-[10px] mt-1 line-clamp-2 leading-tight">{errors.kunde}</p>}
        </td>
        <td className="py-2 pr-4 align-top hidden sm:table-cell">
          <div className="flex items-center gap-1.5">
            <select aria-label="Spielart" className={inputClass('art', 'min-w-[90px] bg-gray-700')} value={form.art} onChange={set('art')}>
              {SPIELARTEN.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {/* Tischanzahl stepper — shown inline next to Spielart */}
            <div className="flex items-center gap-0.5 bg-gray-700 border border-gray-600 rounded px-1 py-1 shrink-0">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, tischanzahl: Math.max(1, prev.tischanzahl - 1) }))}
                className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center text-sm font-bold leading-none"
                title="Weniger Tische"
              >−</button>
              <span className={cn(
                'text-xs font-bold text-center w-4',
                form.tischanzahl >= 2 ? 'text-amber-400' : 'text-gray-300'
              )}>{form.tischanzahl}</span>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, tischanzahl: prev.tischanzahl + 1 }))}
                className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center text-sm font-bold leading-none"
                title="Mehr Tische"
              >+</button>
            </div>
            {form.tischanzahl >= 2 && (
              <span title={`${form.tischanzahl} Tische benötigt`}><Link2 size={13} className="text-amber-400 shrink-0" /></span>
            )}
          </div>
        </td>
        <td className="py-2 pr-4 align-top hidden sm:table-cell">
          <input aria-label="Personen" type="number" min="1" max="30" className={inputClass('personen', 'w-16')} value={form.personen} onChange={set('personen')} />
          {errors.personen && <p className="text-red-400 text-[10px] mt-1 line-clamp-2 leading-tight">1-30</p>}
        </td>
        <td className="py-2 pr-4 align-top hidden sm:table-cell">
          <select aria-label="Standort" className={inputClass('standort', 'min-w-[80px] bg-gray-700')} value={form.standort} onChange={set('standort')}>
            {STANDORTE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </td>
        <td className="py-2 pr-4 align-top hidden xl:table-cell">
          <input 
            aria-label="Bemerkung" 
            className={inputClass('bemerkung', 'w-full min-w-[150px] italic')} 
            value={form.bemerkung} 
            onChange={set('bemerkung')} 
            placeholder="Optionale Bemerkung..." 
          />
        </td>
        <td className="py-2 text-right align-top pr-2">
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleSaveClick}
              disabled={loading}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
              title="Speichern"
            >
              <Check size={16} />
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-white transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
              title="Abbrechen"
            >
              <X size={16} />
            </button>
          </div>
          {toast && <p className="text-red-400 text-[10px] mt-2 whitespace-nowrap text-right">{toast}</p>}
        </td>
      </tr>
    </Fragment>
  )
}
