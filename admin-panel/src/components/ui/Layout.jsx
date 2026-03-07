import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/reports/')

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <TopBar
        onMenuClick={() => setMobileOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main content */}
      <main className={`
        transition-all duration-300
        ${isDashboard
          ? ''
          : sidebarCollapsed
            ? 'lg:pl-[72px]'
            : 'lg:pl-64'
        }
      `}>
        <div className={isDashboard ? '' : 'p-4 sm:p-6 lg:p-8'}>
          {children}
        </div>
      </main>
    </div>
  )
}
