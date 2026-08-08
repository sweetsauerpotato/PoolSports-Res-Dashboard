/**
 * Reservation API service — communicates with the new /api/reservations endpoints.
 * Sends X-PIN header from sessionStorage (stored at login).
 */

import { getPin } from '../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || ''

function authHeaders(): Record<string, string> {
  return { 'X-PIN': getPin(), 'Content-Type': 'application/json' }
}

export interface Reservation {
  id: string
  datum: string
  startzeit: string
  endzeit: string
  kunde: string
  telefon: string | null
  art: string
  personen: string
  standort: string
  csv_file: string
  tisch_id: string | null
  tisch_ids: string[]          // multi-table: full array of assigned table IDs
  tischanzahl: number          // how many tables this group needs (default 1)
  status: string
  bemerkung: string | null
  erstellt_am: string
  erstellt_von: string
}

export interface ReservationCreatePayload {
  datum: string
  startzeit: string
  endzeit: string
  kunde: string
  telefon: string | null
  art: string
  personen: string
  standort: string
  bemerkung: string | null
  tischanzahl: number
}

export interface MonthResponse {
  month: string
  reservations: Reservation[]
  count_per_day: Record<string, number>
}

export interface ApiError {
  detail: string
  field: string | null
  error_code: string
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let err: ApiError | undefined;
    try {
      err = await res.json();
    } catch {
      // Mapping for staff-friendly terminology
      const msg = res.status === 500 
        ? "Schwerer Serverfehler (500). Bitte Administrator kontaktieren."
        : `HTTP ${res.status}`;
      err = { detail: msg, field: null, error_code: 'INTERNAL_ERROR' };
    }
    
    // Safely extract string detail if backend returns Pydantic 422 JSON array
    const rawErr: any = err;
    if (rawErr && typeof rawErr.detail !== 'string' && rawErr.detail !== null && rawErr.detail !== undefined) {
      if (Array.isArray(rawErr.detail) && rawErr.detail[0]?.msg) {
        err!.detail = rawErr.detail[0].msg;
      } else {
        err!.detail = JSON.stringify(rawErr.detail);
      }
    }
    
    throw err as ApiError;
  }
  return res.json() as Promise<T>
}

export const reservationApi = {
  /** GET /api/reservations?month=YYYY-MM */
  getMonth: (month: string): Promise<MonthResponse> =>
    fetch(`${API_BASE}/api/reservations?month=${month}`).then((r) => handleResponse<MonthResponse>(r)),

  /** GET /api/reservations/{id} */
  getOne: (id: string): Promise<Reservation> =>
    fetch(`${API_BASE}/api/reservations/${id}`).then((r) => handleResponse<Reservation>(r)),

  /** POST /api/reservations */
  create: (data: ReservationCreatePayload): Promise<{ id: string; status: string; meldung: string }> =>
    fetch(`${API_BASE}/api/reservations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<{ id: string; status: string; meldung: string }>(r)),

  /** PUT /api/reservations/{id} */
  update: (id: string, data: Partial<Reservation>): Promise<Reservation> =>
    fetch(`${API_BASE}/api/reservations/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Reservation>(r)),

  /** DELETE /api/reservations/{id} */
  delete: (id: string): Promise<{ geloescht: boolean; id: string }> =>
    fetch(`${API_BASE}/api/reservations/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then((r) => handleResponse<{ geloescht: boolean; id: string }>(r)),
}
