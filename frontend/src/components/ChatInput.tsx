import { useCallback, useRef, useState, useEffect, type KeyboardEvent } from 'react'

interface Attachment {
  id: string
  file: File
  preview: string
  type: 'image' | 'file'
  name: string
  remoteUrl?: string
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (imageUrls?: string[]) => void
  disabled?: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"']+/g
  return text.match(urlRegex) || []
}

let _attachIdSeq = 0
function genAttachId(): string {
  return `att_${Date.now().toString(36)}_${++_attachIdSeq}`
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
  const [showMenu, setShowMenu] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [sending, setSending] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const menuAreaRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const valueRef = useRef(value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentsRef = useRef(attachments)

  useEffect(() => { valueRef.current = value }, [value])
  useEffect(() => { attachmentsRef.current = attachments }, [attachments])

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

  // ── Cleanup object URLs on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview)
      })
    }
  }, [])

  // ── Toast helper ──────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2500)
  }, [])

  // ── File handlers ─────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: genAttachId(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
    }))
    setAttachments(prev => [...prev, ...newAttachments])
    // Reset so selecting the same files again triggers onChange
    e.target.value = ''
  }

  function removeAttachment(id: string) {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id)
      if (att?.preview) URL.revokeObjectURL(att.preview)
      return prev.filter(a => a.id !== id)
    })
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: genAttachId(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
    }))
    setAttachments(prev => [...prev, ...newAttachments])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  async function handleSend() {
    if (disabled || sending) return
    if (!value.trim() && attachments.length === 0) return

    setSending(true)
    try {
      // 1. Upload pending attachments
      const uploadedUrls: string[] = []
      const pending = attachments.filter(a => !a.remoteUrl)
      if (pending.length > 0) {
        const formData = new FormData()
        pending.forEach(a => formData.append('files', a.file))
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json()
        data.files.forEach((item: { url: string }, i: number) => {
          const fullUrl = item.url.startsWith('http')
            ? item.url
            : `${BACKEND_ORIGIN}${item.url}`
          uploadedUrls.push(fullUrl)
          if (pending[i]) pending[i].remoteUrl = fullUrl
        })
      }

      // 2. Collect any already-uploaded URLs (failsafe)
      attachments.forEach(a => {
        if (a.remoteUrl && !uploadedUrls.includes(a.remoteUrl)) {
          uploadedUrls.push(a.remoteUrl)
        }
      })

      // 3. Extract http/https URLs from textarea content
      const textUrls = extractUrlsFromText(value)

      // 4. Merge and send
      const allUrls = [...uploadedUrls, ...textUrls]
      onSend(allUrls.length > 0 ? allUrls : undefined)
    } catch {
      showToast('文件上传失败，请重试')
      setSending(false)
      return
    }

    // 5. Cleanup
    setShowAttach(false)
    attachments.forEach(a => {
      if (a.preview) URL.revokeObjectURL(a.preview)
    })
    setAttachments([])
    setSending(false)
  }

  function toggleAttach() {
    if (showAttach) {
      const prev = [...attachments]
      setAttachments([])
      prev.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview) })
    }
    setShowAttach(prev => !prev)
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
  }, [showAttach, attachments])

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

  // ── 📈市场分析 ──────────────────────────────────────────────────
  const handleMarketAnalysis = useCallback(() => {
    onChange('我要对[产品名]进行市场分析')
    setShowMenu(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [onChange])

  // ── 占位按钮（制图） ──────────────────────────────────────────
  const showPlaceholderToast = useCallback(() => {
    setShowMenu(false)
    showToast('功能开发中，敬请期待')
  }, [showToast])

  const hasContent = value.trim() || attachments.length > 0

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

      <div className="mx-auto max-w-3xl">
        {/* 输入容器 */}
        <div className="rounded-2xl border border-line focus-within:border-start focus-within:ring-1 focus-within:ring-start">
          <div className="flex flex-col gap-0 bg-mist rounded-2xl p-2">
            {/* 附件 chips — 在输入框内部，与文字同一背景 */}
            {showAttach && (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="mb-1"
              >
                {attachments.length === 0 ? (
                  <div className="flex items-center gap-1.5 px-1 py-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-track/30">
                      <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H5.25a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-track/40 transition-colors hover:text-track/60"
                    >
                      点击选择文件，或拖拽文件到此处
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 pb-1.5">
                    {attachments.map(att => (
                      <div key={att.id} className="group relative">
                        {att.type === 'image' ? (
                          <div className="relative">
                            <img
                              src={att.preview}
                              alt={att.name}
                              className="h-8 w-8 rounded object-cover"
                            />
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); removeAttachment(att.id) }}
                              className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-line bg-white text-[8px] text-track/50 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:border-red-300 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 rounded-md border border-line bg-white px-1.5 py-1 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0 text-track/50">
                              <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                              <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375h1.875a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                            </svg>
                            <span className="max-w-[80px] truncate text-[10px] text-track/70">{att.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(att.id)}
                              className="ml-0.5 text-[10px] text-track/30 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-xs text-track/30 transition-colors hover:border-track/40 hover:text-track/50"
                    >
                      +
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* 主输入行 */}
            <div className="flex items-end gap-2">
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
                        ? 'bg-line text-track'
                        : 'text-track/40 hover:bg-line hover:text-track/60'
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
                    <MenuBtn icon="📈" label="市场分析" onClick={handleMarketAnalysis} />
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
              disabled={disabled || sending || !hasContent}
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
          </div>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-track/40 sm:text-xs">
        Enter 发送，Shift + Enter 换行
      </p>
    </div>
  )
}
