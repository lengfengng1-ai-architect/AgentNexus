import { useCallback, useMemo, useRef, useState, useEffect, type KeyboardEvent } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (imageUrls?: string[]) => void
  disabled?: boolean
}

/** Normalize a single URL row: keep as-is if empty, trim whitespace, validate http/https */
function normalizeUrl(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : ''
}

/** Icon button inside the floating plus menu */
function MenuBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[10px] text-track/60">{label}</span>
    </button>
  )
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showAttach, setShowAttach] = useState(false)
  const [urlRows, setUrlRows] = useState<string[]>([''])
  const [showMenu, setShowMenu] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const menuAreaRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const valueRef = useRef(value)

  const imageUrls = useMemo(() =>
    urlRows.map(normalizeUrl).filter(Boolean),
    [urlRows],
  )

  useEffect(() => { valueRef.current = value }, [value])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  // ── Click outside to close floating menu ──────────────────────────
  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuAreaRef.current && !menuAreaRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  // ── Cleanup speech recognition on unmount ─────────────────────────
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  // ── Toast helper ──────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2500)
  }, [])

  // ── URL row handlers (unchanged) ────────────────────────────────
  const handleUrlRowChange = useCallback((index: number, val: string) => {
    setUrlRows(prev => {
      const next = [...prev]
      next[index] = val
      if (index === next.length - 1 && normalizeUrl(val)) {
        if (next.length < 9) next.push('')
      }
      return next
    })
  }, [])

  const removeUrlRow = useCallback((index: number) => {
    setUrlRows(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next.length === 0 ? [''] : next
    })
  }, [])

  const handleUrlRowPaste = useCallback((index: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\n') && !text.includes(',')) return
    const urls = text
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http://') || s.startsWith('https://'))
    if (urls.length <= 1) return
    e.preventDefault()
    setUrlRows(prev => {
      const next = [...prev]
      next[index] = urls[0]
      next.splice(index + 1, 0, ...urls.slice(1), '')
      return next
    })
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const urls = imageUrls.length > 0 ? imageUrls : undefined
    onSend(urls)
    setShowAttach(false)
    setUrlRows([''])
  }

  function toggleAttach() {
    setShowAttach(prev => {
      if (prev) setUrlRows([''])
      return !prev
    })
  }

  // ── Plus button ───────────────────────────────────────────────
  const handlePlusClick = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      setShowMenu(prev => !prev)
    }
  }, [isListening])

  // ── 📎附件 ─────────────────────────────────────────────────────
  const handleAttachClick = useCallback(() => {
    toggleAttach()
    setShowMenu(false)
  }, [])

  // ── 📋方案 ─────────────────────────────────────────────────────
  const handlePrefillTemplate = useCallback(() => {
    const template = '我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月'
    onChange(template)
    setShowMenu(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [onChange])

  // ── 💬语音 ─────────────────────────────────────────────────────
  const handleVoice = useCallback(() => {
    setShowMenu(false)
    const API: new () => SpeechRecognition =
      (window as unknown as { SpeechRecognition: new () => SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition

    if (!API) {
      showToast('当前浏览器不支持语音识别')
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const recognition = new API()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript
        }
      }
      if (finalText) {
        const cur = valueRef.current
        onChange(cur + (cur ? ' ' : '') + finalText)
      }
    }

    recognition.onend = () => setIsListening(false)

    recognition.onerror = () => {
      setIsListening(false)
      showToast('语音识别出错，请重试')
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [isListening, onChange, showToast])

  // ── 占位按钮（制图/数据） ──────────────────────────────────────
  const showPlaceholderToast = useCallback(() => {
    setShowMenu(false)
    showToast('功能开发中，敬请期待')
  }, [showToast])

  return (
    <div className="border-t border-line bg-white px-4 py-3 sm:px-6 sm:py-4">
      {/* Toast */}
      {toast && (
        <div className="mx-auto mb-2 max-w-3xl">
          <div className="rounded-lg bg-track/90 px-3 py-1.5 text-center text-xs text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* 附件栏（折叠） */}
      {showAttach && (
        <div className="mx-auto mb-2 max-w-3xl space-y-2">
          {urlRows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={row}
                  onChange={e => handleUrlRowChange(i, e.target.value)}
                  onPaste={i === urlRows.length - 1 ? e => handleUrlRowPaste(i, e) : undefined}
                  disabled={disabled}
                  placeholder={i === urlRows.length - 1 ? `输入或粘贴图片 URL，自动拆分` : `图片 URL ${i + 1}`}
                  className="w-full rounded-lg border border-line bg-mist px-3 py-2 pr-10 text-xs outline-none placeholder:text-track/40 focus:border-start focus:ring-1 focus:ring-start disabled:opacity-50"
                />
                {normalizeUrl(row) && (
                  <ThumbnailPreview url={normalizeUrl(row)} />
                )}
              </div>
              {i < urlRows.length - 1 && (
                <button
                  type="button"
                  onClick={() => removeUrlRow(i)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-sm text-track/50 transition-colors hover:border-red-300 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {imageUrls.length > 0 && (
            <p className="text-[10px] text-track/40">已识别 {imageUrls.length} 张图片（最多 9 张）</p>
          )}
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-mist p-2 focus-within:border-start focus-within:ring-1 focus-within:ring-start">
        {/* ➕ 聚合按钮 */}
        <div className="relative" ref={menuAreaRef}>
          <button
            type="button"
            onClick={handlePlusClick}
            disabled={disabled}
            aria-label={isListening ? '停止录音' : '菜单'}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start ${
              isListening
                ? 'animate-pulse bg-red-50 text-red-500'
                : showAttach
                  ? 'bg-start/10 text-start'
                  : showMenu
                    ? 'bg-line/50 text-track/60'
                    : 'text-track/40 hover:bg-line/50 hover:text-track/60'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H5.25a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* 浮层面板 */}
          {showMenu && (
            <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[11rem] rounded-xl border border-line bg-white p-2 shadow-lg">
              <div className="grid grid-cols-3 gap-1">
                <MenuBtn icon="📎" label="附件" onClick={handleAttachClick} />
                <MenuBtn icon="🖼️" label="制图" onClick={showPlaceholderToast} />
                <MenuBtn icon="📋" label="方案" onClick={handlePrefillTemplate} />
                <MenuBtn icon="💬" label="语音" onClick={handleVoice} />
                <MenuBtn icon="📈" label="数据" onClick={showPlaceholderToast} />
              </div>
            </div>
          )}
        </div>

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
          onClick={handleSend}
          disabled={disabled || (!value.trim() && imageUrls.length === 0)}
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

/** Small inline thumbnail for a single URL input row */
function ThumbnailPreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
      {!loaded && !failed && (
        <div className="flex h-7 w-7 items-center justify-center rounded bg-mist">
          <span className="text-[8px] text-track/30">…</span>
        </div>
      )}
      {failed && (
        <div className="flex h-7 w-7 items-center justify-center rounded bg-red-50">
          <span className="text-[8px] text-red-400">×</span>
        </div>
      )}
      <img
        src={url}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-7 w-7 rounded object-cover ${loaded ? 'opacity-100' : 'hidden'}`}
        loading="eager"
      />
    </div>
  )
}
