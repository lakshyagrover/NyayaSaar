import { useState } from 'react'
import { Link } from 'react-router-dom'

const STATUS_BADGE = {
  pending:    'badge-yellow',
  processing: 'badge-blue',
  completed:  'badge-green',
  failed:     'badge-red',
}

// Placeholder data — will come from GET /api/cases
const PLACEHOLDER_CASES = []

export default function AllCases() {
  const [search, setSearch] = useState('')

  const filtered = PLACEHOLDER_CASES.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.caseNumber?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">Browse and manage all uploaded judgments.</p>
        </div>
        <Link to="/upload" className="btn-primary shrink-0">+ Upload Judgment</Link>
      </div>

      {/* Search */}
      <div>
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          className="form-input max-w-sm"
          placeholder="Search by title or case number…"
        />
      </div>

      {/* Table / empty state */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium text-gray-600">No cases found</p>
          <p className="text-sm mt-1">Upload a judgment to see it here.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Case Number', 'Title', 'Court', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.caseNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.title}</td>
                  <td className="px-4 py-3 text-gray-500">{c.court}</td>
                  <td className="px-4 py-3 text-gray-500">{c.date}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[c.status] || 'badge-gray'}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/cases/${c.id}`} className="text-primary-700 hover:underline font-medium">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
