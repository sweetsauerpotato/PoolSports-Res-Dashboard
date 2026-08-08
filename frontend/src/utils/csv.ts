import Papa from 'papaparse'
import { Reservation } from '../types'

const REQUIRED_COLUMNS = ['Kunde', 'Personen', 'Art', 'Standort', 'Startzeit', 'Endzeit', 'Bemerkung']

interface ParseResult {
  reservations: Reservation[]
  errors: string[]
}

export function parseCsvText(text: string, filename: string): ParseResult {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })

  const errors: string[] = []
  const headers = result.meta.fields ?? []

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.some((h) => h.toLowerCase() === col.toLowerCase())) {
      errors.push(`Spalte "${col}" fehlt`)
    }
  }
  if (errors.length > 0) return { reservations: [], errors }

  const reservations: Reservation[] = []
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i] as Record<string, string>
    const kunde = (row['Kunde'] ?? '').trim()
    if (!kunde) {
      errors.push(`Zeile ${i + 2}: Kunde fehlt`)
      continue
    }
    reservations.push({
      id: `r-${filename}-${i}`,
      datum: (row['Datum'] ?? '').trim(),
      kunde,
      personen: (row['Personen'] ?? '').trim(),
      art: (row['Art'] ?? '').trim(),
      standort: (row['Standort'] ?? '').trim(),
      startzeit: (row['Startzeit'] ?? '').trim(),
      endzeit: (row['Endzeit'] ?? '').trim(),
      bemerkung: (row['Bemerkung'] ?? '').trim() || null,
      tisch_id: null,
      tisch_ids: [],
      tischanzahl: 1,
      status: 'unassigned',
      csv_file: filename,
    })
  }

  return { reservations, errors }
}
