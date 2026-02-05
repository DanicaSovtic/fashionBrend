import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ResetPasswordPage.css'

const getAccessTokenFromUrl = () => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashParams = new URLSearchParams(hash)
  const queryParams = new URLSearchParams(window.location.search)
  return hashParams.get('access_token') || queryParams.get('access_token')
}

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const accessToken = useMemo(() => getAccessTokenFromUrl(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!accessToken) {
      setError('Nedostaje token za reset lozinke.')
      return
    }
    if (!password || password.length < 6) {
      setError('Unesite lozinku (minimum 6 karaktera).')
      return
    }
    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju.')
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken, password })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Reset lozinke nije uspeo.')
      }
      setInfo('Lozinka je uspešno promenjena. Možete da se ulogujete.')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => navigate('/auth'), 1200)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="reset-page">
      <div className="reset-card">
        <h2>Postavite novu lozinku</h2>
        <form onSubmit={handleSubmit} className="reset-form">
          <label>
            Nova lozinka
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Potvrdi lozinku
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit">Sačuvaj lozinku</button>
        </form>
        {error && <p className="reset-error">{error}</p>}
        {info && <p className="reset-info">{info}</p>}
      </div>
    </div>
  )
}

export default ResetPasswordPage
