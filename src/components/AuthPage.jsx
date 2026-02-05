import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const AuthPage = () => {
  const { user, profile, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    try {
      const result = await login(loginEmail.trim(), loginPassword)
      setLoginPassword('')
      if (result?.profile?.role === 'distributer') {
        navigate('/logistics')
      } else {
        navigate('/shop')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    setError('')
    setInfo('')
    try {
      await logout()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">Učitavanje...</div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Prijava</h2>
        {!user && (
          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Lozinka
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit">Uloguj se</button>
          </form>
        )}

        {user && profile && (
          <div className="auth-profile">
            <p>
              Ulogovani ste kao <strong>{profile.full_name}</strong>
            </p>
            <p>Rola: {profile.role}</p>
            <button type="button" onClick={handleLogout}>
              Izloguj se
            </button>
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}
      </div>
    </div>
  )
}

export default AuthPage
