import { cn } from '../../utils/cn'
import { useUiStore } from '../../store/uiStore'
import { TableType, TableStatus } from '../../types'

const TYPE_OPTIONS: { label: string; value: TableType | null }[] = [
    { label: 'Alle', value: null },
    { label: 'Pool', value: TableType.Pool },
    { label: 'Snooker', value: TableType.Snooker },
    { label: 'Darts', value: TableType.Dart },
    { label: 'Tischtennis', value: TableType.TT },
    { label: 'Kicker', value: TableType.Kicker },
    { label: 'Gastro', value: TableType.Gastro },
]

const STATUS_OPTIONS: { label: string; value: TableStatus | 'belres' | null; color: string }[] = [
    { label: 'Alle', value: null, color: 'bg-gray-700 text-gray-200' },
    { label: 'Frei', value: TableStatus.Frei, color: 'bg-emerald-700 text-emerald-100' },
    { label: 'Reserviert', value: TableStatus.Reserviert, color: 'bg-yellow-600 text-yellow-100' },
    { label: 'Belegt', value: TableStatus.Belegt, color: 'bg-red-700 text-red-100' },
    { label: 'BelRes', value: 'belres', color: 'bg-yellow-800 text-yellow-200' },
    { label: 'Defekt', value: TableStatus.Defekt, color: 'bg-gray-500 text-gray-200' },
]

export function BoardFilters() {
    const filterType = useUiStore((s) => s.filterType)
    const filterStatus = useUiStore((s) => s.filterStatus)
    const setFilterType = useUiStore((s) => s.setFilterType)
    const setFilterStatus = useUiStore((s) => s.setFilterStatus)

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1 bg-gray-900 border-b border-gray-800">
            {/* Type filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Art</span>
                {TYPE_OPTIONS.map((opt) => (
                    <button
                        key={String(opt.value)}
                        onClick={() => setFilterType(opt.value)}
                        className={cn(
                            'px-2 py-0.5 rounded-full text-[11px] font-medium transition-all min-h-[26px]',
                            filterType === opt.value
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className="w-px h-5 bg-gray-700 hidden sm:block" />

            {/* Status filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Status</span>
                {STATUS_OPTIONS.map((opt) => (
                    <button
                        key={String(opt.value)}
                        onClick={() => setFilterStatus(opt.value)}
                        className={cn(
                            'px-2 py-0.5 rounded-full text-[11px] font-medium transition-all min-h-[26px]',
                            filterStatus === opt.value
                                ? opt.color + ' ring-2 ring-white/30'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Clear filters */}
            {(filterType !== null || filterStatus !== null) && (
                <button
                    onClick={() => { setFilterType(null); setFilterStatus(null) }}
                    className="ml-auto text-[11px] text-gray-500 hover:text-gray-300 underline transition-colors"
                >
                    Zurücksetzen
                </button>
            )}
        </div>
    )
}
