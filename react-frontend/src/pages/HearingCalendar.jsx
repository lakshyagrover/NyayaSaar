import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api.js'

const STATUS_BADGE = {
  SCHEDULED: 'badge-blue',
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
          <h1 className="text-2xl font-bold text-gray-900">Hearing Calendar</h1>
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
            <input type="date" name="date" value={form.date} onChange={handleChange} className="form-input" />
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

      {/* Upcoming hearings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Upcoming Hearings ({upcoming.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-medium text-gray-600">No upcoming hearings</p>
            <p className="text-sm mt-1">Click "Schedule Hearing" to add a court date.</p>
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
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Past Hearings ({past.length})</h2>
          <div className="divide-y divide-gray-100">
            {past.map((h) => <HearingRow key={h.id} h={h} />)}
          </div>
        </div>
      )}
    </div>
  )
}
