import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const AuthPage = () => {
  const { user, profile, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
              <div className="auth-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sakrij lozinku' : 'Prikazi lozinku'}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M12 5c-5.5 0-9.5 4.8-10.7 6.4a1 1 0 0 0 0 1.2C2.5 14.2 6.5 19 12 19s9.5-4.8 10.7-6.4a1 1 0 0 0 0-1.2C21.5 9.8 17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
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
