import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

const pageTitles = {
  '/': { title: 'Rapor Oluştur', subtitle: 'Yeni kategori analiz raporu oluşturun' },
  '/report': { title: 'Rapor Oluştur', subtitle: 'Yeni kategori analiz raporu oluşturun' },
  '/reports': { title: 'Raporlarım', subtitle: 'Oluşturulan raporları görüntüleyin' },
}

export default function TopBar({ onMenuClick, sidebarCollapsed }) {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/reports/')

  // Hide topbar on dashboard pages (dashboard has its own header)
  if (isDashboard) return null

  const page = pageTitles[location.pathname] || { title: 'Trendyol Analytics', subtitle: '' }

  return (
    <header className={`
      sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200
      transition-all duration-300
      ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}
    `}>
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={20} />
          </button>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">{page.title}</h2>
            {page.subtitle && (
              <p className="text-xs text-slate-400 hidden sm:block">{page.subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
