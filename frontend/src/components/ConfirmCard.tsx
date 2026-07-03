import type { ReactNode } from 'react'

interface ConfirmCardProps {
  title: string
  children: ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

export function ConfirmCard({
  title,
  children,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
}: ConfirmCardProps) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-blue-800">{title}</h3>
      <div className="mb-3 text-sm">{children}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
        >
          {confirmText}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {cancelText}
        </button>
      </div>
    </div>
  )
}
