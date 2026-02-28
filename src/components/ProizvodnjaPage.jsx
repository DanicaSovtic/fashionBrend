import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import { formatMaterialsForDisplay } from '../utils/materialParser'
import { acceptShipmentOnBlockchain, createSewingCompletionOnBlockchain, rsdToWei } from '../lib/blockchain'
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
  
  // Komentari za pošiljku (model)
  const [shipmentComments, setShipmentComments] = useState([])
  const [newShipmentComment, setNewShipmentComment] = useState('')
  const [isSubmittingShipmentComment, setIsSubmittingShipmentComment] = useState(false)
  
  // Sewing orders state
  const [sewingOrders, setSewingOrders] = useState([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderDetails, setOrderDetails] = useState(null)
  const [proofDocumentUrl, setProofDocumentUrl] = useState('')
  const [pricePerPieceRsd, setPricePerPieceRsd] = useState('')
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

  const [blockchainConfig, setBlockchainConfig] = useState(null)

  useEffect(() => {
    fetch('/api/config/blockchain')
      .then((res) => res.json())
      .then(setBlockchainConfig)
      .catch(() => setBlockchainConfig({}))
  }, [])
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

  // Učitaj komentare za model pošiljke (po product_model_id)
  useEffect(() => {
    const modelId = shipmentDetails?.product_model_id
    if (!modelId) {
      setShipmentComments([])
      return
    }
    const token = localStorage.getItem('auth_access_token')
    if (!token) return
    fetch(`/api/product-models/${modelId}/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : []))
      .then(setShipmentComments)
      .catch(() => setShipmentComments([]))
  }, [shipmentDetails?.product_model_id])

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

    // Korak 1: pitaj koliko komada treba da se sašije za ovaj model (za nalog)
    let quantityInput = window.prompt(
      'Koliko komada ovog modela želite da šijete u ovom nalogu?',
      '1'
    )

    // Ako je korisnik kliknuo Cancel – prekini
    if (quantityInput === null) {
      return
    }

    quantityInput = quantityInput.trim()
    const quantityNumber = parseInt(quantityInput, 10)

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      alert('Molimo unesite pozitivan ceo broj komada (npr. 10).')
      return
    }

    // Korak 2: potvrda akcije
    if (!confirm('Da li ste sigurni da želite da potvrdite prijem materijala?')) {
      return
    }

    try {
      const token = localStorage.getItem('auth_access_token')

      // Ako je pošiljka vezana za blockchain ugovor, prvo prihvati na lancu (ugovor poredi skicu i materijale)
      if (shipmentDetails?.contract_address && shipmentDetails?.shipment_bundle_id && blockchainConfig?.supplierManufacturerContract) {
        await acceptShipmentOnBlockchain(
          shipmentDetails.contract_address,
          shipmentDetails.shipment_bundle_id
        )
      }

      const res = await fetch(`/api/manufacturer/shipments/${selectedShipment.id}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // Broj komada za nalog – backend ga koristi samo kada kreira prvi nalog za taj model
          quantity_pieces: quantityNumber
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
      if (!proofDocumentUrl?.trim()) {
        alert('URL dokaza (slika/dokument) je obavezan da biste završili šivenje.')
        return
      }
      const contractAddress = blockchainConfig?.designerManufacturerContract?.trim()
      const useContract = !!contractAddress && !!orderDetails?.designer_wallet_address?.trim()
      if (useContract) {
        const priceRsd = Number(pricePerPieceRsd)
        if (!Number.isFinite(priceRsd) || priceRsd <= 0) {
          alert('Unesite cenu po komadu (RSD) – potrebna je za pametni ugovor.')
          return
        }
      }

      const token = localStorage.getItem('auth_access_token')
      const body = {
        proof_document_url: proofDocumentUrl.trim()
      }
      if (pricePerPieceRsd !== '' && Number.isFinite(Number(pricePerPieceRsd))) {
        body.price_per_piece_rsd = Number(pricePerPieceRsd)
      }

      const res = await fetch(`/api/manufacturer/sewing-orders/${orderId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri završavanju naloga')
      }

      // Ako je ugovor podešen i dizajner ima wallet, kreiraj zapis na blockchainu
      if (useContract) {
        const designerWallet = orderDetails.designer_wallet_address.trim()
        const quantityPieces = orderDetails.quantity_pieces || 1
        const pricePerPieceWei = rsdToWei(Number(pricePerPieceRsd))
        const result = await createSewingCompletionOnBlockchain(
          contractAddress,
          orderId,
          designerWallet,
          quantityPieces,
          pricePerPieceWei
        )
        // Sačuvaj referencu na ugovor u bazi
        await fetch(`/api/manufacturer/sewing-orders/${orderId}/contract-completion`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            contract_completion_id_hex: result.completionIdHex
          })
        })
      }

      await fetchSewingOrders()
      await fetchStats()
      if (selectedOrder?.id === orderId) {
        await fetchOrderDetails(orderId)
      }
      setProofDocumentUrl('')
      setPricePerPieceRsd('')
      alert(useContract ? 'Nalog je završen i pametni ugovor je kreiran. Dizajner može sada da potvrdi ili vrati na doradu.' : 'Nalog za šivenje je završen')
    } catch (error) {
      alert(error.message || 'Greška pri završavanju naloga')
    }
  }

  const handleAddShipmentComment = async (e) => {
    e.preventDefault()
    const modelId = shipmentDetails?.product_model_id ?? shipmentDetails?.product_model?.id
    if (!modelId || !newShipmentComment?.trim()) return
    const token = localStorage.getItem('auth_access_token')
    if (!token) return
    try {
      setIsSubmittingShipmentComment(true)
      const res = await fetch(`/api/product-models/${modelId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          body: newShipmentComment.trim(),
          author_name: profile?.full_name,
          role: profile?.role
        })
      })
      if (!res.ok) throw new Error('Greška pri dodavanju komentara')
      const created = await res.json()
      setShipmentComments((prev) => [...prev, created])
      setNewShipmentComment('')
    } catch (err) {
      alert(err.message || 'Nije moguće dodati komentar.')
    } finally {
      setIsSubmittingShipmentComment(false)
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

  const groupedShipments = useMemo(() => {
    if (!shipments || shipments.length === 0) return []
    const byBundle = {}
    for (const s of shipments) {
      const key = s.shipment_bundle_id || s.id
      if (!byBundle[key]) {
        byBundle[key] = { representative: s, all: [s] }
      } else {
        byBundle[key].all.push(s)
      }
    }
    return Object.values(byBundle)
  }, [shipments])

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
                    {groupedShipments.map((group) => (
                      <button
                        key={group.representative.id}
                        onClick={() => setSelectedShipment(group.representative)}
                        style={{
                          padding: '12px',
                          border: selectedShipment?.id === group.representative.id ? '2px solid var(--color-olive)' : '1px solid #ddd',
                          borderRadius: '8px',
                          background: selectedShipment?.id === group.representative.id ? '#f5f7f0' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                          <strong>{group.representative.model_name || group.representative.model_sku || 'Bez naziva'}</strong>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: getStatusColor(group.representative.status) + '20',
                              color: getStatusColor(group.representative.status)
                            }}
                          >
                            {getStatusLabel(group.representative.status)}
                          </span>
                        </div>
                        <div className="designer-muted" style={{ fontSize: '0.85rem' }}>
                          {group.all.length > 1
                            ? group.all.map((s) => `${s.material} / ${s.color} / ${s.quantity_sent_kg} kg`).join(' • ')
                            : `${group.representative.material} / ${group.representative.color} / ${group.representative.quantity_sent_kg} kg`}
                        </div>
                        <div className="designer-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                          Od: {group.representative.supplier_profile?.full_name || 'Dobavljač'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Desno: Pregled proizvoda + Detalji pošiljke */}
              <div>
                {selectedShipment && shipmentDetails ? (
                  <div className="designer-card">
                    {/* Pregled proizvoda (skica i detalji od dizajnera) */}
                    {shipmentDetails.product_model && (
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '8px' }}>Pregled webshop prikaza</h3>
                        <p className="designer-muted" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                          Provera kako je dizajner predstavio proizvod – na osnovu ovoga potvrdite da ste primili ispravan materijal.
                        </p>
                        <div className="designer-webshop">
                          <div className="designer-webshop-preview">
                            <div className="designer-webshop-image">
                              {shipmentDetails.product_model.product_model_media?.length > 0 ? (
                                <img
                                  src={
                                    shipmentDetails.product_model.product_model_media.find((m) => m.is_primary)?.image_url ||
                                    shipmentDetails.product_model.product_model_media[0]?.image_url
                                  }
                                  alt={shipmentDetails.product_model.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                'Preview foto'
                              )}
                            </div>
                            <div className="designer-webshop-details">
                              <h4>{shipmentDetails.product_model.name}</h4>
                              <div className="designer-webshop-block">
                                <span className="designer-tech-label">Opis:</span>
                                <p className="designer-muted designer-tech-content">
                                  {shipmentDetails.product_model.concept || '—'}
                                </p>
                              </div>
                              <div className="designer-webshop-block">
                                <span className="designer-tech-label">Materijali:</span>
                                <span className="designer-tech-content">
                                  {shipmentDetails.product_model.materials
                                    ? formatMaterialsForDisplay(shipmentDetails.product_model.materials)
                                    : 'Nema informacija'}
                                </span>
                              </div>
                              <div className="designer-webshop-block">
                                <span className="designer-tech-label">Varijante:</span>
                                <span className="designer-tech-content">
                                  {shipmentDetails.product_model.variants || 'Nema varijanti'}
                                </span>
                              </div>
                              <div className="designer-webshop-block">
                                <span className="designer-tech-label">Paleta:</span>
                                <span className="designer-tech-content">
                                  {shipmentDetails.product_model.color_palette || 'Nema palete'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="designer-webshop-meta">
                            <div className="designer-webshop-meta-row">
                              <span className="designer-muted">Naziv proizvoda:</span>
                              <strong>{shipmentDetails.product_model.name}</strong>
                            </div>
                            <div className="designer-webshop-meta-row">
                              <span className="designer-muted">SKU:</span>
                              <strong>{shipmentDetails.product_model.sku}</strong>
                            </div>
                            <div className="designer-webshop-meta-row">
                              <span className="designer-muted">Istaknute karakteristike:</span>
                              <strong>Premium materijal, ručna obrada</strong>
                            </div>
                            <div className="designer-webshop-meta-row">
                              <span className="designer-muted">Tabela veličina:</span>
                              <strong style={{ whiteSpace: 'pre-wrap' }}>
                                {shipmentDetails.product_model.size_table || '—'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <h3 style={{ marginBottom: '20px' }}>Detalji pošiljke</h3>
                    {shipmentDetails.contract_address && (
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.9rem' }}>
                        Ova pošiljka je vezana za pametni ugovor. Pri potvrdi prijema potpisujete transakciju u MetaMask-u; ugovor proverava da svi materijali iz skice zaista pristižu.
                      </div>
                    )}
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Model/SKU:</strong> {shipmentDetails.model_name} ({shipmentDetails.model_sku})
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Materijal{shipmentDetails.bundle_shipments?.length > 1 ? 'i' : ''}:</strong>{' '}
                        {shipmentDetails.bundle_shipments?.length > 1
                          ? shipmentDetails.bundle_shipments.map((s) => `${s.material} / ${s.color} / ${s.quantity_sent_kg} kg`).join(' • ')
                          : `${shipmentDetails.material} / ${shipmentDetails.color} / ${shipmentDetails.quantity_sent_kg} kg`}
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

                    {/* Komentari tima — ispod detalja pošiljke */}
                    {shipmentDetails.product_model_id && (
                      <div className="designer-comments" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                        <h4>Komentari tima</h4>
                        <form onSubmit={handleAddShipmentComment} style={{ marginBottom: '20px' }}>
                          <div style={{ marginBottom: '12px' }}>
                            <textarea
                              value={newShipmentComment}
                              onChange={(e) => setNewShipmentComment(e.target.value)}
                              placeholder="Unesite vaš komentar..."
                              disabled={isSubmittingShipmentComment}
                              required
                              style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '12px',
                                fontSize: '14px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                backgroundColor: isSubmittingShipmentComment ? '#f5f5f5' : '#fff'
                              }}
                            />
                          </div>
                          <button
                            type="submit"
                            className="designer-secondary-button"
                            disabled={isSubmittingShipmentComment || !newShipmentComment.trim()}
                          >
                            {isSubmittingShipmentComment ? 'Dodavanje...' : 'Dodaj komentar'}
                          </button>
                        </form>
                        {shipmentComments.length === 0 ? (
                          <div className="designer-muted" style={{ padding: '1rem', textAlign: 'center' }}>
                            Nema komentara za ovaj model. Budite prvi koji će dodati komentar!
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {shipmentComments.map((comment) => (
                              <div key={comment.id} className="designer-comment">
                                <div className="designer-comment-header">
                                  <strong>{comment.author_name || 'Anonimni korisnik'}</strong>
                                  <span className="designer-muted">
                                    {comment.role || 'Nepoznata uloga'} • {formatDate(comment.created_at)}
                                  </span>
                                </div>
                                <p>{comment.body}</p>
                              </div>
                            ))}
                          </div>
                        )}
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

                      {/* Vraćeno na doradu – razlog od dizajnera */}
                      {(orderDetails.return_for_rework_at || orderDetails.return_for_rework_reason) && (
                        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                          <h4 style={{ marginBottom: '8px', color: '#b91c1c' }}>Vraćeno na doradu</h4>
                          <p style={{ fontSize: '0.9rem', margin: 0, color: '#991b1b' }}>
                            Dizajner je vratio ovaj nalog na doradu. Nalog je ponovo otvoren – potrebno je izvršiti ispravke i ponovo završiti šivenje.
                          </p>
                          {orderDetails.return_for_rework_reason && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                              <strong style={{ fontSize: '0.85rem' }}>Razlog:</strong>
                              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{orderDetails.return_for_rework_reason}</p>
                            </div>
                          )}
                          {orderDetails.return_for_rework_at && (
                            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#b91c1c' }}>
                              Vraćeno: {formatDate(orderDetails.return_for_rework_at)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sekcija 2: Materijali (svi za ovaj model – jedan nalog) */}
                      {(orderDetails.shipments?.length > 0 || orderDetails.shipment) && (
                        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                          <h4 style={{ marginBottom: '12px', color: 'var(--color-olive-dark)' }}>Materijali za ovaj model</h4>
                          <p className="designer-muted" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                            Jedan nalog za šivenje obuhvata sve navedene materijale.
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(orderDetails.shipments && orderDetails.shipments.length > 0
                              ? orderDetails.shipments
                              : orderDetails.shipment ? [orderDetails.shipment] : []
                            ).map((s) => (
                              <div
                                key={s.id}
                                style={{
                                  padding: '12px',
                                  backgroundColor: '#fff',
                                  borderRadius: '8px',
                                  border: '1px solid #eee'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '8px' }}>
                                  <div>
                                    <strong>{s.material}</strong> / {s.color}
                                  </div>
                                  <span
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '999px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      backgroundColor: s.status === 'confirmed' ? '#10b98120' : '#f59e0b20',
                                      color: s.status === 'confirmed' ? '#10b981' : '#f59e0b'
                                    }}
                                  >
                                    {s.status === 'confirmed' ? 'Potvrđeno' : getStatusLabel(s.status)}
                                  </span>
                                </div>
                                <div className="designer-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                  Primljeno: {s.quantity_sent_kg ?? s.quantity_kg ?? '—'} kg
                                  {s.notes && (
                                    <span style={{ display: 'block', marginTop: '4px' }}>
                                      Napomena: {s.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>
                            Materijal spreman za šivenje
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
                                  Dodaj sliku/dokument *
                                </label>
                                <input
                                  type="url"
                                  value={proofDocumentUrl}
                                  onChange={(e) => setProofDocumentUrl(e.target.value)}
                                  placeholder="URL dokaza"
                                  required
                                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '12px' }}
                                />
                              </div>
                              {blockchainConfig?.designerManufacturerContract && orderDetails.designer_wallet_address && (
                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                    Cena po komadu (RSD) *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={pricePerPieceRsd}
                                    onChange={(e) => setPricePerPieceRsd(e.target.value)}
                                    placeholder="npr. 2500"
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '12px' }}
                                  />
                                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '-8px', marginBottom: '12px' }}>
                                    Pri potvrdi dizajnera (Pusti na testiranje) iznos {orderDetails.quantity_pieces || 1} × cena biće prebačen na vaš wallet.
                                  </p>
                                </div>
                              )}
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
