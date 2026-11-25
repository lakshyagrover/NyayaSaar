import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api.js'

const STATUS_BADGE = {
  PENDING:    'badge-yellow',
  PROCESSING: 'badge-blue',
  COMPLETED:  'badge-green',
  FAILED:     'badge-red',
}

export default function AllCases() {
  const [cases, setCases]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [feedback, setFeedback]     = useState(null) // { type: 'success' | 'error', text: string }

  // Modal state for manual case creation
  const [showModal, setShowModal]   = useState(false)
  const [creating, setCreating]     = useState(false)
  const [form, setForm]             = useState({
    title: '',
    caseNumber: '',
    court: '',
    judgmentDate: '',
    caseType: 'Civil',
    status: 'PENDING',
  })

  // Fetch cases from API
  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/cases')
      setCases(res.data.cases || [])
    } catch (err) {
      console.error('Failed to load cases:', err)
      setError(err.response?.data?.message || 'Failed to load cases. Please check backend connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  // Delete case
  const handleDelete = async (id, caseNumber) => {
    if (!window.confirm(`Are you sure you want to delete case "${caseNumber}"? This cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/cases/${id}`)
      setCases((prev) => prev.filter((c) => c.id !== id))
      setFeedback({ type: 'success', text: `Case "${caseNumber}" deleted successfully.` })
    } catch (err) {
      console.error('Failed to delete case:', err)
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete case.',
      })
    }
  }

  // Create case
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setCreating(true)
    setFeedback(null)

    try {
      const res = await api.post('/cases', form)
      setShowModal(false)
      setForm({
        title: '',
        caseNumber: '',
        court: '',
        judgmentDate: '',
        caseType: 'Civil',
        status: 'PENDING',
      })
      setFeedback({ type: 'success', text: 'Case created successfully.' })
      // Add the new case to list or refresh
      setCases((prev) => [res.data.case, ...prev])
    } catch (err) {
      console.error('Failed to create case:', err)
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create case. Please try again.',
      })
    } finally {
      setCreating(false)
    }
  }

  // Client-side filtering
  const [typeFilter, setTypeFilter] = useState('ALL')
  const types = ['ALL', ...new Set(cases.map((c) => c.caseType || 'Other'))]

  const filteredCases = cases.filter((c) => {
    const q = search.toLowerCase()
    const matchesSearch =
      c.title?.toLowerCase().includes(q) ||
      c.caseNumber?.toLowerCase().includes(q) ||
      c.court?.toLowerCase().includes(q)

    // statusFilter: ALL | SUMMARIZED | PENDING
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SUMMARIZED' && c.summary) ||
      (statusFilter === 'PENDING' && !c.summary)

    const matchesType = typeFilter === 'ALL' || (c.caseType || 'Other') === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const summarizedCount = cases.filter((c) => c.summary).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-court-navy">All Cases</h1>
          <p className="text-sm text-gray-500 mt-1">
            {cases.length} case(s) · {summarizedCount} summarized · {cases.length - summarizedCount} pending
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFeedback(null)
              setShowModal(true)
            }}
            className="btn-secondary shrink-0"
          >
            + New Case
          </button>
          <Link to="/upload" className="btn-primary shrink-0">
            ⬆️ Upload Judgment
          </Link>
        </div>
      </div>

      {/* User Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-4 hover:opacity-75">✕</button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
            placeholder="Search by title, case number or court…"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>

        {/* Summary status tabs */}
        <div className="flex items-center gap-1 bg-primary-50 p-1 rounded-lg text-xs font-medium">
          {[
            ['ALL', 'All'],
            ['SUMMARIZED', 'Summarized'],
            ['PENDING', 'Pending'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === key
                  ? 'bg-white text-primary-800 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-primary-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-input lg:w-44"
        >
          {types.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All categories' : t}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-16">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading cases…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="card text-center py-12 border-red-200 bg-red-50/50">
          <p className="text-3xl mb-2">⚠️</p>
          <h2 className="text-base font-semibold text-red-800">Unable to load cases</h2>
          <p className="text-sm text-red-600 mt-1 max-w-md mx-auto">{error}</p>
          <button onClick={fetchCases} className="btn-secondary mt-4">🔄 Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && cases.length === 0 && (
        <div className="card text-center py-16 border-2 border-dashed border-primary-100">
          <p className="text-4xl mb-3">📁</p>
          <h2 className="text-lg font-semibold text-court-navy">No cases yet</h2>
          <p className="text-sm text-gray-500 mt-1">Upload a judgment PDF to get started.</p>
          <Link to="/upload" className="btn-primary mt-5 inline-flex">⬆️ Upload Judgment</Link>
        </div>
      )}

      {/* Filtered empty */}
      {!loading && !error && cases.length > 0 && filteredCases.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-medium text-gray-700">No cases match your search</p>
          <button
            onClick={() => {
              setSearch('')
              setStatusFilter('ALL')
              setTypeFilter('ALL')
            }}
            className="btn-secondary mt-3"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Case cards */}
      {!loading && !error && filteredCases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCases.map((c) => {
            const date = c.judgmentDate
              ? new Date(c.judgmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Date not set'

            return (
              <div
                key={c.id}
                className="card p-5 flex flex-col hover:border-primary-300 hover:-translate-y-0.5 transition-all"
              >
                {/* Top: icon + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold font-serif text-lg shrink-0">
                    {c.title?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <span className="badge badge-gray">{c.caseType || 'Other'}</span>
                    <span className={`badge ${c.summary ? 'bg-primary-100 text-primary-800' : 'bg-amber-50 text-amber-700'}`}>
                      {c.summary ? '✓ Summarized' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Title + details */}
                <Link to={`/cases/${c.id}`} className="mt-4 block">
                  <h3 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 hover:text-primary-700">
                    {c.title}
                  </h3>
                </Link>
                <p className="text-xs text-gray-500 mt-1 truncate">{c.caseNumber}</p>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <p className="truncate">🏛️ {c.court || 'Court not specified'}</p>
                  <p>📅 {date}</p>
                </div>

                {/* Counts */}
                <div className="mt-4 flex gap-4 text-xs text-gray-500">
                  <span>⚖️ {c._count?.citations || 0} citations</span>
                  <span>📅 {c._count?.hearings || 0} hearings</span>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                  <Link to={`/cases/${c.id}`} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                    View
                  </Link>
                  <Link to={`/cases/${c.id}/summary`} className="btn-primary text-xs py-1.5 px-3 flex-1">
                    {c.summary ? '📜 Summary' : '⚡ Summarize'}
                  </Link>
                  <button
                    onClick={() => handleDelete(c.id, c.caseNumber)}
                    className="text-xs text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                    title="Delete case"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && filteredCases.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          Showing {filteredCases.length} of {cases.length} cases
        </p>
      )}

      {/* Create Case Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-court-navy">Add New Case</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="form-label">Case Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. State vs. Ramesh Kumar"
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Case Number *</label>
                  <input
                    type="text"
                    required
                    value={form.caseNumber}
                    onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                    placeholder="e.g. CRL-2024-0042"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Case Type</label>
                  <select
                    value={form.caseType}
                    onChange={(e) => setForm({ ...form, caseType: e.target.value })}
                    className="form-input"
                  >
                    <option value="Criminal">Criminal</option>
                    <option value="Civil">Civil</option>
                    <option value="Constitutional">Constitutional</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Family">Family</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Court</label>
                  <input
                    type="text"
                    value={form.court}
                    onChange={(e) => setForm({ ...form, court: e.target.value })}
                    placeholder="e.g. Tis Hazari District Court"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Judgment Date</label>
                  <input
                    type="date"
                    value={form.judgmentDate}
                    onChange={(e) => setForm({ ...form, judgmentDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Initial Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="form-input"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating…' : 'Save Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
