import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AuthLayout from '../components/layout/AuthLayout.jsx'

export default function Login() {
  const { login }     = useAuth()
  const navigate      = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [notRegistered, setNotRegistered] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotRegistered(false)
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
      setNotRegistered(err.response?.data?.code === 'USER_NOT_FOUND')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div>
          <h2 className="text-2xl font-bold text-court-navy mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
              {notRegistered && (
                <div className="mt-2">
                  <Link to="/register" className="font-semibold underline">
                    Create an account →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email" name="email" type="email"
                value={form.email} onChange={handleChange}
                required autoComplete="email"
                className="form-input"
                placeholder="judge@districtcourt.gov.in"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password" name="password" type="password"
                value={form.password} onChange={handleChange}
                required autoComplete="current-password"
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary-700 hover:underline">
              Register
            </Link>
          </p>
        </div>
    </AuthLayout>
  )
}
