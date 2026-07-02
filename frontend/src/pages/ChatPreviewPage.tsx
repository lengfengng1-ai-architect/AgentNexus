import { useState } from 'react'
import { ChatContainer } from '../components/ChatContainer'
import { IntentTestPage } from './IntentTestPage'

type View = 'chat' | 'intent'

export function ChatPreviewPage() {
  const [view, setView] = useState<View>('chat')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-2 border-b border-line bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => setView('chat')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start ${
            view === 'chat'
              ? 'bg-track text-white'
              : 'text-track hover:bg-mist'
          }`}
        >
          对话
        </button>
        <button
          type="button"
          onClick={() => setView('intent')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start ${
            view === 'intent'
              ? 'bg-start text-white'
              : 'text-track hover:bg-mist'
          }`}
        >
          意图测试
        </button>
      </div>

      {view === 'chat' ? <ChatContainer /> : <IntentTestPage />}
    </div>
  )
}
