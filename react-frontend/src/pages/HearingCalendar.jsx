import { Link } from 'react-router-dom'

export default function HearingCalendar() {
  // TODO: Fetch from GET /api/hearings

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hearing Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and manage court hearings.</p>
        </div>
        <button className="btn-primary shrink-0">+ Schedule Hearing</button>
      </div>

      {/* Calendar placeholder */}
      <div className="card">
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden text-center text-xs font-medium">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="bg-gray-50 py-2 text-gray-500">{d}</div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-white py-6 text-gray-300 hover:bg-gray-50 transition-colors cursor-pointer">
              {i + 1 <= 31 ? i + 1 : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming hearings list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming Hearings</h2>
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-gray-600">No upcoming hearings</p>
          <p className="text-sm mt-1">Schedule hearings to track court dates.</p>
        </div>
      </div>
    </div>
  )
}
