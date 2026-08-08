import { useEffect, useRef, useCallback } from 'react'
import { useTableStore, resetDeltaSeq } from '../store/tableStore'
import { useUiStore } from '../store/uiStore'
import { AppState } from '../types'
import { persistSnapshot, loadSnapshot } from '../services/pslCache'

const apiUrl = import.meta.env.VITE_API_URL || ''
// When VITE_API_URL is set (remote/production with a domain), http→ws / https→wss
// via the replace. When not set (same-origin serving — LAN or nginx same-domain),
// derive the protocol from the page itself so a single build works under both
// plain HTTP (LAN) and HTTPS (remote) without env changes.
const WS_URL = apiUrl
  ? `${apiUrl.replace(/^http/, 'ws')}/ws`
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
const BACKOFF = [0, 1000, 2000, 4000, 8000]

export function useWebSocket() {
  // WF.1 — only reactive subscriptions here (values that re-render this hook's host component).
  // Store actions are read via getState() inside connect() so connect has no render-time deps
  // and useCallback([], []) is stable: useEffect([connect]) fires exactly once on mount.
  const isDragging = useTableStore((s) => s.isDragging)
  const reconnectTrigger = useUiStore((s) => s.reconnectTrigger)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const mountedRef = useRef(true)
  /** MD-04: buffer the latest state_update while dragging is active */
  const dragBufferRef = useRef<AppState | null>(null)
  /**
   * C2 fix: first stateupdate after every (re)connect is applied unconditionally,
   * bypassing any lastupdated guard. Protects against post-crash or post-reconnect
   * scenarios where local.last_updated (from an optimistic mutation) is ahead of
   * the server's reconstructed value, which would cause Sprint 2.4's guard to
   * silently reject the authoritative server state.
   * Starts true — the very first connection is always a forced apply.
   */
  const forceApplyRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    // WF.2: close-before-open guard.
    // Detach handlers BEFORE close() so the dying socket cannot fire onclose and
    // schedule a redundant setTimeout(connect) retry while the new socket is opening.
    const stale = wsRef.current
    if (stale) {
      stale.onclose = null
      stale.onerror = null
      stale.close()
      wsRef.current = null
    }

    useUiStore.getState().setWsStatus('reconnecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      retryRef.current = 0
      // Sprint 2.2: reset seq tracker — server resets _delta_seq on restart.
      resetDeltaSeq()
      // C2: mark the first stateupdate from this connection as forced-apply so
      // Sprint 2.4's lastupdated guard cannot silently reject post-crash server state.
      forceApplyRef.current = true
      // Do NOT set 'connected' here. A TCP handshake alone is not proof the
      // backend is reachable and communicating. Wait for the first state_update
      // message — only then declare the connection live. This prevents the
      // false-positive success banner on initial load and during WiFi flapping.
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'state_update') {
          // Sprint 2.2: Divergence detection — fires only when client last_updated is
          // AHEAD of the incoming server value. This is impossible under normal operation
          // (server processes after the client fires the optimistic mutation, so
          // server timestamp >= optimistic timestamp). If it fires, the delta stream
          // has applied something the server does not know about — genuine divergence.
          //
          // Rationale for > not !==: The backend emits stateupdate BEFORE the delta
          // (stateupdate is inside state_manager.update()). When stateupdate arrives,
          // local.last_updated is always the optimistic timestamp or the previous
          // server value — never equal to incoming. !== fires on every mutation.
          // > fires only on a real problem. This makes the 5-day monitoring gate
          // measure signal, not noise.
          const currentStatus = useUiStore.getState().wsStatus
          const local = useTableStore.getState().state
          if (currentStatus === 'connected' && local.last_updated > msg.payload.last_updated) {
            console.error(
              `[State] Divergence detected. local=${local.last_updated} server=${msg.payload.last_updated}`
            )
          }
          // Declare connected only after the backend has delivered real data.
          // Calling set() with the same value is a no-op in Zustand — safe to
          // call on every message.
          useUiStore.getState().setWsStatus('connected')
          useUiStore.getState().setCacheHealthy(true)
          const payload = msg.payload as AppState
          // C2: read and immediately clear the force-apply flag.
          // isForced is true for the first stateupdate after every (re)connect.
          // ── Sprint 2.4 integration point ──────────────────────────────────────────────
          // When Sprint 2.4 adds the lastupdated guard, wrap the replaceState block:
          //   if (isForced || payload.last_updated > useTableStore.getState().state.last_updated)
          // During the parallel phase the guard does not exist — stateupdate always applies.
          const isForced = forceApplyRef.current
          forceApplyRef.current = false
          void isForced // used by Sprint 2.4 guard — do not remove
          if (useTableStore.getState().isDragging) {
            // MD-04: buffer during active drag
            dragBufferRef.current = payload
          } else {
            useTableStore.getState().replaceState(payload)
          }
        } else if (msg.type === 'tableStatusChanged') {
          useTableStore.getState().applyTableStatusChanged(msg.payload)
        } else if (msg.type === 'reservationAssigned') {
          useTableStore.getState().applyReservationAssigned(msg.payload)
        } else if (msg.type === 'timerStarted') {
          useTableStore.getState().applyTimerStarted(msg.payload)
        }
      } catch (e) {
        console.error('WS parse error', e)
      }
    }

    ws.onclose = () => {
      // Stale-closure guard: if this socket has already been superseded by a new
      // connection (reconnectTrigger, StrictMode remount, or manual close), do NOT
      // schedule another retry — a live connection already exists.
      if (ws !== wsRef.current) return
      if (!mountedRef.current) return

      useUiStore.getState().setWsStatus('disconnected')

      // Sprint 1.2 — read path: load last known state from IndexedDB.
      // If null (empty or read error), setCacheHealthy(false) is called
      // inside loadSnapshot() and the no-cache banner variant is shown.
      loadSnapshot().then((cached) => {
        if (cached) {
          useTableStore.getState().replaceState(cached)
        }
        // cached === null means setCacheHealthy(false) already called inside loadSnapshot
      })

      const delay = BACKOFF[Math.min(retryRef.current, BACKOFF.length - 1)]
      retryRef.current++
      // Capturing connect (a stable useCallback ref) inside setTimeout is intentional.
      // The ref is stable (WF.1 empty deps), so there is no stale-closure risk here.
      setTimeout(connect, delay ?? 8000)
    }

    ws.onerror = () => {
      ws.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // WF.1: empty deps — all actions read via getState() at call time; reference is permanently stable

  useEffect(() => {
    if (reconnectTrigger > 0) {
      // WF.3: connect() closes any existing socket internally via the WF.2 guard.
      // The previous explicit wsRef.current?.close() here was redundant dead code
      // and a latent bug (called close() without nulling onclose first).
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectTrigger]) // connect is stable (WF.1 empty deps) — intentionally omitted

  // MD-04: flush buffered state when drag ends
  useEffect(() => {
    if (!isDragging && dragBufferRef.current) {
      // WF.1: read via getState() — replaceState is a stable Zustand action, omitted from deps
      useTableStore.getState().replaceState(dragBufferRef.current)
      dragBufferRef.current = null
    }
  }, [isDragging])

  useEffect(() => {
    mountedRef.current = true
    connect()

    // Sprint 1.2 — write path: persist Zustand snapshot every 30 s.
    // Never called from the WS message handler (GC pressure on low-RAM hardware).
    const intervalId = setInterval(persistSnapshot, 30_000)

    return () => {
      mountedRef.current = false
      // WF.2: detach handlers before closing so onclose cannot schedule a retry
      // after this component has been torn down (StrictMode cleanup or real unmount).
      const dying = wsRef.current
      if (dying) {
        dying.onclose = null
        dying.onerror = null
        dying.close()
      }
      clearInterval(intervalId)
    }
  }, [connect])
}
