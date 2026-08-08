import { useEffect, useRef, useState } from 'react'
import { useUiStore } from '../../store/uiStore'
import { Wifi, WifiOff, RefreshCw, DatabaseZap } from 'lucide-react'
import { cn } from '../../utils/cn'

export function ConnectionBanner() {
    const wsStatus = useUiStore((s) => s.wsStatus)
    const cacheHealthy = useUiStore((s) => s.cacheHealthy)
    const [showSuccess, setShowSuccess] = useState(false)
    const [prevStatus, setPrevStatus] = useState(wsStatus)

    // Track whether we actually went through 'disconnected' state.
    // Without this, the success banner fires on every initial page load:
    //   store default 'connected' → connect() sets 'reconnecting' → first message
    //   sets 'connected' → prevStatus('reconnecting') !== 'connected' → showSuccess=true
    // That is wrong. "Verbindung wiederhergestellt" must only appear after a real outage.
    const everDisconnectedRef = useRef(false)

    useEffect(() => {
        if (wsStatus === 'disconnected') {
            everDisconnectedRef.current = true
        }

        if (
            everDisconnectedRef.current &&
            prevStatus !== 'connected' &&
            wsStatus === 'connected'
        ) {
            everDisconnectedRef.current = false
            setShowSuccess(true)
            const t = setTimeout(() => setShowSuccess(false), 3000)
            setPrevStatus(wsStatus)
            return () => clearTimeout(t)
        }

        setPrevStatus(wsStatus)
    }, [wsStatus, prevStatus])

    if (wsStatus === 'connected' && !showSuccess) return null

    // ── Offline — determine which variant to show ─────────────────────────────
    const isDisconnected = wsStatus === 'disconnected'
    const noCacheOffline = isDisconnected && !cacheHealthy

    return (
        <div
            className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-500',
                wsStatus === 'connected' && showSuccess
                    ? 'bg-emerald-700 text-emerald-100'
                    : wsStatus === 'reconnecting'
                        ? 'bg-yellow-600 text-yellow-100'
                        : noCacheOffline
                            ? 'bg-red-900 text-red-100'
                            : 'bg-red-800 text-red-100',
            )}
        >
            {wsStatus === 'connected' && showSuccess ? (
                <>
                    <Wifi size={16} />
                    <span>Verbindung wiederhergestellt</span>
                </>
            ) : wsStatus === 'reconnecting' ? (
                <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Verbindung unterbrochen — Neuverbindung...</span>
                </>
            ) : noCacheOffline ? (
                <>
                    <DatabaseZap size={16} />
                    <span>Offline — Kein Cache verfügbar</span>
                </>
            ) : (
                <>
                    <WifiOff size={16} />
                    <span>Offline — Nur Ansicht</span>
                </>
            )}
        </div>
    )
}
