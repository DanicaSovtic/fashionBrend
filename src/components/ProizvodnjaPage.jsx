import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'

const ProizvodnjaPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  
  const [collections, setCollections] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [activeTab, setActiveTab] = useState('shipments') // 'shipments' ili 'sewing-orders'
  
  // Shipments state
  const [shipments, setShipments] = useState([])
  const [isLoadingShipments, setIsLoadingShipments] = useState(true)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [shipmentDetails, setShipmentDetails] = useState(null)
  const [problemForm, setProblemForm] = useState({
    reason: '',
    comment: ''
  })
  const [showProblemModal, setShowProblemModal] = useState(false)
  
  // Sewing orders state
  const [sewingOrders, setSewingOrders] = useState([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderDetails, setOrderDetails] = useState(null)
  const [proofDocumentUrl, setProofDocumentUrl] = useState('')
  const [showSewingOrderSuccess, setShowSewingOrderSuccess] = useState(false)
  const [newSewingOrderId, setNewSewingOrderId] = useState(null)
  
  // Stats
  const [stats, setStats] = useState({
    pending_shipments: 0,
    received_shipments: 0,
    confirmed_shipments: 0,
    problem_shipments: 0,
    new_orders: 0,
    in_progress_orders: 0,
    completed_orders: 0
  })

  // Učitaj kolekcije
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const token = localStorage.getItem('auth_access_token')
        const res = await fetch('/api/collections', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await res.json()
        setCollections(data || [])
      } catch (error) {
        console.error('Error fetching collections:', error)
      }
    }
    fetchCollections()
  }, [])

  // Učitaj statistiku
  useEffect(() => {
    if (user && profile?.role === 'proizvodjac') {
      fetchStats()
    }
  }, [user, profile])

  // Učitaj pošiljke
  useEffect(() => {
    if (user && profile?.role === 'proizvodjac' && activeTab === 'shipments') {
      fetchShipments()
    }
  }, [user, profile, activeTab, selectedCollectionId])

  // Učitaj naloge za šivenje
  useEffect(() => {
    if (user && profile?.role === 'proizvodjac' && activeTab === 'sewing-orders') {
      fetchSewingOrders()
    }
  }, [user, profile, activeTab, selectedCollectionId])

  // Učitaj detalje pošiljke
  useEffect(() => {
    if (selectedShipment) {
      fetchShipmentDetails(selectedShipment.id)
      // Resetuj success poruku kada se promeni shipment
      setShowSewingOrderSuccess(false)
      setNewSewingOrderId(null)
    }
  }, [selectedShipment])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch('/api/manufacturer/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setStats(data || {})
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchShipments = async () => {
    try {
      setIsLoadingShipments(true)
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (selectedCollectionId) params.append('collection_id', selectedCollectionId)

      const res = await fetch(`/api/manufacturer/shipments?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setShipments(data.shipments || [])
    } catch (error) {
      console.error('Error fetching shipments:', error)
    } finally {
      setIsLoadingShipments(false)
    }
  }

  const fetchSewingOrders = async () => {
    try {
      setIsLoadingOrders(true)
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (selectedCollectionId) params.append('collection_id', selectedCollectionId)

      const res = await fetch(`/api/manufacturer/sewing-orders?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setSewingOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching sewing orders:', error)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const fetchShipmentDetails = async (shipmentId) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/manufacturer/shipments/${shipmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setShipmentDetails(data.shipment)
      
      // Ako je shipment potvrđen, proveri da li postoji sewing_order
      if (data.shipment?.status === 'confirmed') {
        const ordersRes = await fetch(`/api/manufacturer/sewing-orders?shipment_id=${shipmentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const ordersData = await ordersRes.json()
        if (ordersData.orders && ordersData.orders.length > 0) {
          setNewSewingOrderId(ordersData.orders[0].id)
          setShowSewingOrderSuccess(true)
        }
      }
    } catch (error) {
      console.error('Error fetching shipment details:', error)
    }
  }

  const handleConfirmShipment = async () => {
    if (!selectedShipment) return

    if (!confirm('Da li ste sigurni da želite da potvrdite prijem materijala?')) {
      return
    }

    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/manufacturer/shipments/${selectedShipment.id}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity_pieces: 1 // Default, može se dodati input polje kasnije
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri potvrdi prijema')
      }

      const data = await res.json()
      
      // Prikaži poruku sa dugmetom za otvaranje naloga
      if (data.sewing_order) {
        setNewSewingOrderId(data.sewing_order.id)
        setShowSewingOrderSuccess(true)
      }

      await fetchShipments()
      await fetchStats()
      await fetchSewingOrders() // Osveži listu naloga
    } catch (error) {
      alert(error.message || 'Greška pri potvrdi prijema')
    }
  }

  const handleOpenSewingOrder = () => {
    if (newSewingOrderId) {
      setActiveTab('sewing-orders')
      setSelectedOrder({ id: newSewingOrderId })
      setShowSewingOrderSuccess(false)
      setNewSewingOrderId(null)
      // Učitaj detalje naloga
      fetchOrderDetails(newSewingOrderId)
    }
  }

  const fetchOrderDetails = async (orderId) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/manufacturer/sewing-orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setOrderDetails(data.order)
    } catch (error) {
      console.error('Error fetching order details:', error)
    }
  }

  const handleReportProblem = async () => {
    if (!problemForm.reason) {
      alert('Molimo izaberite razlog problema')
      return
    }

    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/manufacturer/shipments/${selectedShipment.id}/report-problem`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_reason: problemForm.reason,
          problem_comment: problemForm.comment || null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri prijavi problema')
      }

      alert('Problem je prijavljen. Dobavljač će biti obavešten.')
      await fetchShipments()
      await fetchStats()
      setShowProblemModal(false)
      setProblemForm({ reason: '', comment: '' })
      setSelectedShipment(null)
      setShipmentDetails(null)
    } catch (error) {
      alert(error.message || 'Greška pri prijavi problema')
    }
  }

  const handleStartSewingOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/manufacturer/sewing-orders/${orderId}/start`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri pokretanju naloga')
      }

      await fetchSewingOrders()
      await fetchStats()
      if (selectedOrder?.id === orderId) {
        await fetchOrderDetails(orderId)
      }
      alert('Nalog za šivenje je pokrenut')
    } catch (error) {
      alert(error.message || 'Greška pri pokretanju naloga')
    }
  }

  const handleCompleteSewingOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/manufacturer/sewing-orders/${orderId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          proof_document_url: proofDocumentUrl || null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri završavanju naloga')
      }

      await fetchSewingOrders()
      await fetchStats()
      if (selectedOrder?.id === orderId) {
        await fetchOrderDetails(orderId)
      }
      setProofDocumentUrl('')
      alert('Nalog za šivenje je završen')
    } catch (error) {
      alert(error.message || 'Greška pri završavanju naloga')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusLabel = (status) => {
    const labels = {
      'sent_to_manufacturer': 'Poslato',
      'received': 'Primljeno',
      'confirmed': 'Potvrđeno',
      'problem_reported': 'Problem prijavljen',
      'new': 'Novo',
      'in_progress': 'U radu',
      'completed': 'Završeno'
    }
    return labels[status] || status
  }

  const getStatusColor = (status) => {
    const colors = {
      'sent_to_manufacturer': '#3b82f6',
      'received': '#f59e0b',
      'confirmed': '#10b981',
      'problem_reported': '#ef4444',
      'new': '#6b7280',
      'in_progress': 'var(--color-olive-dark)',
      'completed': '#10b981'
    }
    return colors[status] || '#6b7280'
  }

  if (loading || isLoadingShipments) {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Učitavanje...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  if (profile?.role !== 'proizvodjac') {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Nemate pristup ovoj strani. Potrebna uloga: Proizvođač.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="designer-page">
      <Navbar />
      <div className="designer-content">
        {/* Header */}
        <div className="designer-card designer-card--hero">
          <h2>Proizvodnja</h2>
          <p className="designer-subtitle">
            Upravljajte prijemom materijala i nalozima za šivenje
          </p>
        </div>

        {/* Filteri i statistika */}
        <div className="designer-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>
                Kolekcija
              </label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">Sve kolekcije</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} {col.season ? `(${col.season})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI kartice */}
          <div className="designer-metrics">
            {activeTab === 'shipments' ? (
              <>
                <div className="designer-metric">
                  <span className="designer-muted">Čeka</span>
                  <strong style={{ fontSize: '1.5rem' }}>{stats.pending_shipments}</strong>
                </div>
                <div className="designer-metric">
                  <span className="designer-muted">Stiglo</span>
                  <strong style={{ fontSize: '1.5rem' }}>{stats.received_shipments}</strong>
                </div>
                <div className="designer-metric">
                  <span className="designer-muted">Potvrđeno</span>
                  <strong style={{ fontSize: '1.5rem' }}>{stats.confirmed_shipments}</strong>
                </div>
                <div className="designer-metric">
                  <span className="designer-muted">Problemi</span>
                  <strong style={{ fontSize: '1.5rem' }}>{stats.problem_shipments}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="designer-metric">
                  <span className="designer-muted">Novi nalozi</span>
                  <strong style={{ fontSize: '1.5rem' }}>{stats.new_orders}</strong>
                </div>
                <div className="designer-metric">
                  <span className="designer-muted">U radu</span>
                  <strong style={{ fontSize: '1.5rem' }}>{stats.in_progress_orders}</strong>
                </div>
                <div className="designer-metric">
                  <span className="designer-muted">Završeno</span>
                  <strong style={{ fontSize: '1.5rem' }}>{stats.completed_orders}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="designer-card">
          <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('shipments')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'shipments' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeTab === 'shipments' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeTab === 'shipments' ? '600' : '400'
              }}
            >
              Pristigli materijali
            </button>
            <button
              onClick={() => setActiveTab('sewing-orders')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'sewing-orders' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeTab === 'sewing-orders' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeTab === 'sewing-orders' ? '600' : '400'
              }}
            >
              Nalozi za šivenje
            </button>
          </div>

          {/* TAB: Pristigli materijali */}
          {activeTab === 'shipments' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
              {/* Levo: Lista pošiljki */}
              <div>
                <h3 style={{ marginBottom: '16px' }}>Pošiljke</h3>
                {shipments.length === 0 ? (
                  <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                    Nema pošiljki
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {shipments.map((shipment) => (
                      <button
                        key={shipment.id}
                        onClick={() => setSelectedShipment(shipment)}
                        style={{
                          padding: '12px',
                          border: selectedShipment?.id === shipment.id ? '2px solid var(--color-olive)' : '1px solid #ddd',
                          borderRadius: '8px',
                          background: selectedShipment?.id === shipment.id ? '#f5f7f0' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                          <strong>{shipment.model_name || shipment.model_sku || 'Bez naziva'}</strong>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: getStatusColor(shipment.status) + '20',
                              color: getStatusColor(shipment.status)
                            }}
                          >
                            {getStatusLabel(shipment.status)}
                          </span>
                        </div>
                        <div className="designer-muted" style={{ fontSize: '0.85rem' }}>
                          {shipment.material} / {shipment.color} / {shipment.quantity_sent_kg} kg
                        </div>
                        <div className="designer-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                          Od: {shipment.supplier_profile?.full_name || 'Dobavljač'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Desno: Detalji pošiljke */}
              <div>
                {selectedShipment && shipmentDetails ? (
                  <div className="designer-card">
                    <h3 style={{ marginBottom: '20px' }}>Detalji pošiljke</h3>
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Model/SKU:</strong> {shipmentDetails.model_name} ({shipmentDetails.model_sku})
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Materijal:</strong> {shipmentDetails.material} / {shipmentDetails.color} / {shipmentDetails.quantity_sent_kg} kg
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Traženo:</strong> {shipmentDetails.quantity_kg} kg
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Dobavljač:</strong> {shipmentDetails.supplier_profile?.full_name}
                      </div>
                      {shipmentDetails.shipping_date && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Poslato:</strong> {formatDate(shipmentDetails.shipping_date)}
                        </div>
                      )}
                      {shipmentDetails.tracking_number && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Tracking:</strong> {shipmentDetails.tracking_number}
                        </div>
                      )}
                      {shipmentDetails.problem_reported && (
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fee', borderRadius: '6px' }}>
                          <strong style={{ color: '#ef4444' }}>Problem prijavljen:</strong>
                          <div>{shipmentDetails.problem_reason}</div>
                          {shipmentDetails.problem_comment && (
                            <div style={{ marginTop: '4px' }}>{shipmentDetails.problem_comment}</div>
                          )}
                        </div>
                      )}
                    </div>
                    {shipmentDetails.status !== 'confirmed' && shipmentDetails.status !== 'problem_reported' && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          className="designer-primary-button"
                          onClick={handleConfirmShipment}
                        >
                          Potvrdi prijem materijala
                        </button>
                        <button
                          onClick={() => setShowProblemModal(true)}
                          style={{
                            padding: '10px 18px',
                            border: '1px solid #ef4444',
                            borderRadius: '999px',
                            background: 'white',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Prijavi problem
                        </button>
                      </div>
                    )}
                    {shipmentDetails.status === 'confirmed' && (showSewingOrderSuccess || newSewingOrderId) && (
                      <div style={{ 
                        marginTop: '20px', 
                        padding: '16px', 
                        backgroundColor: '#f0f9ff', 
                        border: '1px solid #10b981',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '1.5rem' }}>✅</span>
                          <strong style={{ color: '#10b981' }}>Materijal je potvrđen. Nalog za šivenje je spreman.</strong>
                        </div>
                        <button
                          className="designer-primary-button"
                          onClick={handleOpenSewingOrder}
                          style={{ alignSelf: 'flex-start' }}
                        >
                          Otvori nalog za šivenje
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                    Izaberite pošiljku sa leve strane
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Nalozi za šivenje */}
          {activeTab === 'sewing-orders' && (
            <div>
              {isLoadingOrders ? (
                <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                  Učitavanje...
                </div>
              ) : sewingOrders.length === 0 ? (
                <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                  Nema naloga za šivenje
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 2fr' : '1fr', gap: '24px' }}>
                  {/* Levo: Lista naloga */}
                  <div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Model / SKU</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Količina (kom)</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Rok</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Materijal status</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Status naloga</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Akcije</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sewingOrders.map((order) => (
                            <tr 
                              key={order.id} 
                              style={{ 
                                borderBottom: '1px solid #f0f0f0',
                                backgroundColor: selectedOrder?.id === order.id ? '#f5f7f0' : 'white',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                setSelectedOrder(order)
                                fetchOrderDetails(order.id)
                              }}
                            >
                              <td style={{ padding: '12px' }}>
                                <strong>{order.model_name}</strong>
                                {order.model_sku && (
                                  <span className="designer-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                                    {order.model_sku}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                {order.quantity_pieces} kom
                              </td>
                              <td style={{ padding: '12px' }}>
                                {order.deadline ? formatDate(order.deadline) : '-'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: '999px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    backgroundColor: order.material_status === 'ready' ? '#10b98120' : '#f59e0b20',
                                    color: order.material_status === 'ready' ? '#10b981' : '#f59e0b'
                                  }}
                                >
                                  {order.material_status === 'ready' ? 'Spreman' : 'Čeka materijal'}
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: '999px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    backgroundColor: getStatusColor(order.status) + '20',
                                    color: getStatusColor(order.status)
                                  }}
                                >
                                  {getStatusLabel(order.status)}
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedOrder(order)
                                    fetchOrderDetails(order.id)
                                  }}
                                  className="designer-primary-button"
                                  style={{ fontSize: '0.85rem', padding: '6px 16px' }}
                                >
                                  Otvori
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Desno: Detalj naloga */}
                  {selectedOrder && (
                    <div className="designer-card">
                      {!orderDetails ? (
                        <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                          Učitavanje detalja naloga...
                        </div>
                      ) : (
                        <>
                      <h3 style={{ marginBottom: '20px' }}>Detalj naloga</h3>
                      
                      {/* Sekcija 1: Osnovno */}
                      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '12px', color: 'var(--color-olive-dark)' }}>Osnovno</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <strong>Model/SKU:</strong> {orderDetails.model_name} {orderDetails.model_sku && `(${orderDetails.model_sku})`}
                          </div>
                          {orderDetails.collection && (
                            <div>
                              <strong>Kolekcija:</strong> {orderDetails.collection.name} {orderDetails.collection.season && `(${orderDetails.collection.season})`}
                            </div>
                          )}
                          <div>
                            <strong>Količina komada:</strong> {orderDetails.quantity_pieces} kom
                          </div>
                          {orderDetails.deadline && (
                            <div>
                              <strong>Rok:</strong> {formatDate(orderDetails.deadline)}
                            </div>
                          )}
                          {orderDetails.shipment?.material_request?.notes && (
                            <div>
                              <strong>Napomena dizajnera:</strong> {orderDetails.shipment.material_request.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sekcija 2: Materijal */}
                      {orderDetails.shipment && (
                        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                          <h4 style={{ marginBottom: '12px', color: 'var(--color-olive-dark)' }}>Materijal</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                              <strong>Materijal + boja:</strong> {orderDetails.shipment.material} / {orderDetails.shipment.color}
                            </div>
                            <div>
                              <strong>Primljeno kg:</strong> {orderDetails.shipment.quantity_sent_kg} kg
                            </div>
                            <div>
                              <strong>Status:</strong> 
                              <span style={{ 
                                marginLeft: '8px',
                                padding: '4px 12px',
                                borderRadius: '999px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                backgroundColor: '#10b98120',
                                color: '#10b981'
                              }}>
                                Spreman ✅
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sekcija 3: Akcije */}
                      <div>
                        <h4 style={{ marginBottom: '12px', color: 'var(--color-olive-dark)' }}>Akcije</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {orderDetails.status === 'new' && (
                            <button
                              onClick={() => handleStartSewingOrder(orderDetails.id)}
                              className="designer-primary-button"
                              style={{ alignSelf: 'flex-start' }}
                            >
                              Pokreni šivenje
                            </button>
                          )}
                          {orderDetails.status === 'in_progress' && (
                            <>
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                  Dodaj sliku/dokument (opciono)
                                </label>
                                <input
                                  type="url"
                                  value={proofDocumentUrl}
                                  onChange={(e) => setProofDocumentUrl(e.target.value)}
                                  placeholder="URL dokaza"
                                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '12px' }}
                                />
                              </div>
                              <button
                                onClick={() => handleCompleteSewingOrder(orderDetails.id)}
                                className="designer-primary-button"
                                style={{ alignSelf: 'flex-start' }}
                              >
                                Završi šivenje
                              </button>
                            </>
                          )}
                          {orderDetails.status === 'completed' && (
                            <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', color: '#10b981' }}>
                              <strong>✅ Nalog je završen</strong>
                              {orderDetails.completed_at && (
                                <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>
                                  Završeno: {formatDate(orderDetails.completed_at)}
                                </div>
                              )}
                              {orderDetails.proof_document_url && (
                                <div style={{ marginTop: '8px' }}>
                                  <a href={orderDetails.proof_document_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-olive-dark)' }}>
                                    Pregledaj dokaz →
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                        </>
                      )}
                    </div>
                  )}
                  {selectedOrder && !orderDetails && (
                    <div className="designer-card">
                      <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                        Učitavanje detalja naloga...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal za prijavu problema */}
      {showProblemModal && selectedShipment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowProblemModal(false)}
        >
          <div
            className="designer-card"
            style={{ maxWidth: '500px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '20px' }}>Prijavi problem</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Razlog problema *
                </label>
                <select
                  value={problemForm.reason}
                  onChange={(e) => setProblemForm({ ...problemForm, reason: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                >
                  <option value="">Izaberi razlog...</option>
                  <option value="nedostaje količina">Nedostaje količina</option>
                  <option value="pogrešna boja">Pogrešna boja</option>
                  <option value="oštećenje">Oštećenje</option>
                  <option value="drugi razlog">Drugi razlog</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Komentar (opciono)
                </label>
                <textarea
                  value={problemForm.comment}
                  onChange={(e) => setProblemForm({ ...problemForm, comment: e.target.value })}
                  rows="3"
                  placeholder="Dodatne informacije o problemu..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowProblemModal(false)
                    setProblemForm({ reason: '', comment: '' })
                  }}
                  className="designer-secondary-button"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleReportProblem}
                  className="designer-primary-button"
                >
                  Prijavi problem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProizvodnjaPage
