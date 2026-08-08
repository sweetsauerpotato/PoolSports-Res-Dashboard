import { useEffect, useRef, ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
    open: boolean
    title: string
    body: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    confirmDanger?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    open,
    title,
    body,
    confirmLabel = 'Bestätigen',
    cancelLabel = 'Abbrechen',
    confirmDanger = false,
    onConfirm,
    onCancel,
}: Props) {
    const confirmRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (open) confirmRef.current?.focus()
    }, [open])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in"
            onClick={onCancel}
        >
            <div
                className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 text-sm text-gray-300 leading-relaxed">{body}</div>

                {/* Actions */}
                <div className="flex gap-3 p-4 pt-2 border-t border-gray-700">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${confirmDanger
                                ? 'bg-red-700 hover:bg-red-600'
                                : 'bg-blue-600 hover:bg-blue-500'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
