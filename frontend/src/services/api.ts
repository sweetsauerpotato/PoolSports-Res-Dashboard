import { getPin } from '../utils/auth'

const BASE = import.meta.env.VITE_API_URL || ''

async function request(method: string, path: string, body?: unknown, pin?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (pin) headers['X-PIN'] = pin
  const opts: RequestInit = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(detail)
  }
  return res.json()
}

export const api = {
  getState: () => request('GET', '/api/state'),

  verifyPin: (pin: string) => request('POST', '/api/verify-pin', { pin }),

  assign: (reservation_id: string, table_id: string, standort?: string) =>
    request('POST', '/api/assign', { reservation_id, table_id, standort }, getPin()),

  assignMulti: (reservation_id: string, table_ids: string[], standort?: string) =>
    request('POST', '/api/assign', { reservation_id, table_ids, standort }, getPin()),

  unassign: (reservation_id: string) =>
    request('POST', '/api/unassign', { reservation_id }, getPin()),

  updateTableStatus: (tableId: string, status: string, guest?: string, reservationId?: string) =>
    request('PUT', `/api/tables/${tableId}/status`, { status, guest, reservation_id: reservationId }, getPin()),

  noShow: (reservation_id: string) =>
    request('POST', '/api/no-show', { reservation_id }, getPin()),

  undoStatus: (reservation_id: string) =>
    request('POST', '/api/undo-status', { reservation_id }, getPin()),

  defekt: (table_id: string, defekt: boolean) =>
    request('POST', '/api/defekt', { table_id, defekt }, getPin()),

  walkIn: (tableId: string) =>
    request('POST', `/api/walk-in/${tableId}`, undefined, getPin()),

  neuerTag: () => request('POST', '/api/neuer-tag', undefined, getPin()),

  uploadCsv: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const headers: Record<string, string> = {}
    const pin = getPin()
    if (pin) headers['X-PIN'] = pin
    const res = await fetch(`${BASE}/api/upload-csv`, { method: 'POST', body: form, headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  deleteCsv: (filename: string) =>
    request('POST', '/api/delete-csv', { filename }, getPin()),
}

