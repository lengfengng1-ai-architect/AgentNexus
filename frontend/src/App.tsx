import { ChatPreviewPage } from './pages/ChatPreviewPage'
import { PlanPage } from './pages/PlanPage'

function getPageFromPath(): 'chat' | 'plan' {
  return window.location.pathname === '/plan' ? 'plan' : 'chat'
}

function App() {
  const page = getPageFromPath()

  return page === 'plan' ? <PlanPage /> : <ChatPreviewPage />
}

export default App
