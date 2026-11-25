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
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.caseNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.court?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'ALL' || c.status?.toUpperCase() === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your legal cases, court records, and judgment summaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFeedback(null)
              setShowModal(true)
            }}
            className="btn-primary shrink-0"
          >
            + New Case
          </button>
          <Link to="/upload" className="btn-secondary shrink-0">
            ⬆️ Upload PDF
          </Link>
        </div>
      </div>

      {/* User Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="font-bold ml-4 hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
            placeholder="Search by case title, number, or court…"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto text-xs font-medium">
          {['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content State: Loading */}
      {loading && (
        <div className="card text-center py-16">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading cases from database…</p>
        </div>
      )}

      {/* Content State: Error */}
      {!loading && error && (
        <div className="card text-center py-12 border-red-200 bg-red-50/50">
          <span className="text-4xl mb-2 block">⚠️</span>
          <h2 className="text-base font-semibold text-red-800">Unable to load cases</h2>
          <p className="text-sm text-red-600 mt-1 max-w-md mx-auto">{error}</p>
          <button onClick={fetchCases} className="btn-secondary mt-4">
            🔄 Retry
          </button>
        </div>
      )}

      {/* Content State: Empty */}
      {!loading && !error && cases.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          <span className="text-5xl mb-3 block">📁</span>
          <h2 className="text-lg font-semibold text-gray-800">No cases yet</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            You haven&apos;t added any cases yet. Create your first case or upload a judgment PDF to get started.
          </p>
          <div className="flex justify-center gap-3 mt-5">
            <button onClick={() => setShowModal(true)} className="btn-primary">
              + Create Case
            </button>
            <Link to="/upload" className="btn-secondary">
              Upload PDF
            </Link>
          </div>
        </div>
      )}

      {/* Content State: Filtered Empty */}
      {!loading && !error && cases.length > 0 && filteredCases.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          <span className="text-4xl mb-2 block">🔍</span>
          <p className="font-medium text-gray-700">No cases matching your criteria</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your search query or status filter.
          </p>
          <button
            onClick={() => {
              setSearch('')
              setStatusFilter('ALL')
            }}
            className="btn-secondary mt-3"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Content State: Table */}
      {!loading && !error && filteredCases.length > 0 && (
        <div className="card overflow-hidden p-0 border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Case Number</th>
                  <th className="px-5 py-3.5">Title</th>
                  <th className="px-5 py-3.5">Court</th>
                  <th className="px-5 py-3.5">Judgment Date</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredCases.map((c) => {
                  const formattedDate = c.judgmentDate
                    ? new Date(c.judgmentDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'

                  const statusClass =
                    STATUS_BADGE[c.status?.toUpperCase()] || 'badge-gray'

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="hover:text-primary-700 hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900 max-w-xs truncate">
                        <Link
                          to={`/cases/${c.id}`}
                          className="hover:text-primary-700 transition-colors"
                        >
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {c.court || '—'}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        <span className="badge badge-gray">{c.caseType || 'General'}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={statusClass}>{c.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap space-x-3">
                        <Link
                          to={`/cases/${c.id}`}
                          className="text-primary-700 hover:text-primary-900 font-medium text-xs hover:underline"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id, c.caseNumber)}
                          className="text-red-600 hover:text-red-800 font-medium text-xs hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
            <span>
              Showing <strong>{filteredCases.length}</strong> of <strong>{cases.length}</strong> cases
            </span>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Add New Case Record</h2>
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
                    className="form-input font-mono text-xs"
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
