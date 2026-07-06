import { useState } from 'react'
import { ChatPreviewPage } from './pages/ChatPreviewPage'
import { PlanPage } from './pages/PlanPage'
import { IntentTestPage } from './pages/IntentTestPage'

type Page = 'chat' | 'plan' | 'intent'

const NAV: { key: Page; label: string; children?: { key: string; label: string }[] }[] = [
  { key: 'chat', label: '对话' },
  { key: 'plan', label: '工作台' },
  {
    key: 'intent',
    label: '测试',
    children: [{ key: 'intent', label: '意图识别' }],
  },
]

function App() {
  const [page, setPage] = useState<Page>(() => {
    if (window.location.pathname === '/plan') return 'plan'
    if (window.location.pathname === '/intent-test') return 'intent'
    return 'chat'
  })

  const navigate = (p: Page) => {
    setPage(p)
    const path = p === 'chat' ? '/' : p === 'plan' ? '/plan' : '/intent-test'
    window.history.pushState(null, '', path)
  }

  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', height: 'var(--app-height)' }}>
      <header style={{
        height: 48, background: '#fff', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 4,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginRight: 24, letterSpacing: '-0.3px' }}>
          AllyGo
        </span>
        {NAV.map(item => (
          item.children ? (
            <NavDropdown
              key={item.key}
              label={item.label}
              active={page === item.key}
              children={item.children}
              onSelect={k => navigate(k as Page)}
            />
          ) : (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: page === item.key ? '#1e40af' : 'transparent',
                color: page === item.key ? '#fff' : '#475569',
              }}
            >
              {item.label}
            </button>
          )
        ))}
      </header>
      <main style={{ flex: 1, overflow: 'auto' }}>
        {page === 'chat' && <ChatPreviewPage />}
        {page === 'plan' && <PlanPage />}
        {page === 'intent' && <IntentTestPage />}
      </main>
    </div>
  )
}

function NavDropdown({
  label, active, children, onSelect,
}: {
  label: string
  active: boolean
  children: { key: string; label: string }[]
  onSelect: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '4px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 4,
          background: active ? '#1e40af' : 'transparent',
          color: active ? '#fff' : '#475569',
        }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
          <path d="M12 16l-6-6h12z" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 2,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: 120,
          zIndex: 1000,
        }}>
          {children.map(child => (
            <button
              key={child.key}
              onClick={() => { onSelect(child.key); setOpen(false) }}
              style={{
                display: 'block', width: '100%', padding: '8px 16px', fontSize: 13,
                fontWeight: 500, cursor: 'pointer', border: 'none', background: '#fff',
                color: '#374151', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
      {/* 点击空白关闭 */}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setOpen(false)} />}
    </div>
  )
}

export default App
