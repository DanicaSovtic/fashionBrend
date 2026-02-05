import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './LogisticsDashboard.css'

const STATUS_LABELS = {
  ready_for_shipping: 'Spremno za slanje',
  in_transit: 'U transportu',
  delivered: 'Isporučeno',
  return_requested: 'Povrat - zahtev',
  return_approved: 'Povrat - odobren',
  return_in_transit: 'Povrat - u transportu',
  return_received: 'Povrat - primljeno',
  failed_delivery: 'Neuspešna dostava'
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('sr-RS')
}

const formatStatus = (status) => STATUS_LABELS[status] || status || '-'

const LogisticsDashboard = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(false)

  const isDistributor = profile?.role === 'distributer'

  useEffect(() => {
    if (!user || !isDistributor) {
      return
    }
    const controller = new AbortController()
    const loadData = async () => {
      setLoadingData(true)
      setError('')
      try {
        const token = localStorage.getItem('auth_access_token')
        const response = await fetch('/api/logistics/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Neuspešno učitavanje logistike.')
        }
        setDashboard(payload)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
    return () => controller.abort()
  }, [user, isDistributor])

  const orders = dashboard?.orders || []
  const returns = dashboard?.returns || []
  const metrics = dashboard?.metrics || {}

  const statusSummary = useMemo(() => {
    const byStatus = metrics.byStatus || {}
    return [
      { key: 'ready_for_shipping', label: formatStatus('ready_for_shipping'), value: byStatus.ready_for_shipping || 0 },
      { key: 'in_transit', label: formatStatus('in_transit'), value: byStatus.in_transit || 0 },
      { key: 'delivered', label: formatStatus('delivered'), value: byStatus.delivered || 0 }
    ]
  }, [metrics])

  if (loading) {
    return (
      <div className="logistics-page">
        <Navbar />
        <div className="logistics-content">
          <div className="logistics-card">Učitavanje...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  if (!isDistributor) {
    return (
      <div className="logistics-page">
        <Navbar />
        <div className="logistics-content">
          <div className="logistics-card">Nemate pristup ovoj strani.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="logistics-page">
      <Navbar />
      <div className="logistics-content">
        <div className="logistics-card logistics-card--overview">
          <div>
            <h2>Logistika - pregled</h2>
            <p className="logistics-subtitle">
              Praćenje narudžbina, statusa isporuke i povrata.
            </p>
          </div>
          <div className="logistics-metrics">
            <div className="logistics-metric">
              <span className="logistics-metric-label">Aktivne pošiljke</span>
              <strong>{metrics.activeShipments ?? 0}</strong>
            </div>
            <div className="logistics-metric">
              <span className="logistics-metric-label">Prosečno vreme isporuke</span>
              <strong>{metrics.averageDeliveryDays ? `${metrics.averageDeliveryDays} dana` : '-'}</strong>
            </div>
            <div className="logistics-metric">
              <span className="logistics-metric-label">Neuspešne isporuke</span>
              <strong>{metrics.failedDeliveries ?? 0}</strong>
            </div>
            <div className="logistics-metric">
              <span className="logistics-metric-label">Stopa povrata</span>
              <strong>{metrics.returnRate ? `${metrics.returnRate}%` : '0%'}</strong>
            </div>
          </div>
          <div className="logistics-status-summary">
            {statusSummary.map((item) => (
              <div key={item.key} className="logistics-status-pill">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="logistics-card">
          <h3>Aktivne pošiljke</h3>
          {loadingData ? (
            <p>Učitavanje pošiljki...</p>
          ) : orders.length === 0 ? (
            <p>Nema aktivnih pošiljki za prikaz.</p>
          ) : (
            <div className="logistics-orders">
              {orders.map((order) => {
                const items = order.order_items || []
                const events = (order.shipment_events || []).slice().sort((a, b) => {
                  const aTime = new Date(a.occurred_at || 0).getTime()
                  const bTime = new Date(b.occurred_at || 0).getTime()
                  return bTime - aTime
                })

                return (
                  <div key={order.id} className="logistics-order">
                    <div className="logistics-order-header">
                      <div>
                        <h4>Porudžbina #{order.id?.slice(0, 8) || '-'}</h4>
                        <p className="logistics-muted">Kreirana: {formatDate(order.created_at)}</p>
                      </div>
                      <span className="logistics-status">{formatStatus(order.status)}</span>
                    </div>

                    <div className="logistics-grid">
                      <div className="logistics-section">
                        <h5>Primalac</h5>
                        <p>{order.recipient_name || '-'}</p>
                        <p>
                          {order.recipient_city || '-'} {order.recipient_postal_code || ''}
                        </p>
                        <p>{order.recipient_country || '-'}</p>
                        <p>Tel: {order.recipient_phone || '-'}</p>
                      </div>
                      <div className="logistics-section">
                        <h5>Isporuka</h5>
                        <p>Kurier: {order.courier_name || '-'}</p>
                        <p>Tracking: {order.tracking_number || '-'}</p>
                        <p>Planirano: {formatDate(order.planned_delivery)}</p>
                        <p>Poslednja izmena: {formatDate(order.last_status_at)}</p>
                        <p>Izmenio: {order.last_status_by || '-'}</p>
                        <p>Napomena: {order.last_status_note || '-'}</p>
                      </div>
                    </div>

                    <div className="logistics-section">
                      <h5>Sadržaj pošiljke</h5>
                      {items.length === 0 ? (
                        <p>Nema artikala.</p>
                      ) : (
                        <div className="logistics-items">
                          {items.map((item) => (
                            <div key={item.id} className="logistics-item">
                              <span>{item.product_name || item.product?.title || 'Artikal'}</span>
                              <span>Šifra: {item.product_sku || '-'}</span>
                              <span>Veličina: {item.size || '-'}</span>
                              <span>Boja: {item.color || '-'}</span>
                              <span>Količina: {item.quantity || 0}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="logistics-section">
                      <h5>Istorija statusa</h5>
                      {events.length === 0 ? (
                        <p>Nema događaja.</p>
                      ) : (
                        <div className="logistics-events">
                          {events.map((event) => (
                            <div key={event.id} className="logistics-event">
                              <span>{formatStatus(event.status)}</span>
                              <span>{formatDate(event.occurred_at)}</span>
                              <span>{event.actor || '-'}</span>
                              <span>{event.note || '-'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="logistics-card">
          <h3>Reverse logistika (povrati)</h3>
          {loadingData ? (
            <p>Učitavanje povrata...</p>
          ) : returns.length === 0 ? (
            <p>Nema povrata za prikaz.</p>
          ) : (
            <div className="logistics-returns">
              {returns.map((item) => (
                <div key={item.id} className="logistics-return">
                  <div>
                    <h4>Povrat #{item.id?.slice(0, 8) || '-'}</h4>
                    <p className="logistics-muted">
                      Porudžbina: {item.order?.id?.slice(0, 8) || item.order_id || '-'}
                    </p>
                  </div>
                  <div className="logistics-return-details">
                    <span>Status: {formatStatus(item.status)}</span>
                    <span>Razlog: {item.reason || '-'}</span>
                    <span>Primljeno: {formatDate(item.received_at)}</span>
                    <span>Kreirano: {formatDate(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="logistics-card logistics-error">{error}</div>}
      </div>
    </div>
  )
}

export default LogisticsDashboard
