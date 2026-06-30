import { useRef, useEffect, type KeyboardEvent } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <div className="border-t border-line bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-mist p-2 focus-within:border-start focus-within:ring-1 focus-within:ring-start">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="输入你的需求…"
          className="max-h-40 min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-track/40 sm:text-base"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="发送"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-start text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.941l18.444-7.5a.75.75 0 0 0 0-1.388L3.478 2.404Z" />
          </svg>
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-track/40 sm:text-xs">
        Enter 发送，Shift + Enter 换行
      </p>
    </div>
  )
}
