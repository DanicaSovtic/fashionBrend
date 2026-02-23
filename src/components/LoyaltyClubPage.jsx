import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './LoyaltyClubPage.css'

const tierLabels = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }

const LoyaltyClubPage = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || profile?.role !== 'krajnji_korisnik') {
      navigate('/')
      return
    }
    const token = localStorage.getItem('auth_access_token')
    if (!token) {
      navigate('/auth')
      return
    }
    fetch('/api/loyalty/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, profile, navigate])

  if (loading) {
    return (
      <div className="klub-page">
        <Navbar />
        <div className="klub-container">
          <p className="klub-loading">Učitavanje...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="klub-page">
        <Navbar />
        <div className="klub-container">
          <p className="klub-empty">Pristup klubu imaju samo ulogovani kupci. Ulogujte se da vidite svoj status.</p>
        </div>
      </div>
    )
  }

  const tier = data.tier || 'silver'
  const pointsBalance = data.points_balance ?? 0
  const points12m = data.points_earned_12m ?? 0
  const nextTier = data.next_tier
  const pointsToNext = nextTier ? nextTier.min_points_12m - points12m : 0
  const nextTierMin = nextTier ? nextTier.min_points_12m : 0
  const progressPercent = nextTierMin > 0 ? Math.min(100, Math.round((points12m / nextTierMin) * 100)) : 100

  return (
    <div className="klub-page">
      <Navbar />
      <div className="klub-container">
        <header className="klub-hero">
          <h1>Klub lojalnosti</h1>
          <p>Kao ulogovani kupac automatski ste u klubu. Svaka kupovina donosi poene – što više kupujete, prelazite u viši nivo i brže skupljate poene.</p>
        </header>

        <section className="klub-status-card">
          <h2>Vaš status</h2>
          <div className="klub-status-row">
            <span className={`klub-tier-badge klub-tier-badge--${tier}`}>
              {tierLabels[tier] || tier}
            </span>
            <span className="klub-points-main">
              <span>{pointsBalance}</span> poena
            </span>
            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>raspoloživo za iskoristi</span>
          </div>
          <p className="klub-points-sub">Poeni u poslednjih 12 meseci (za nivo): <strong>{points12m}</strong></p>

          {nextTier ? (
            <div className="klub-progress-wrap">
              <div className="klub-progress-label">
                <span>Napredak do {tierLabels[nextTier.tier]}</span>
                <strong>{points12m} / {nextTierMin} poena</strong>
              </div>
              <div className="klub-progress-bar">
                <div className="klub-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="klub-next-tier-msg">
                Do nivoa <strong>{tierLabels[nextTier.tier]}</strong> potrebno vam je još <strong>{pointsToNext}</strong> poena u periodu od 12 meseci.
              </p>
            </div>
          ) : (
            <p className="klub-next-tier-msg" style={{ borderLeftColor: '#3730a3' }}>
              Dostigli ste najviši nivo – <strong>Platinum</strong>. Nastavite da kupujete i koristite poene za popust na checkoutu.
            </p>
          )}
        </section>

        <section className="klub-how-card">
          <h2>Kako funkcioniše</h2>
          <ul className="klub-how-list">
            <li>Pristup klubu imaju samo ulogovani kupci</li>
            <li>Pri svakoj kupovini automatski dobijate poene: 1 poen na 100 RSD, sa multiplikatorom po nivou.</li>
            <li><strong>Silver:</strong> 1× &nbsp;|&nbsp; <strong>Gold:</strong> 1.1× &nbsp;|&nbsp; <strong>Platinum:</strong> 1.25×</li>
            <li>Poene možete iskoristiti za popust pri sledećoj kupovini (na checkoutu).</li>
            <li>Nivo se računa na osnovu poena u poslednjih 12 meseci.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default LoyaltyClubPage
