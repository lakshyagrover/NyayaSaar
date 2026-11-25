import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'
import api from '../services/api.js'

// "Good morning / afternoon / evening" based on the time
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// How many days from today until a date
function daysUntil(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - today) / (1000 * 60 * 60 * 24))
}

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

  // ── Numbers for the cards ─────────────────────────────────────────────
  const summaries = cases.filter((c) => c.summary).length
  const citations = cases.reduce((sum, c) => sum + (c._count?.citations || 0), 0)
  const summaryPercent = cases.length ? Math.round((summaries / cases.length) * 100) : 0
  const pendingSummaries = cases.filter((c) => !c.summary && c.extractedText !== null).slice(0, 3)

  // Cases grouped by category (Criminal, Civil, ...)
  const byType = {}
  cases.forEach((c) => {
    const t = c.caseType || 'Other'
    byType[t] = (byType[t] || 0) + 1
  })
  const typeList = Object.entries(byType).sort((a, b) => b[1] - a[1])

  const nextHearing = hearings[0]
  const nextDays = nextHearing ? daysUntil(nextHearing.date) : null

  const stats = [
    { label: 'Total Cases', value: totalCases, icon: '📁', link: '/cases', note: 'Judgments uploaded' },
    { label: 'AI Summaries', value: summaries, icon: '📜', link: '/cases', note: `${summaryPercent}% of cases summarized` },
    { label: 'Upcoming Hearings', value: hearings.length, icon: '📅', link: '/hearings', note: nextHearing ? `Next in ${nextDays} day(s)` : 'None scheduled' },
    { label: 'Citations Found', value: citations, icon: '⚖️', link: '/cases', note: 'Cases, Acts & Sections' },
  ]

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* ── Welcome banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-court-navy text-white p-6 sm:p-8">
        {/* soft decorative circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary-600/30" />
        <div className="absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-court-gold/10" />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-xs text-white/60">{today}</p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-1">
              {greeting()}, <span className="text-court-gold">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-sm text-white/70 mt-2 max-w-lg">
              Summarize lengthy judgments, find citations and similar cases, and track your hearings.
            </p>

          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link to="/upload" className="btn-primary bg-primary-600 hover:bg-primary-500 px-5">
              ⬆️ Upload Judgment
            </Link>
            <Link
              to="/hearings"
              className="inline-flex items-center px-5 py-2 rounded-lg text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              📅 Schedule Hearing
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon, link, note }) => (
          <Link
            key={label}
            to={link}
            className="card p-5 hover:border-primary-300 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-lg">{icon}</div>
            </div>
            <p className="text-4xl font-bold text-court-navy mt-3 font-serif">{loading ? '—' : value}</p>
            <p className="text-xs text-primary-700 mt-1">{loading ? '' : note}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Recent cases ─────────────────────────────────────────── */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-court-navy">Recent Cases</h2>
              <p className="text-xs text-gray-500">Your latest uploaded judgments</p>
            </div>
            <Link to="/cases" className="text-xs font-medium text-primary-700 hover:underline">View all →</Link>
          </div>

          {cases.length === 0 ? (
            <div className="flex items-center justify-between gap-4 py-2">
              <p className="text-sm text-gray-600">No cases yet</p>
              <Link to="/upload" className="btn-primary shrink-0">Upload your first judgment</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cases.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="py-3 flex items-center gap-4 hover:bg-primary-50/60 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold font-serif shrink-0">
                    {c.title?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.caseNumber} · {c.court || 'Court not specified'}
                    </p>
                  </div>
                  <span className="hidden sm:inline text-xs text-gray-500 shrink-0">{c.caseType || 'Other'}</span>
                  <span className={`status shrink-0 ${c.summary ? 'text-primary-700' : 'text-amber-600'}`}>
                    {c.summary ? 'Summarized' : 'Pending'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Upcoming hearings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-court-navy">Upcoming Hearings</h2>
              <Link to="/hearings" className="text-xs font-medium text-primary-700 hover:underline">View all →</Link>
            </div>

            {hearings.length === 0 ? (
              <div className="flex items-center justify-between gap-4 py-2">
                <p className="text-sm text-gray-500">No upcoming hearings.</p>
                <Link to="/hearings" className="text-xs text-primary-700 hover:underline shrink-0">+ Schedule one</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {hearings.slice(0, 3).map((h) => {
                  const d = new Date(h.date)
                  const left = daysUntil(h.date)
                  return (
                    <Link
                      key={h.id}
                      to={`/cases/${h.case?.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 transition-colors"
                    >
                      <div className="w-12 text-center rounded-lg bg-court-navy text-white py-1.5 shrink-0">
                        <p className="text-[10px] uppercase text-court-gold">
                          {d.toLocaleDateString('en-IN', { month: 'short' })}
                        </p>
                        <p className="text-lg font-bold leading-tight">{d.getDate()}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{h.case?.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {h.time || 'Time not set'}{h.location ? ` · ${h.location}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded-full shrink-0">
                        {left === 0 ? 'Today' : left === 1 ? 'Tomorrow' : `${left}d`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Summary progress + case types */}
          <div className="card">
            <h2 className="text-lg font-semibold text-court-navy">Overview</h2>

            {/* Summary progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Cases summarized</span>
                <span className="font-semibold text-court-navy">{summaries}/{cases.length}</span>
              </div>
              <div className="h-2 rounded-full bg-primary-50 overflow-hidden">
                <div className="h-full rounded-full bg-primary-600" style={{ width: `${summaryPercent}%` }} />
              </div>
            </div>

            {/* Cases by category */}
            <p className="text-xs text-gray-600 mt-5 mb-2">Cases by category</p>
            {typeList.length === 0 ? (
              <p className="text-xs text-gray-400">No cases yet.</p>
            ) : (
              <div className="space-y-2">
                {typeList.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="w-24 text-gray-600 truncate">{type}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-court-gold"
                        style={{ width: `${(count / cases.length) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-semibold text-court-navy">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cases waiting for a summary */}
            {pendingSummaries.length > 0 && (
              <>
                <p className="text-xs text-gray-600 mt-5 mb-2">Waiting for AI summary</p>
                <div className="space-y-1">
                  {pendingSummaries.map((c) => (
                    <Link
                      key={c.id}
                      to={`/cases/${c.id}/summary`}
                      className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-primary-50"
                    >
                      <span className="truncate text-gray-800">{c.title}</span>
                      <span className="text-primary-700 font-medium shrink-0 ml-2">Generate →</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
