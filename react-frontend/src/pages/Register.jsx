import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ROLES = ['Judge', 'Advocate', 'Court Staff', 'Researcher']

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'Advocate' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-court-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-court-navy">AI Court Summarizer</h1>
          <p className="mt-2 text-gray-500 text-sm">Create your account</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Register</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="form-label">Full Name</label>
              <input id="name" name="name" type="text" value={form.name} onChange={handleChange}
                required className="form-input" placeholder="Advocate John Doe" />
            </div>

            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange}
                required className="form-input" placeholder="john@bar.com" />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" name="password" type="password" value={form.password} onChange={handleChange}
                required minLength={8} className="form-input" placeholder="Min. 8 characters" />
            </div>

            <div>
              <label htmlFor="role" className="form-label">Role</label>
              <select id="role" name="role" value={form.role} onChange={handleChange} className="form-input">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-700 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
