import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import './DesignerCollectionsPage.css'

const COLORS_SOURCE = ['#5a7d5a', '#8b7355', '#6b8e9e', '#c4a77d', '#9b8b6e']

const AnalitikaPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0 })
  const [topProducts, setTopProducts] = useState([])
  const [salesByPeriod, setSalesByPeriod] = useState([])
  const [salesBySource, setSalesBySource] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    if (user && (profile?.role === 'marketing_asistent' || profile?.role === 'superadmin')) {
      fetchAnalytics()
    }
  }, [user, profile, filters])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (filters.dateFrom) params.append('date_from', filters.dateFrom)
      if (filters.dateTo) params.append('date_to', filters.dateTo)

      const res = await fetch(`/api/analytics/dashboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Greška pri učitavanju analitike')
      }

      const data = await res.json()
      setSummary(data.summary || { totalRevenue: 0, totalOrders: 0 })
      setTopProducts(data.topProducts || [])
      setSalesByPeriod(data.salesByPeriod || [])
      setSalesBySource(data.salesBySource || [])
    } catch (err) {
      setError(err.message || 'Greška pri učitavanju analitike')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    if (amount == null) return '0,00 RSD'
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading || isLoading) {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Učitavanje analitike...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  if (profile?.role !== 'marketing_asistent' && profile?.role !== 'superadmin') {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Nemate pristup ovoj strani. Potrebna uloga: Marketing asistent ili Superadmin.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="designer-page">
      <Navbar />
      <div className="designer-content">
        <div className="designer-card designer-card--hero">
          <h2>Analitika</h2>
          <p className="designer-subtitle">
            Pregled najprodavanijih proizvoda, prodaje po periodu i po izvoru (sajt, društvene mreže)
          </p>
        </div>

        {error && (
          <div className="designer-card" style={{ background: '#fef2f2', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        {/* Filteri */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '16px' }}>Period</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '160px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>Od datuma</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>Do datuma</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.95rem' }}
              />
            </div>
            <button
              type="button"
              className="designer-primary-button"
              onClick={fetchAnalytics}
              style={{ padding: '10px 20px' }}
            >
              Primeni
            </button>
          </div>
        </div>

        {/* Rezime */}
        <div className="designer-card">
          <div className="designer-metrics">
            <div className="designer-metric">
              <div className="designer-metric-label">Ukupna prodaja (izabrani period)</div>
              <div className="designer-metric-value" style={{ color: '#10b981', fontSize: '1.5rem' }}>
                {formatCurrency(summary.totalRevenue)}
              </div>
            </div>
            <div className="designer-metric">
              <div className="designer-metric-label">Broj porudžbina</div>
              <div className="designer-metric-value" style={{ fontSize: '1.5rem' }}>
                {summary.totalOrders}
              </div>
            </div>
          </div>
        </div>

        {/* Prodaja po mesecu */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Prodaja po mesecu</h3>
          {salesByPeriod.length > 0 ? (
            <div style={{ width: '100%', height: '340px', maxWidth: '720px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesByPeriod}
                  margin={{ top: 16, right: 24, left: 8, bottom: 64 }}
                  barCategoryGap="28%"
                  barGap={8}
                  maxBarSize={52}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e6e9" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    angle={-45}
                    textAnchor="end"
                    height={72}
                    tick={{ fontSize: 12, fill: '#5a5463' }}
                    axisLine={{ stroke: '#e0dde3' }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: '#5a5463' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e8e6e9' }}
                    cursor={{ fill: 'rgba(90, 125, 90, 0.08)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8 }} iconSize={10} iconType="square" />
                  <Bar
                    dataKey="totalRevenue"
                    name="Prihod (RSD)"
                    fill="#5a7d5a"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive
                    animationDuration={400}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="designer-subtitle" style={{ padding: '1rem 0' }}>Nema podataka za izabrani period.</p>
          )}
        </div>

        {/* Najprodavaniji proizvodi */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Najprodavaniji proizvodi</h3>
          {topProducts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>#</th>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>Proizvod</th>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>Prodatih komada</th>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>Prihod (RSD)</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((row, idx) => (
                    <tr key={row.product_id || idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 8px' }}>{row.product_name || '-'}</td>
                      <td style={{ padding: '12px 8px' }}>{row.quantity}</td>
                      <td style={{ padding: '12px 8px' }}>{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="designer-subtitle" style={{ padding: '1rem 0' }}>Nema podataka o proizvodima za izabrani period.</p>
          )}
        </div>

        {/* Prodaja po izvoru (sajt, Instagram, itd.) */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Odakle kupci dolaze</h3>
          <p className="designer-subtitle" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
            Prikazuje da li je kupovina došla preko sajta, društvene mreže ili druge kampanje (npr. link sa ?utm_source=instagram).
          </p>
          {salesBySource.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ width: '100%', maxWidth: '400px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesBySource}
                      dataKey="totalRevenue"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ source, totalRevenue }) => `${source}: ${formatCurrency(totalRevenue)}`}
                    >
                      {salesBySource.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_SOURCE[index % COLORS_SOURCE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {salesBySource.map((row, idx) => (
                    <li key={row.source} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                      <span style={{ fontWeight: '500' }}>{row.source}</span>
                      <span>{formatCurrency(row.totalRevenue)} ({row.orderCount} porudžbina)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="designer-subtitle" style={{ padding: '1rem 0' }}>Nema podataka po izvoru za izabrani period. Starije porudžbine su označene kao „Sajt”.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalitikaPage
