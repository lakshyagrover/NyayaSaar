import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Profile() {
  const { user } = useAuth()
  const [form, setForm]     = useState({ name: user?.name || '', email: user?.email || '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    // TODO: Call PUT /api/users/profile
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Profile updated! (API not yet connected)' })
      setSaving(false)
    }, 800)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account information.</p>
      </div>

      {/* Avatar */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="badge badge-blue mt-1">{user?.role || 'User'}</span>
        </div>
      </div>

      {/* Edit form */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-5">Edit Profile</h2>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                                     : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="form-label">Full Name</label>
            <input id="name" name="name" value={form.name} onChange={handleChange}
              required className="form-input" />
          </div>
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange}
              required className="form-input" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password placeholder */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-2">Change Password</h2>
        <p className="text-sm text-gray-500">Password change will be enabled once the backend is connected.</p>
      </div>
    </div>
  )
}
