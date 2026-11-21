import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'

const STAT_CARDS = [
  { label: 'Total Cases',       value: '—', color: 'text-primary-700', icon: '📁' },
  { label: 'Summaries Generated', value: '—', color: 'text-green-700',   icon: '🤖' },
  { label: 'Upcoming Hearings', value: '—', color: 'text-yellow-700',  icon: '📅' },
  { label: 'Citations Found',   value: '—', color: 'text-purple-700',  icon: '⚖️'  },
]

const QUICK_LINKS = [
  { label: 'Upload New Judgment', path: '/upload',   icon: '⬆️',  desc: 'Add a new PDF judgment' },
  { label: 'Browse All Cases',    path: '/cases',    icon: '📂',  desc: 'View & search all cases' },
  { label: 'Hearing Calendar',    path: '/hearings', icon: '📅',  desc: 'Manage hearing schedule' },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          AI Court Judgment Summarizer — District Court Intelligence Platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, color, icon }) => (
          <div key={label} className="card flex items-center gap-4">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map(({ label, path, icon, desc }) => (
            <Link key={path} to={path} className="card hover:shadow-md transition-shadow flex items-start gap-3 group">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium text-gray-800 group-hover:text-primary-700 transition-colors">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Placeholder: recent activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Cases</h2>
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium">No cases yet</p>
          <p className="text-sm mt-1">Upload your first judgment to get started.</p>
          <Link to="/upload" className="btn-primary mt-4 inline-flex">Upload Judgment</Link>
        </div>
      </div>
    </div>
  )
}
