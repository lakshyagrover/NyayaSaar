import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api.js'

const STATUS_BADGE = {
  SCHEDULED: 'bg-primary-100 text-primary-800',
  COMPLETED: 'badge-green',
  ADJOURNED: 'badge-yellow',
  CANCELLED: 'badge-red',
}

const emptyForm = { caseId: '', date: '', time: '', location: '', notes: '' }

export default function HearingCalendar() {
  const [hearings, setHearings] = useState([])
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Calendar: which month is shown, and which day is clicked
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(null) // 'YYYY-MM-DD'

  const loadData = async () => {
    setLoading(true)
    try {
      const [hRes, cRes] = await Promise.all([
        api.get('/hearings'),
        api.get('/cases?limit=100'),
      ])
      setHearings(hRes.data.hearings || [])
      setCases(cRes.data.cases || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load hearings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.caseId || !form.date) {
      setError('Please select a case and a date.')
      return
    }
    setSaving(true)
    try {
      await api.post('/hearings', form)
      setForm(emptyForm)
      setShowForm(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule hearing.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (id, status) => {
    try {
      await api.put(`/hearings/${id}`, { status })
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update hearing.')
    }
  }

  const deleteHearing = async (id) => {
    if (!window.confirm('Delete this hearing?')) return
    try {
      await api.delete(`/hearings/${id}`)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete hearing.')
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = hearings.filter((h) => new Date(h.date) >= today)
  const past = hearings.filter((h) => new Date(h.date) < today)

  // ── Calendar helpers ──────────────────────────────────────────────
  // Turn a date into 'YYYY-MM-DD' (local time) so we can compare days
  const dayKey = (d) => {
    const x = new Date(d)
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  }

  // Group hearings by day: { '2026-12-10': [h1, h2] }
  const hearingsByDay = {}
  hearings.forEach((h) => {
    const k = dayKey(h.date)
    if (!hearingsByDay[k]) hearingsByDay[k] = []
    hearingsByDay[k].push(h)
  })

  // Build the grid: blank cells before the 1st, then 1..last day
  const firstWeekday = month.getDay() // 0 = Sunday
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)

  const todayKey = dayKey(new Date())
  const changeMonth = (step) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))
    setSelectedDay(null)
  }

  // Click a day: show its hearings; click an empty day: open the form with that date
  const clickDay = (date) => {
    const k = dayKey(date)
    setSelectedDay(k)
    if (!hearingsByDay[k]) {
      setForm({ ...emptyForm, date: k })
      setShowForm(true)
    }
  }

  const monthHearings = hearings.filter((h) => {
    const d = new Date(h.date)
    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
  })

  const HearingRow = ({ h }) => (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <p className="font-medium text-gray-900">
          {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          {h.time && <span className="text-gray-500"> • {h.time}</span>}
        </p>
        <Link to={`/cases/${h.case?.id}`} className="text-sm text-primary-700 hover:underline">
          {h.case?.title} ({h.case?.caseNumber})
        </Link>
        {h.location && <p className="text-xs text-gray-500">📍 {h.location}</p>}
        {h.notes && <p className="text-xs text-gray-500">📝 {h.notes}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge ${STATUS_BADGE[h.status] || 'badge-gray'}`}>{h.status}</span>
        <select
          value={h.status}
          onChange={(e) => changeStatus(h.id, e.target.value)}
          className="form-input text-xs py-1 w-auto"
        >
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="ADJOURNED">Adjourned</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button onClick={() => deleteHearing(h.id)} className="btn-danger text-xs">Delete</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-court-navy">Hearing Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and manage court hearings.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary shrink-0">
          {showForm ? 'Close' : '+ Schedule Hearing'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm border border-red-200">{error}</div>
      )}

      {/* New hearing form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="form-label">Case *</label>
            <select name="caseId" value={form.caseId} onChange={handleChange} className="form-input">
              <option value="">Select a case</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.caseNumber})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Date *</label>
            <input type="date" name="date" min="1950-01-01" max="2100-12-31" value={form.date} onChange={handleChange} className="form-input" />
          </div>
          <div>
            <label className="form-label">Time</label>
            <input type="time" name="time" value={form.time} onChange={handleChange} className="form-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Court Room / Location</label>
            <input name="location" value={form.location} onChange={handleChange} className="form-input" placeholder="e.g. Court Room 3, District Court" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="form-input" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Hearing'}
            </button>
          </div>
        </form>
      )}

      {/* ── Monthly calendar ───────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        {/* Month header */}
        <div className="flex items-center justify-between px-5 py-4 bg-court-navy text-white">
          <button onClick={() => changeMonth(-1)} className="px-3 py-1 rounded-lg hover:bg-white/10" aria-label="Previous month">
            ‹
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold font-serif text-court-gold">
              {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-[11px] text-white/60">{monthHearings.length} hearing(s) this month</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelectedDay(null) }}
              className="px-2 py-1 rounded-lg text-xs border border-white/30 hover:bg-white/10"
            >
              Today
            </button>
            <button onClick={() => changeMonth(1)} className="px-3 py-1 rounded-lg hover:bg-white/10" aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        {/* Weekday names */}
        <div className="grid grid-cols-7 bg-primary-50 text-center text-xs font-semibold text-primary-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-[90px] border-t border-r border-gray-100 bg-gray-50/50" />
            const k = dayKey(date)
            const dayHearings = hearingsByDay[k] || []
            const isToday = k === todayKey
            const isSelected = k === selectedDay
            return (
              <button
                key={i}
                onClick={() => clickDay(date)}
                className={`min-h-[90px] border-t border-r border-gray-100 p-1.5 text-left align-top transition-colors hover:bg-primary-50 ${
                  isSelected ? 'bg-primary-50 ring-2 ring-inset ring-primary-400' : 'bg-white'
                }`}
              >
                <span
                  className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs ${
                    isToday ? 'bg-primary-700 text-white font-bold' : 'text-gray-700'
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayHearings.slice(0, 2).map((h) => (
                    <p
                      key={h.id}
                      className={`truncate text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        h.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-700 line-through'
                          : h.status === 'ADJOURNED'
                          ? 'bg-amber-50 text-amber-700'
                          : h.status === 'COMPLETED'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-primary-100 text-primary-800'
                      }`}
                    >
                      {h.time ? `${h.time} ` : ''}{h.case?.title}
                    </p>
                  ))}
                  {dayHearings.length > 2 && (
                    <p className="text-[10px] text-gray-500 px-1">+{dayHearings.length - 2} more</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-gray-100 text-[11px] text-gray-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-100" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100" /> Adjourned</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100" /> Cancelled</span>
          <span className="ml-auto text-gray-400">Click an empty day to schedule a hearing</span>
        </div>
      </div>

      {/* Hearings on the clicked day */}
      {selectedDay && hearingsByDay[selectedDay] && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-court-navy">
              {new Date(selectedDay + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="divide-y divide-gray-100">
            {hearingsByDay[selectedDay].map((h) => <HearingRow key={h.id} h={h} />)}
          </div>
        </div>
      )}

      {/* Upcoming hearings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-court-navy mb-2">Upcoming Hearings ({upcoming.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">No upcoming hearings</p>
              <p className="text-xs text-gray-500">Click "Schedule Hearing" to add a court date.</p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-secondary text-xs shrink-0">
              + Schedule Hearing
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcoming.map((h) => <HearingRow key={h.id} h={h} />)}
          </div>
        )}
      </div>

      {/* Past hearings */}
      {past.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-court-navy mb-2">Past Hearings ({past.length})</h2>
          <div className="divide-y divide-gray-100">
            {past.map((h) => <HearingRow key={h.id} h={h} />)}
          </div>
        </div>
      )}
    </div>
  )
}
