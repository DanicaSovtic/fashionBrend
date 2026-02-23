import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'
import './MarketingLoyaltyPage.css'

const tierLabels = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }

const MarketingLoyaltyPage = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [members, setMembers] = useState([])
  const [config, setConfig] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTier, setFilterTier] = useState('')

  useEffect(() => {
    if (!user || (profile?.role !== 'marketing_asistent' && profile?.role !== 'superadmin')) {
      navigate('/')
      return
    }
    const token = localStorage.getItem('auth_access_token')
    if (!token) {
      navigate('/auth')
      return
    }
    const params = new URLSearchParams()
    if (filterTier) params.set('tier', filterTier)
    fetch(`/api/marketing/loyalty/members?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : { members: [], config: [] }))
      .then((data) => {
        setMembers(data.members || [])
        setConfig(data.config || [])
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [user, profile, navigate, filterTier])

  const formatDate = (d) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return d
    }
  }

  return (
    <div className="marketing-loyalty-page">
      <Navbar />
      <div className="marketing-loyalty-container">
        <header className="marketing-loyalty-header">
          <h1>Klub lojalnosti</h1>
          <p>Pregled kupaca po nivou i poenima – za personalizovane ponude i praćenje napretka</p>
        </header>

        <section className="marketing-loyalty-card">
          <div className="marketing-loyalty-toolbar">
            <label className="marketing-loyalty-filter">
              <span>Nivo:</span>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="marketing-loyalty-select"
              >
                <option value="">Svi nivoi</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </label>
            {!loading && (
              <span className="marketing-loyalty-count">
                {members.length} {members.length === 1 ? 'kupac' : 'kupaca'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="marketing-loyalty-loading">Učitavanje...</div>
          ) : members.length === 0 ? (
            <div className="marketing-loyalty-empty">
              Nema kupaca sa ulogom krajnji korisnik ili nema rezultata za izabrani filter.
            </div>
          ) : (
            <div className="marketing-loyalty-table-wrap">
              <table className="marketing-loyalty-table">
                <thead>
                  <tr>
                    <th>Kupac</th>
                    <th>Nivo</th>
                    <th>Poeni (saldo)</th>
                    <th>Poeni (12 m)</th>
                    <th>Sledeći nivo</th>
                    <th>Do sledećeg</th>
                    <th>Ažurirano</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.user_id}>
                      <td className="marketing-loyalty-name">{m.full_name}</td>
                      <td>
                        <span className={`marketing-loyalty-badge marketing-loyalty-badge--${m.tier}`}>
                          {tierLabels[m.tier] || m.tier}
                        </span>
                      </td>
                      <td className="marketing-loyalty-num">{m.points_balance}</td>
                      <td className="marketing-loyalty-num">{m.points_earned_12m}</td>
                      <td>{m.next_tier ? tierLabels[m.next_tier] || m.next_tier : '—'}</td>
                      <td className="marketing-loyalty-num">{m.points_to_next > 0 ? m.points_to_next : '—'}</td>
                      <td className="marketing-loyalty-date">{formatDate(m.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {config.length > 0 && (
          <aside className="marketing-loyalty-config">
            <h3>Pragovi nivoa (poslednjih 12 meseci)</h3>
            <ul>
              {config.map((c) => (
                <li key={c.tier}>
                  <strong>{tierLabels[c.tier] || c.tier}</strong> — od {c.min_points_12m} poena (×{c.multiplier})
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  )
}

export default MarketingLoyaltyPage
