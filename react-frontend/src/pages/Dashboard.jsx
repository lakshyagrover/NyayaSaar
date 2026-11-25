import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'
import api from '../services/api.js'

const QUICK_LINKS = [
  { label: 'Upload New Judgment', path: '/upload',   icon: '⬆️',  desc: 'Add a new PDF judgment' },
  { label: 'Browse All Cases',    path: '/cases',    icon: '📂',  desc: 'View & search all cases' },
  { label: 'Hearing Calendar',    path: '/hearings', icon: '📅',  desc: 'Manage hearing schedule' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [totalCases, setTotalCases] = useState(0)
  const [hearings, setHearings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, hRes] = await Promise.all([
          api.get('/cases?limit=100'),
          api.get('/hearings?upcoming=true'),
        ])
        setCases(cRes.data.cases || [])
        setTotalCases(cRes.data.pagination?.total || 0)
        setHearings(hRes.data.hearings || [])
      } catch (err) {
        console.error('Dashboard load failed:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const summaries = cases.filter((c) => c.summary).length
  const citations = cases.reduce((sum, c) => sum + (c._count?.citations || 0), 0)

  const stats = [
    { label: 'Total Cases',         value: totalCases,      color: 'text-primary-700', icon: '📁' },
    { label: 'Summaries Generated', value: summaries,       color: 'text-green-700',   icon: '🤖' },
    { label: 'Upcoming Hearings',   value: hearings.length, color: 'text-yellow-700',  icon: '📅' },
    { label: 'Citations Found',     value: citations,       color: 'text-purple-700',  icon: '⚖️' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          NyayaSaar — AI Court Judgment Summarizer for District Courts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, color, icon }) => (
          <div key={label} className="card flex items-center gap-4">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming hearings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming Hearings</h2>
          <div className="card">
            {hearings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No upcoming hearings.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {hearings.slice(0, 5).map((h) => (
                  <div key={h.id} className="py-2.5">
                    <p className="text-sm font-medium text-gray-900">
                      📅 {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {h.time && ` • ${h.time}`}
                    </p>
                    <Link to={`/cases/${h.case?.id}`} className="text-xs text-primary-700 hover:underline">
                      {h.case?.title} ({h.case?.caseNumber})
                    </Link>
                  </div>
                ))}
              </div>
            )}
            <Link to="/hearings" className="text-xs text-primary-700 hover:underline block mt-2">View all hearings →</Link>
          </div>
        </div>

        {/* Recent cases */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Cases</h2>
          <div className="card">
            {cases.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="font-medium">No cases yet</p>
                <Link to="/upload" className="btn-primary mt-4 inline-flex">Upload Judgment</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cases.slice(0, 5).map((c) => (
                  <Link key={c.id} to={`/cases/${c.id}`} className="py-2.5 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.caseNumber} • {c.court || 'Court not specified'}</p>
                    </div>
                    <span className={`badge ${c.summary ? 'badge-green' : 'badge-gray'}`}>
                      {c.summary ? 'Summarized' : 'No summary'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
