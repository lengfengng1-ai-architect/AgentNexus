// PhoneFrame — 移动端手机外壳（共享组件）
// OpenSpec: openspec/changes/add-mobile-workbench-preview · tasks 3.1
import type { ReactNode } from 'react'

function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="sb-r">
        <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
          <rect x="0" y="6" width="3" height="4" rx="1" fill="#111111" />
          <rect x="4" y="4" width="3" height="6" rx="1" fill="#111111" />
          <rect x="8" y="2" width="3" height="8" rx="1" fill="#111111" />
          <rect x="12" y="0" width="3" height="10" rx="1" fill="#111111" />
        </svg>
        <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
          <path d="M7 9.2 1 3.4a8.5 8.5 0 0 1 12 0L7 9.2Z" fill="#111111" />
        </svg>
        <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
          <rect x="0.5" y="0.5" width="18" height="9" rx="2" fill="none" stroke="#111111" />
          <rect x="2" y="2" width="13" height="6" rx="1" fill="#111111" />
          <rect x="19" y="3" width="2" height="4" rx="1" fill="#111111" />
        </svg>
      </span>
    </div>
  )
}

export function PhoneFrame({ topbar, children }: { topbar?: ReactNode; children: ReactNode }) {
  return (
    <div className="phone">
      <div className="notch" />
      <div className="home-ind" />
      <div className="screen">
        <StatusBar />
        {topbar}
        {children}
      </div>
    </div>
  )
}
