import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './LogisticsIssuesPage.css'

const ISSUE_TYPES = [
  { value: '', label: 'Svi tipovi' },
  { value: 'customer_unavailable', label: 'Nedostupan kupac' },
  { value: 'wrong_address', label: 'Pogrešna adresa' },
  { value: 'package_damaged', label: 'Oštećenje paketa' },
  { value: 'returned_shipment', label: 'Vraćena pošiljka' },
  { value: 'other', label: 'Ostalo' }
]

const ISSUE_STATUSES = [
  { value: '', label: 'Svi statusi' },
  { value: 'open', label: 'Otvoreno' },
  { value: 'in_progress', label: 'U toku' },
  { value: 'resolved', label: 'Rešeno' }
]

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('sr-RS')
}

const formatIssueType = (value) =>
  ISSUE_TYPES.find((item) => item.value === value)?.label || value || '-'

const formatIssueStatus = (value) =>
  ISSUE_STATUSES.find((item) => item.value === value)?.label || value || '-'

const LogisticsIssuesPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const isDistributor = profile?.role === 'distributer'

  const [issues, setIssues] = useState([])
  const [selectedIssueId, setSelectedIssueId] = useState(null)
  const [filters, setFilters] = useState({ type: '', status: '', from: '', to: '' })
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [updateStatus, setUpdateStatus] = useState('open')
  const [resolutionAction, setResolutionAction] = useState('')
  const [note, setNote] = useState('')
  const [comment, setComment] = useState('')

  const loadIssues = async (activeFilters) => {
    setLoadingData(true)
    setError('')
    try {
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (activeFilters.type) params.set('type', activeFilters.type)
      if (activeFilters.status) params.set('status', activeFilters.status)
      if (activeFilters.from) params.set('from', activeFilters.from)
      if (activeFilters.to) params.set('to', activeFilters.to)
      const response = await fetch(`/api/logistics/issues?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Neuspešno učitavanje problema.')
      }
      const list = payload.issues || []
      setIssues(list)
      if (list.length > 0) {
        setSelectedIssueId((current) => current || list[0].id)
      } else {
        setSelectedIssueId(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (!user || !isDistributor) return
    loadIssues(filters)
  }, [user, isDistributor])

  const selectedIssue = useMemo(
    () => issues.find((item) => item.id === selectedIssueId) || null,
    [issues, selectedIssueId]
  )

  useEffect(() => {
    if (!selectedIssue) return
    setUpdateStatus(selectedIssue.status || 'open')
    setResolutionAction(selectedIssue.resolution_action || '')
    setNote(selectedIssue.note || '')
  }, [selectedIssue])

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const applyFilters = () => loadIssues(filters)

  const resetFilters = () => {
    const next = { type: '', status: '', from: '', to: '' }
    setFilters(next)
    loadIssues(next)
  }

  const updateIssue = async () => {
    if (!selectedIssue) return
    setError('')
    try {
      const token = localStorage.getItem('auth_access_token')
      const response = await fetch(`/api/logistics/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: updateStatus,
          resolutionAction: resolutionAction.trim() || null,
          note: note.trim() || null,
          resolvedAt: updateStatus === 'resolved' ? new Date().toISOString() : null
        })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Neuspešno ažuriranje problema.')
      }
      await loadIssues(filters)
    } catch (err) {
      setError(err.message)
    }
  }

  const addComment = async () => {
    if (!selectedIssue || !comment.trim()) return
    setError('')
    try {
      const token = localStorage.getItem('auth_access_token')
      const response = await fetch(`/api/logistics/issues/${selectedIssue.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ body: comment })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Neuspešno dodavanje komentara.')
      }
      setComment('')
      await loadIssues(filters)
    } catch (err) {
      setError(err.message)
    }
  }

  const metrics = useMemo(() => {
    const byStatus = issues.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      },
      { open: 0, in_progress: 0, resolved: 0 }
    )
    const byType = issues.reduce((acc, item) => {
      acc[item.issue_type] = (acc[item.issue_type] || 0) + 1
      return acc
    }, {})
    const topTypeEntry = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]
    return {
      total: issues.length,
      byStatus,
      topType: topTypeEntry ? formatIssueType(topTypeEntry[0]) : '-'
    }
  }, [issues])

  if (loading) {
    return (
      <div className="issues-page">
        <Navbar />
        <div className="issues-content">
          <div className="issues-card">Učitavanje...</div>
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
      <div className="issues-page">
        <Navbar />
        <div className="issues-content">
          <div className="issues-card">Nemate pristup ovoj strani.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="issues-page">
      <Navbar />
      <div className="issues-content">
        <div className="issues-card issues-card--overview">
          <div>
            <h2>Problemi u isporuci</h2>
            <p className="issues-subtitle">
              Evidencija i rešavanje izuzetaka tokom isporuke.
            </p>
          </div>
          <div className="issues-metrics">
            <div className="issues-metric">
              <span className="issues-metric-label">Ukupno slučajeva</span>
              <strong>{metrics.total}</strong>
            </div>
            <div className="issues-metric">
              <span className="issues-metric-label">Otvoreno</span>
              <strong>{metrics.byStatus.open || 0}</strong>
            </div>
            <div className="issues-metric">
              <span className="issues-metric-label">U toku</span>
              <strong>{metrics.byStatus.in_progress || 0}</strong>
            </div>
            <div className="issues-metric">
              <span className="issues-metric-label">Rešeno</span>
              <strong>{metrics.byStatus.resolved || 0}</strong>
            </div>
            <div className="issues-metric">
              <span className="issues-metric-label">Najčešći tip</span>
              <strong>{metrics.topType}</strong>
            </div>
          </div>
        </div>

        <div className="issues-card">
          <h3>Filteri</h3>
          <div className="issues-filters">
            <label>
              Tip problema
              <select value={filters.type} onChange={(event) => handleFilterChange('type', event.target.value)}>
                {ISSUE_TYPES.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
              >
                {ISSUE_STATUSES.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Od
              <input
                type="date"
                value={filters.from}
                onChange={(event) => handleFilterChange('from', event.target.value)}
              />
            </label>
            <label>
              Do
              <input
                type="date"
                value={filters.to}
                onChange={(event) => handleFilterChange('to', event.target.value)}
              />
            </label>
            <div className="issues-filter-actions">
              <button type="button" onClick={applyFilters}>
                Primeni filtere
              </button>
              <button type="button" className="secondary" onClick={resetFilters}>
                Resetuj
              </button>
            </div>
          </div>
        </div>

        <div className="issues-card issues-layout">
          <div className="issues-list">
            <h3>Problematične pošiljke</h3>
            {loadingData ? (
              <p>Učitavanje...</p>
            ) : issues.length === 0 ? (
              <p>Nema problema za prikaz.</p>
            ) : (
              issues.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`issues-list-item ${item.id === selectedIssueId ? 'active' : ''}`}
                  onClick={() => setSelectedIssueId(item.id)}
                >
                  <div>
                    <strong>Porudžbina #{item.order_id?.slice(0, 8) || '-'}</strong>
                    <span>{formatIssueType(item.issue_type)}</span>
                  </div>
                  <div>
                    <span>{formatIssueStatus(item.status)}</span>
                    <span>{formatDate(item.occurred_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="issues-details">
            <h3>Detalji problema</h3>
            {!selectedIssue ? (
              <p>Odaberite problem sa liste.</p>
            ) : (
              <>
                <div className="issues-section">
                  <h4>Pregled</h4>
                  <p>Tip: {formatIssueType(selectedIssue.issue_type)}</p>
                  <p>Status: {formatIssueStatus(selectedIssue.status)}</p>
                  <p>Datum problema: {formatDate(selectedIssue.occurred_at)}</p>
                  <p>Napomena: {selectedIssue.note || '-'}</p>
                </div>

                <div className="issues-section">
                  <h4>Pošiljka</h4>
                  <p>Primalac: {selectedIssue.order?.recipient_name || '-'}</p>
                  <p>
                    Adresa: {selectedIssue.order?.recipient_city || '-'}{' '}
                    {selectedIssue.order?.recipient_postal_code || ''}
                  </p>
                  <p>Država: {selectedIssue.order?.recipient_country || '-'}</p>
                  <p>Telefon: {selectedIssue.order?.recipient_phone || '-'}</p>
                  <p>Kurier: {selectedIssue.order?.courier_name || '-'}</p>
                  <p>Tracking: {selectedIssue.order?.tracking_number || '-'}</p>
                </div>

                <div className="issues-section">
                  <h4>Istorija isporuke</h4>
                  {(selectedIssue.order?.shipment_events || []).length === 0 ? (
                    <p>Nema događaja.</p>
                  ) : (
                    <div className="issues-events">
                      {selectedIssue.order.shipment_events.map((event) => (
                        <div key={event.id} className="issues-event">
                          <span>{event.status}</span>
                          <span>{formatDate(event.occurred_at)}</span>
                          <span>{event.actor || '-'}</span>
                          <span>{event.note || '-'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="issues-section">
                  <h4>Ažuriranje statusa</h4>
                  <div className="issues-update">
                    <label>
                      Status
                      <select value={updateStatus} onChange={(event) => setUpdateStatus(event.target.value)}>
                        {ISSUE_STATUSES.filter((item) => item.value).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Akcija rešavanja
                      <input
                        type="text"
                        value={resolutionAction}
                        onChange={(event) => setResolutionAction(event.target.value)}
                        placeholder="Npr. ponovna isporuka"
                      />
                    </label>
                    <label>
                      Interna napomena
                      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
                    </label>
                    <button type="button" onClick={updateIssue}>
                      Sačuvaj izmene
                    </button>
                  </div>
                </div>

                <div className="issues-section">
                  <h4>Komentari</h4>
                  {(selectedIssue.comments || []).length === 0 ? (
                    <p>Nema komentara.</p>
                  ) : (
                    <div className="issues-comments">
                      {selectedIssue.comments.map((item) => (
                        <div key={item.id} className="issues-comment">
                          <div>
                            <strong>{item.author || 'distributer'}</strong>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                          <p>{item.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="issues-comment-form">
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Dodaj interni komentar"
                      rows={3}
                    />
                    <button type="button" onClick={addComment}>
                      Dodaj komentar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {error && <div className="issues-card issues-error">{error}</div>}
      </div>
    </div>
  )
}

export default LogisticsIssuesPage
