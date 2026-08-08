/**
 * QuickCheckModal — Sprints 3.1, 3.2, 3.3
 * Glassmorphism redesign: all logic identical, visuals fully replaced.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, CheckCircle2, XCircle, Clock, Loader2, Zap } from 'lucide-react'
import { getPin } from '../../utils/auth'
import { reservationApi, ApiError } from '../../services/reservationApi'

// ── Types ─────────────────────────────────────────────────────────────────────
interface NaechsterSlot { startzeit: string; endzeit: string; freitische: number }
interface VerfuegbarkeitAntwort {
  verfuegbar: boolean; freitische: number; gesamttische: number
  defekttische: number; ueberlappende_reservierungen: number
  naechste_slots: NaechsterSlot[] | null
}

// ── Spielart → accent color ───────────────────────────────────────────────────
const ACCENTS: Record<string, { hex: string; glow: string; dark: string }> = {
  Pool:        { hex: '#10b981', glow: 'rgba(16,185,129,0.3)',  dark: 'rgba(16,185,129,0.08)'  },
  Snooker:     { hex: '#f59e0b', glow: 'rgba(245,158,11,0.3)', dark: 'rgba(245,158,11,0.08)'  },
  Darts:       { hex: '#f97316', glow: 'rgba(249,115,22,0.3)', dark: 'rgba(249,115,22,0.08)'  },
  Tischtennis: { hex: '#3b82f6', glow: 'rgba(59,130,246,0.3)', dark: 'rgba(59,130,246,0.08)'  },
  Kicker:      { hex: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', dark: 'rgba(139,92,246,0.08)'  },
  Gastro:      { hex: '#ec4899', glow: 'rgba(236,72,153,0.3)', dark: 'rgba(236,72,153,0.08)'  },
}
const DEFAULT_ACCENT = { hex: '#6366f1', glow: 'rgba(99,102,241,0.25)', dark: 'rgba(99,102,241,0.08)' }

// ── Spielart options ──────────────────────────────────────────────────────────
const SPIELARTEN = [
  { label: 'Pool',    value: 'Pool'        },
  { label: 'Snooker', value: 'Snooker'     },
  { label: 'Dart',    value: 'Darts'       },
  { label: 'TT',      value: 'Tischtennis' },
  { label: 'Kicker',  value: 'Kicker'      },
  { label: 'Gastro',  value: 'Gastro'      },
]
const FLOORS = ['EG', 'UG', 'VRA'] as const

// ── Time helpers ──────────────────────────────────────────────────────────────
function buildTimeOptions(startMin: number, endMin: number) {
  const opts: string[] = []
  for (let m = startMin; m <= endMin; m += 15)
    opts.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  return opts
}
const START_OPTIONS = buildTimeOptions(14 * 60, 23 * 60)
const END_OPTIONS   = buildTimeOptions(14 * 60 + 15, 23 * 60)
function hhmm(min: number) { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}` }
function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// ── Shared input style ────────────────────────────────────────────────────────
const INPUT = 'w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors'
const LABEL = 'text-[10px] font-semibold tracking-[0.12em] uppercase text-white/40 mb-1 block'

interface Props { initialDate: string; onClose: () => void; onSuccess: () => void }

export function QuickCheckModal({ initialDate, onClose, onSuccess }: Props) {
  // ── State (logic unchanged) ─────────────────────────────────────────────────
  const [datum,       setDatum]       = useState(initialDate)
  const [startzeit,   setStartzeit]   = useState('18:00')
  const [endzeit,     setEndzeit]     = useState('20:00')
  const [spielart,    setSpielart]    = useState('')
  const [tischanzahl, setTischanzahl] = useState(1)
  const [floors,      setFloors]      = useState<string[]>(['EG'])
  const [openEnd,     setOpenEnd]     = useState(false)
  const [kunde,       setKunde]       = useState('')
  const [telefon,     setTelefon]     = useState('')
  const [personen,    setPersonen]    = useState('2')
  const [bemerkung,   setBemerkung]   = useState('')
  const [result,        setResult]        = useState<VerfuegbarkeitAntwort | null>(null)
  const [checking,      setChecking]      = useState(false)
  const [booking,       setBooking]       = useState(false)
  const [checkError,    setCheckError]    = useState<string | null>(null)
  const [bookingError,  setBookingError]  = useState<string | null>(null)
  const [bereiceToast,  setBereiceToast]  = useState(false)
  const [successToast,  setSuccessToast]  = useState(false)
  const [multiFloorWarn,setMultiFloorWarn]= useState(false)
  const slotClickedRef = useRef(false)

  // ── Accent color ─────────────────────────────────────────────────────────────
  const accent = spielart ? (ACCENTS[spielart] ?? DEFAULT_ACCENT) : DEFAULT_ACCENT

  // ── Derived ──────────────────────────────────────────────────────────────────
  const startMin = toMin(startzeit)
  const openEndDisabled = startMin > 20 * 60
  const effectiveEndzeit = openEnd && !openEndDisabled ? hhmm(Math.min(startMin + 180, 23 * 60)) : endzeit

  useEffect(() => { if (openEndDisabled && openEnd) setOpenEnd(false) }, [openEndDisabled, openEnd])
  useEffect(() => { if (floors.length === 1) setMultiFloorWarn(false) }, [floors])

  const handleStartChange = (newStart: string) => {
    const dur = toMin(endzeit) - toMin(startzeit)
    const ns  = toMin(newStart)
    setStartzeit(newStart)
    setEndzeit(hhmm(Math.min(ns + dur, 23 * 60)))
  }

  const toggleFloor = (floor: string) => {
    if (floors.includes(floor) && floors.length === 1) {
      setBereiceToast(true); setTimeout(() => setBereiceToast(false), 2000); return
    }
    setFloors(prev => prev.includes(floor) ? prev.filter(f => f !== floor) : [...prev, floor])
  }

  const runCheck = useCallback(async (overrideStart?: string, overrideEnd?: string) => {
    if (!spielart) return
    setChecking(true); setCheckError(null)
    if (floors.length > 1) setMultiFloorWarn(true)
    try {
      const res = await fetch('/api/availability/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PIN': getPin() },
        body: JSON.stringify({ datum, startzeit: overrideStart ?? startzeit, endzeit: overrideEnd ?? effectiveEndzeit, spielart, floors, tischanzahl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: { detail: `HTTP ${res.status}` } }))
        setCheckError(typeof err.detail === 'object' ? err.detail.detail : err.detail ?? 'Fehler beim Prüfen')
        setResult(null)
      } else {
        setResult(await res.json())
        setKunde(''); setTelefon(''); setPersonen('2'); setBemerkung(''); setBookingError(null)
      }
    } catch { setCheckError('Verbindungsfehler'); setResult(null) }
    finally { setChecking(false) }
  }, [datum, startzeit, effectiveEndzeit, spielart, floors, tischanzahl])

  useEffect(() => {
    if (!slotClickedRef.current) return
    slotClickedRef.current = false
    runCheck(startzeit, endzeit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startzeit, endzeit])

  const handleSlotClick = (slot: NaechsterSlot) => {
    slotClickedRef.current = true; setStartzeit(slot.startzeit); setEndzeit(slot.endzeit); setOpenEnd(false)
  }

  const handleBook = async () => {
    if (!kunde.trim()) return
    setBooking(true); setBookingError(null)
    try {
      const standort = floors.length === 1 ? floors[0] : ''
      await reservationApi.create({ datum, startzeit, endzeit: effectiveEndzeit, art: spielart, tischanzahl, kunde: kunde.trim(), telefon: telefon || null, personen, bemerkung: bemerkung || null, standort })
      setSuccessToast(true)
      setTimeout(() => { onSuccess(); onClose() }, 800)
    } catch (e) { setBookingError((e as ApiError)?.detail ?? 'Fehler beim Erstellen') }
    finally { setBooking(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,14,28,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6), 0 0 60px ${accent.glow}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent top bar */}
        <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent.hex}, transparent)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent.dark, border: `1px solid ${accent.hex}33` }}>
              <Zap size={15} style={{ color: accent.hex }} />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Verfügbarkeit prüfen</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">

          {/* DATUM */}
          <div>
            <label className={LABEL}>Datum</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className={INPUT} />
          </div>

          {/* STARTZEIT / ENDZEIT */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Startzeit</label>
              <select value={startzeit} onChange={e => handleStartChange(e.target.value)} className={INPUT}>
                {START_OPTIONS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>
                Endzeit {openEnd && !openEndDisabled && <span className="text-white/20 normal-case">(ca. 3h)</span>}
              </label>
              <select value={effectiveEndzeit} disabled={openEnd && !openEndDisabled} onChange={e => setEndzeit(e.target.value)} className={INPUT + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
                {END_OPTIONS.map(t => <option key={t} value={t} disabled={toMin(t) <= toMin(startzeit)} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
          </div>

          {/* OPEN END */}
          <label className={`flex items-center gap-2.5 text-sm cursor-pointer select-none ${openEndDisabled ? 'opacity-30 cursor-not-allowed' : 'text-white/60 hover:text-white/80'} transition-colors`}>
            <input type="checkbox" checked={openEnd} disabled={openEndDisabled} onChange={e => setOpenEnd(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: accent.hex }} />
            Open End
          </label>

          {/* SPIELART — pill grid */}
          <div>
            <label className={LABEL}>Spielart</label>
            <div className="grid grid-cols-3 gap-2">
              {SPIELARTEN.map(s => {
                const active = spielart === s.value
                const a = ACCENTS[s.value] ?? DEFAULT_ACCENT
                return (
                  <button
                    key={s.value}
                    id={`spielart-${s.value}`}
                    onClick={() => { setSpielart(s.value); setResult(null) }}
                    className="py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200"
                    style={active ? {
                      background: a.dark,
                      border: `1px solid ${a.hex}66`,
                      color: a.hex,
                      boxShadow: `0 0 14px ${a.glow}`,
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TISCHANZAHL */}
          <div>
            <label className={LABEL}>Tischanzahl</label>
            <input
              type="number" min={1} value={tischanzahl}
              onChange={e => setTischanzahl(Math.max(1, parseInt(e.target.value) || 1))}
              className={INPUT + ' w-24'}
            />
          </div>

          {/* BEREICHE — pill buttons */}
          <div>
            <label className={LABEL}>Bereiche</label>
            <div className="flex gap-2">
              {FLOORS.map(f => {
                const active = floors.includes(f)
                return (
                  <button
                    key={f}
                    id={`bereiche-${f}`}
                    onClick={() => toggleFloor(f)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                    style={active ? {
                      background: accent.dark,
                      border: `1px solid ${accent.hex}55`,
                      color: accent.hex,
                      boxShadow: `0 0 16px ${accent.glow}`,
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
            {bereiceToast && (
              <p className="text-[11px] mt-1.5" style={{ color: '#fbbf24' }}>
                Mindestens ein Bereich muss ausgewählt sein
              </p>
            )}
          </div>

          {/* CTA BUTTON */}
          <button
            id="quick-check-btn"
            onClick={() => runCheck()}
            disabled={!spielart || checking}
            className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: spielart ? `linear-gradient(135deg, ${accent.hex}cc, ${accent.hex})` : 'rgba(255,255,255,0.06)',
              color: '#fff',
              boxShadow: spielart && !checking ? `0 4px 24px ${accent.glow}` : 'none',
              border: `1px solid ${spielart ? accent.hex + '44' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {checking
              ? <><Loader2 size={15} className="animate-spin" /> Prüfen…</>
              : <><Zap size={14} /> Verfügbarkeit prüfen</>}
          </button>

          {/* MULTI-FLOOR WARNING toast */}
          {multiFloorWarn && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: '#fcd34d' }}>
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span className="flex-1 text-xs leading-relaxed">
                Mehrere Bereiche ausgewählt — die Reservierung wird keinem Bereich zugewiesen. Bitte den Tisch beim Drag &amp; Drop manuell zuweisen.
              </span>
              <button onClick={() => setMultiFloorWarn(false)} className="shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold transition-colors hover:bg-amber-500/20" style={{ color: '#fbbf24' }}>
                OK
              </button>
            </div>
          )}

          {/* CHECK ERROR */}
          {checkError && (
            <div className="text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              {checkError}
            </div>
          )}

          {/* ── RESULT ── */}
          {result && (
            <div className="flex flex-col gap-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', animation: 'slideIn 0.25s ease' }}>

              <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

              {result.verfuegbar ? (
                <>
                  {/* POSITIVE */}
                  <div className="rounded-xl px-4 py-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 0 24px rgba(16,185,129,0.08)' }}>
                    <div className="flex items-center gap-2.5 font-bold" style={{ color: '#34d399' }}>
                      <CheckCircle2 size={18} />
                      <span>{result.freitische} von {result.gesamttische} Tischen verfügbar</span>
                    </div>
                    <p className="text-xs mt-1 ml-[26px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {result.ueberlappende_reservierungen} belegt · {result.defekttische} defekt
                    </p>
                  </div>

                  {/* BOOKING FORM */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className={LABEL}>Kunde (Name) *</label>
                      <input id="qc-kunde" type="text" value={kunde} onChange={e => setKunde(e.target.value)} placeholder="Pflichtfeld" className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Telefon (opt.)</label>
                        <input id="qc-telefon" type="tel" value={telefon} onChange={e => setTelefon(e.target.value)} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Personen</label>
                        <input id="qc-personen" type="number" min={1} value={personen} onChange={e => setPersonen(e.target.value)} className={INPUT} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Bemerkung (opt.)</label>
                      <textarea id="qc-bemerkung" value={bemerkung} onChange={e => setBemerkung(e.target.value)} rows={2} className={INPUT + ' resize-none'} />
                    </div>
                    {bookingError && <p className="text-xs" style={{ color: '#fca5a5' }}>{bookingError}</p>}
                    <button
                      id="qc-reservierung-erstellen"
                      onClick={handleBook}
                      disabled={!kunde.trim() || booking}
                      className="w-full py-3 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,1))',
                        border: '1px solid rgba(16,185,129,0.4)',
                        color: '#fff',
                        boxShadow: kunde.trim() ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
                      }}
                    >
                      {booking ? <><Loader2 size={15} className="animate-spin" /> Erstellen…</> : '✓ Reservierung erstellen'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* NEGATIVE */}
                  <div className="rounded-xl px-4 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 0 24px rgba(239,68,68,0.06)' }}>
                    <div className="flex items-center gap-2.5 font-bold" style={{ color: '#f87171' }}>
                      <XCircle size={18} />
                      <span>Keine ausreichende Kapazität</span>
                    </div>
                    <p className="text-xs mt-1 ml-[26px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Nur {result.freitische} von {result.gesamttische} Tischen verfügbar
                    </p>
                  </div>

                  {result.naechste_slots && result.naechste_slots.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <Clock size={12} />
                        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase">Nächste freie Zeiten</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {result.naechste_slots.map((slot, i) => (
                          <button
                            key={i}
                            id={`qc-slot-${i}`}
                            onClick={() => handleSlotClick(slot)}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 group"
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget
                              el.style.background = accent.dark
                              el.style.borderColor = accent.hex + '55'
                              el.style.boxShadow = `0 0 12px ${accent.glow}`
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget
                              el.style.background = 'rgba(255,255,255,0.03)'
                              el.style.borderColor = 'rgba(255,255,255,0.08)'
                              el.style.boxShadow = 'none'
                            }}
                          >
                            <span className="text-sm text-white font-medium">{slot.startzeit} Uhr</span>
                            <span className="text-xs font-bold" style={{ color: '#34d399' }}>{slot.freitische} →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-center py-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Heute komplett ausgebucht</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-bold shadow-xl z-[70] flex items-center gap-2"
          style={{ background: 'rgba(16,185,129,0.9)', backdropFilter: 'blur(12px)', color: '#fff', boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>
          ✓ Reservierung erstellt
        </div>
      )}
    </div>
  )
}
