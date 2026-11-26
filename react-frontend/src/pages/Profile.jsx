import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'

export default function Profile() {
  const { user } = useAuth()

  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handlePwChange = (e) => setPwForm({ ...pwForm, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.put('/users/profile', form)
      setMessage({ type: 'success', text: 'Profile updated. Refresh the page to see the new name everywhere.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPwMessage(null)

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setPwSaving(true)
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      setPwMessage({ type: 'success', text: res.data.message })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' })
    } finally {
      setPwSaving(false)
    }
  }

  const Message = ({ msg }) =>
    msg ? (
      <div
        className={`mb-4 p-3 rounded-lg text-sm ${
          msg.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}
      >
        {msg.text}
      </div>
    ) : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account information.</p>
      </div>

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

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-5">Edit Profile</h2>
        <Message msg={message} />

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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-5">Change Password</h2>
        <Message msg={pwMessage} />

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="form-label">Current Password</label>
            <input id="currentPassword" name="currentPassword" type="password"
              value={pwForm.currentPassword} onChange={handlePwChange}
              required autoComplete="current-password" className="form-input" />
          </div>
          <div>
            <label htmlFor="newPassword" className="form-label">New Password</label>
            <input id="newPassword" name="newPassword" type="password" minLength={8}
              value={pwForm.newPassword} onChange={handlePwChange}
              required autoComplete="new-password" className="form-input" />
            <p className="text-xs text-gray-400 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password"
              value={pwForm.confirmPassword} onChange={handlePwChange}
              required autoComplete="new-password" className="form-input" />
          </div>
          <button type="submit" disabled={pwSaving} className="btn-primary">
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
