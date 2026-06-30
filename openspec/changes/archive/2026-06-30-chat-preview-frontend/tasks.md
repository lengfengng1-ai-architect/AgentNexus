## 1. Project Setup

- [x] 1.1 Initialize `frontend/` with Vite + React + TypeScript (`npm create vite@latest frontend -- --template react-ts`)
- [x] 1.2 Install Tailwind CSS and configure `tailwind.config.js` / `postcss.config.js`
- [x] 1.3 Add design tokens to `frontend/src/index.css` with Google Fonts and CSS variables
- [x] 1.4 Configure API base URL via environment variable (`.env.example` for local)
- [x] 1.5 Add Google Fonts imports for `Bebas Neue`, `Inter`, `JetBrains Mono`

## 2. Type Definitions & API

- [x] 2.1 Create `frontend/src/types/chat.ts` with `BrandInput`, `ChatRequest`, `ChatResponse`, `ChatMessage`
- [x] 2.2 Create `frontend/src/api/chat.ts` with `sendChatMessage(message: string): Promise<ChatResponse>`
- [x] 2.3 Add axios as dependency and configure instance with base URL and timeout

## 3. State Management Hook

- [x] 3.1 Create `frontend/src/hooks/useChat.ts` with reducer for messages, loading, error states
- [x] 3.2 Implement localStorage persistence for message history (`CHAT_HISTORY_KEY`)
- [x] 3.3 Implement `sendMessage` action that appends user message, calls API, appends AI response
- [x] 3.4 Implement `retryMessage` action to resend a failed user message
- [x] 3.5 Implement `prefillInput` action for scenario cards and field slot clicks

## 4. UI Components

- [x] 4.1 Create `frontend/src/components/ProgressTrack.tsx` showing 5 field slots with icon/label and confirmed state
- [x] 4.2 Create `frontend/src/components/ChatBubble.tsx` for user and AI messages
- [x] 4.3 Create `frontend/src/components/LoadingBubble.tsx` skeleton screen for AI loading state
- [x] 4.4 Create `frontend/src/components/ChatInput.tsx` with fixed bottom positioning, auto-resize textarea, send button
- [x] 4.5 Create `frontend/src/components/WelcomeCard.tsx` with title and 3 scenario cards
- [x] 4.6 Create `frontend/src/components/ErrorBar.tsx` for top-of-input error messages
- [x] 4.7 Create `frontend/src/components/ChatContainer.tsx` composing all components and managing layout

## 5. Page & Routing

- [x] 5.1 Create `frontend/src/pages/ChatPreviewPage.tsx` rendering `ChatContainer`
- [x] 5.2 Update `frontend/src/App.tsx` to render `ChatPreviewPage`
- [x] 5.3 Single-page chat entry (routing deferred to future change)

## 6. Backend CORS (Development)

- [x] 6.1 Add `CORSMiddleware` to `backend/app/main.py` allowing configured origins
- [x] 6.2 Configure allowed origins via environment variable `CORS_ORIGINS`
- [x] 6.3 Ensure CORS is disabled by default in production (empty `CORS_ORIGINS`)

## 7. Testing & Verification

- [x] 7.1 Run `npm run dev` and verify `/chat` loads without errors
- [x] 7.2 Verify welcome card displays when no history exists
- [x] 7.3 Verify clicking scenario card prefills input
- [x] 7.4 Verify sending message calls `POST /api/v1/chat` and displays response/error
- [x] 7.5 Verify progress track updates as fields are extracted（需配置真实 API key 验证完整流程）
- [x] 7.6 Verify field slot click prefills input with edit prompt
- [x] 7.7 Verify error bar + retry button on failed request
- [x] 7.8 Verify responsive layout at 375px and 1440px
- [x] 7.9 Verify localStorage restores conversation on reload
- [x] 7.10 Run backend tests to ensure CORS change does not break existing tests

## 8. Documentation

- [x] 8.1 Update `README.md` with frontend setup and run commands
- [x] 8.2 Add `.env.example` to `frontend/` documenting `VITE_API_BASE_URL`
