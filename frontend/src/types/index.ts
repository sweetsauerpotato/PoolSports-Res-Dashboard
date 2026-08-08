export enum TableType {
  Pool = 'Pool',
  Snooker = 'Snooker',
  Dart = 'Dart',
  TT = 'TT',
  Kicker = 'Kicker',
  Gastro = 'Gastro',
  Tresen = 'Tresen',
  Lounge = 'Lounge',
}

export enum TableStatus {
  Frei = 'frei',
  Reserviert = 'reserviert',
  Belegt = 'belegt',
  Defekt = 'defekt',
}

export enum Floor {
  EG = 'EG',
  UG = 'UG',
  VRA = 'VRA',
}

export enum Role {
  Staff = 'staff',
  Admin = 'admin',
}

export interface TableDefinition {
  id: string
  type: TableType
  floor: Floor
  label: string
  gridRow: number
  gridCol: number
  colSpan?: number
  rowSpan?: number
}

export interface TableState {
  status: TableStatus
  reservationId: string | null
  guest: string | null
  occupiedSince: string | null
  isGhost?: boolean
}

export interface Reservation {
  id: string
  datum: string
  startzeit: string
  endzeit: string
  kunde: string
  telefon?: string | null
  art: string
  personen: string | number
  standort: string
  csv_file?: string
  tisch_id: string | null
  tisch_ids?: string[]          // multi-table: full array of assigned table IDs
  tischanzahl?: number          // how many tables this group needs (default 1)
  status: string
  bemerkung?: string | null
  erstellt_am?: string
  erstellt_von?: string
}

export interface CsvFile {
  filename: string
  uploaded_at: string
  row_count: number
}

export interface AppState {
  version: string
  date: string
  reservations: Record<string, Reservation>
  csv_files: CsvFile[]
  table_sessions: Record<string, TableState>
  tables_defekt: string[]
  last_updated: string
}
