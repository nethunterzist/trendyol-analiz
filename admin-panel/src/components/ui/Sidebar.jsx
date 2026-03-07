import { NavLink, useLocation } from 'react-router-dom'
import {
  FileBarChart,
  ListOrdered,
  GitCompareArrows,
  PanelLeftClose,
  PanelLeft,
  X
} from 'lucide-react'

const navItems = [
  { to: '/', icon: FileBarChart, label: 'Rapor Oluştur' },
  { to: '/reports', icon: ListOrdered, label: 'Raporlarım' },
  { to: '/compare', icon: GitCompareArrows, label: 'Karşılaştır' },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/reports/')

  // Hide sidebar on dashboard pages
  if (isDashboard) return null

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-slate-900 z-50
        transition-all duration-300 ease-in-out
        flex flex-col
        ${collapsed ? 'w-[72px]' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo area */}
        <div className={`flex items-center h-16 px-4 border-b border-slate-800 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-sm leading-tight">Trendyol</h1>
                <p className="text-slate-400 text-[11px] leading-tight">Analytics</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
          )}

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const IconComp = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onMobileClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <IconComp size={20} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden lg:block p-3 border-t border-slate-800">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
            title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>Daralt</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
