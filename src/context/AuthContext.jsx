import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const AUTH_STORAGE_KEY = 'auth_access_token'

const ROLE_OPTIONS = [
  { value: 'modni_dizajner', label: '🎨 Modni dizajneri' },
  { value: 'dobavljac', label: '🧵 Dobavljaci' },
  { value: 'proizvodjac', label: '✂️ Proizvodjaci' },
  { value: 'tester_kvaliteta', label: '🧪 Tester kvaliteta' },
  { value: 'laborant', label: '🔬 Laborant' },
  { value: 'distributer', label: '📦 Distributer / logistika' },
  { value: 'krajnji_korisnik', label: '👤 Krajnji korisnik' }
]

const getStoredToken = () => localStorage.getItem(AUTH_STORAGE_KEY)

const apiFetch = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error || 'Request failed'
    throw new Error(message)
  }

  return data
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const setSession = (session) => {
    if (session?.access_token) {
      localStorage.setItem(AUTH_STORAGE_KEY, session.access_token)
    }
  }

  const clearSession = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const getMe = async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setProfile(null)
      return null
    }

    const data = await apiFetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    setUser(data.user)
    setProfile(data.profile)
    return data
  }

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })

    setSession(data.session)
    setUser(data.user)
    setProfile(data.profile)
    return data
  }

  const logout = async () => {
    const token = getStoredToken()
    if (token) {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    }
    clearSession()
    setUser(null)
    setProfile(null)
  }

  const registerUser = async (email, password, fullName, role) => {
    const token = getStoredToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const data = await apiFetch('/api/auth/admin/create-user', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ email, password, fullName, role })
    })

    return data
  }

  const fetchUsers = async () => {
    const token = getStoredToken()
    if (!token) {
      throw new Error('Not authenticated')
    }
    return apiFetch('/api/auth/admin/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }

  const updateUserProfile = async (userId, { fullName, role }) => {
    const token = getStoredToken()
    if (!token) {
      throw new Error('Not authenticated')
    }
    return apiFetch(`/api/auth/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ fullName, role })
    })
  }

  const deleteUser = async (userId) => {
    const token = getStoredToken()
    if (!token) {
      throw new Error('Not authenticated')
    }
    return apiFetch(`/api/auth/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }

  useEffect(() => {
    const run = async () => {
      try {
        await getMe()
      } catch (error) {
        clearSession()
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      roleOptions: ROLE_OPTIONS,
      login,
      logout,
      registerUser,
      fetchUsers,
      updateUserProfile,
      deleteUser,
      refresh: getMe
    }),
    [user, profile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
