import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken]     = useState(() => localStorage.getItem('token'))

  // Validate stored token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('token')
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: jwt, user: userData } = res.data
    localStorage.setItem('token', jwt)
    setToken(jwt)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (formData) => {
    const res = await api.post('/auth/register', formData)
    const { token: jwt, user: userData } = res.data
    localStorage.setItem('token', jwt)
    setToken(jwt)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch (_) { /* ignore */ }
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
