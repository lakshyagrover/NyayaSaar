import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// Simple line icons (plain SVG, no extra library needed)
const ICONS = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  cases: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  hearings: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  logout: 'M15 17l5-5-5-5m5 5H9m4 9H6a2 2 0 01-2-2V5a2 2 0 012-2h7',
}

function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

const NAV_ITEMS = [
  { label: 'Dashboard',        path: '/dashboard', icon: 'dashboard' },
  { label: 'All Cases',        path: '/cases',     icon: 'cases' },
  { label: 'Upload Judgment',  path: '/upload',    icon: 'upload' },
  { label: 'Hearing Calendar', path: '/hearings',  icon: 'hearings' },
  { label: 'Profile',          path: '/profile',   icon: 'profile' },
]

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex bg-court-cream overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-court-navy text-white flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0`}
      >
        {/* Logo + collapse button (top, like before) */}
        <div className={`flex items-center h-20 px-4 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-court-gold/15 border border-court-gold/40 flex items-center justify-center text-court-gold font-serif font-bold text-lg shrink-0">
                N
              </div>
              <div className="leading-tight min-w-0">
                <p className="font-serif text-lg font-bold text-court-gold">NyayaSaar</p>
                <p className="text-[10px] text-white/50 truncate">AI Judgment Summarizer</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <div className="mx-5 h-px bg-gradient-to-r from-court-gold/40 to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, path, icon }) => {
            const active = location.pathname === path || location.pathname.startsWith(path + '/')
            return (
              <Link
                key={path}
                to={path}
                title={sidebarOpen ? '' : label}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  sidebarOpen ? '' : 'justify-center'
                } ${
                  active
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {/* gold bar on the active item */}
                {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-court-gold" />}
                <Icon name={icon} className={`w-5 h-5 shrink-0 ${active ? 'text-court-gold' : ''}`} />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User card + logout */}
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center gap-2 p-2 rounded-xl ${sidebarOpen ? 'bg-white/5' : 'justify-center'}`}>
            {/* Avatar + name: click to open Profile */}
            <Link
              to="/profile"
              title="Go to Profile"
              className="flex items-center gap-3 min-w-0 flex-1 rounded-lg hover:bg-white/10 p-1 -m-1 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              {sidebarOpen && user && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-[11px] text-white/50 truncate">{user.email}</p>
                </div>
              )}
            </Link>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                title="Logout"
              >
                <Icon name="logout" className="w-4 h-4" />
              </button>
            )}
          </div>

          {!sidebarOpen && (
            <button
              onClick={handleLogout}
              className="mt-2 w-full flex justify-center p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              title="Logout"
            >
              <Icon name="logout" className="w-5 h-5" />
            </button>
          )}

        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
