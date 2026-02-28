import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'
import { 
  addInventoryItemOnBlockchain, 
  updateInventoryItemOnBlockchain,
  pauseInventoryItemOnBlockchain,
  activateInventoryItemOnBlockchain,
  acceptMaterialRequestOnBlockchain,
  createShipmentOnBlockchain
} from '../lib/blockchain'

const DobavljacMaterijalaPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('inventory') // 'inventory' ili 'requests'
  
  // Inventory state
  const [inventory, setInventory] = useState([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [newItem, setNewItem] = useState({
    material: '',
    color: '',
    quantity_kg: '',
    price_per_kg: ''
  })
  const [blockchainConfig, setBlockchainConfig] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Requests state
  const [requests, setRequests] = useState([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestDetails, setRequestDetails] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [requestStep, setRequestStep] = useState(1) // 1 = prihvati/odbij, 2 = priprema, 3 = slanje
  const [requestForm, setRequestForm] = useState({
    quantity_sent_kg: '',
    batch_lot_id: '',
    document_url: '',
    shipping_date: '',
    tracking_number: '',
    manufacturer_address: ''
  })
  const [rejectionReason, setRejectionReason] = useState('')
  const [manufacturers, setManufacturers] = useState([])
  const [sendToManufacturerForm, setSendToManufacturerForm] = useState({
    manufacturer_id: '',
    quantity_sent_kg: '',
    shipping_date: '',
    tracking_number: ''
  })
  const [isSendingToManufacturer, setIsSendingToManufacturer] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    collection: '',
    status: '',
    search: ''
  })
  const [kpis, setKpis] = useState({
    new: 0,
    in_progress: 0,
    sent: 0,
    completed: 0
  })

  // Grupisani zahtevi po bundle-u: jedan red u listi = jedan bundle ili stari pojedinačni zahtev
  const groupedRequests = useMemo(() => {
    if (!requests || requests.length === 0) return []
    const groups = {}
    for (const req of requests) {
      const key = req.request_bundle_id || req.id
      if (!groups[key]) {
        groups[key] = {
          key,
          bundleId: req.request_bundle_id || null,
          requests: []
        }
      }
      groups[key].requests.push(req)
    }
    return Object.values(groups).map((group) => {
      const first = group.requests[0]
      const materialsLabel =
        group.requests.length === 1
          ? `${first.material} / ${first.color} / ${first.quantity_kg} kg`
          : group.requests
              .map((r) => `${r.material} / ${r.color} / ${r.quantity_kg} kg`)
              .join(' + ')
      return {
        ...group,
        representative: first,
        status: first.status,
        model_name: first.model_name,
        model_sku: first.model_sku,
        materialsLabel
      }
    })
  }, [requests])

  // Trenutno selektovana grupa (ako postoji) – koristi se za prikaz svih materijala u detaljima
  const currentGroup = useMemo(() => {
    if (!selectedRequest || !groupedRequests || groupedRequests.length === 0) return null
    return (
      groupedRequests.find((g) =>
        g.requests.some((r) => r.id === selectedRequest.id)
      ) || null
    )
  }, [groupedRequests, selectedRequest])

  // Učitaj blockchain config
  useEffect(() => {
    const fetchBlockchainConfig = async () => {
      try {
        const res = await fetch('/api/config/blockchain')
        const config = await res.json()
        setBlockchainConfig(config)
      } catch (error) {
        console.error('Error fetching blockchain config:', error)
      }
    }
    fetchBlockchainConfig()
  }, [])

  // Učitaj zalihe
  useEffect(() => {
    if (user && profile?.role === 'dobavljac_materijala' && activeTab === 'inventory') {
      fetchInventory()
    }
  }, [user, profile, activeTab])

  // Učitaj zahteve
  useEffect(() => {
    if (user && profile?.role === 'dobavljac_materijala' && activeTab === 'requests') {
      fetchRequests()
    }
  }, [user, profile, activeTab, filters])

  // Učitaj proizvođače
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const token = localStorage.getItem('auth_access_token')
        console.log('[DobavljacMaterijalaPage] Fetching manufacturers...')
        const res = await fetch('/api/supplier/manufacturers', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error('[DobavljacMaterijalaPage] Error response:', res.status, errorData)
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }
        
        const data = await res.json()
        console.log('[DobavljacMaterijalaPage] Manufacturers received:', data)
        setManufacturers(data.manufacturers || [])
      } catch (error) {
        console.error('[DobavljacMaterijalaPage] Error fetching manufacturers:', error)
        alert(`Greška pri učitavanju proizvođača: ${error.message}`)
      }
    }
    if (user && profile?.role === 'dobavljac_materijala') {
      fetchManufacturers()
    }
  }, [user, profile])

  // Učitaj detalje zahteva
  useEffect(() => {
    if (selectedRequest) {
      fetchRequestDetails(selectedRequest.id, selectedRequest.request_bundle_id)
      fetchMessages(selectedRequest.id)
      // Postavi step na osnovu statusa
      if (selectedRequest.status === 'new') {
        setRequestStep(1)
      } else if (selectedRequest.status === 'in_progress') {
        setRequestStep(2)
      }
    }
  }, [selectedRequest])

  const fetchInventory = async () => {
    try {
      setIsLoadingInventory(true)
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch('/api/supplier/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setInventory(data.inventory || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setIsLoadingInventory(false)
    }
  }

  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true)
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.collection) params.append('collection_id', filters.collection)
      if (filters.search) params.append('search', filters.search)

      const res = await fetch(`/api/supplier/requests?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setRequests(data.requests || [])
      if (data.kpis) setKpis(data.kpis)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const fetchRequestDetails = async (requestId, bundleId) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const url = bundleId
        ? `/api/supplier/requests/bundle/${bundleId}`
        : `/api/supplier/requests/${requestId}`
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setRequestDetails(data)
      const req = data.request
      if (req) {
        setRequestForm({
          quantity_sent_kg: req.quantity_sent_kg || req.quantity_kg || '',
          batch_lot_id: req.batch_lot_id || '',
          document_url: req.document_url || '',
          shipping_date: req.shipping_date || '',
          tracking_number: req.tracking_number || '',
          manufacturer_address: req.manufacturer_address || ''
        })
      }
    } catch (error) {
      console.error('Error fetching request details:', error)
    }
  }

  const fetchMessages = async (requestId) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/supplier/requests/${requestId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItem.material || !newItem.color || !newItem.quantity_kg) {
      alert('Materijal, boja i količina su obavezni')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('auth_access_token')
      let blockchainTxHash = null
      let blockchainItemId = null

      // Ako je blockchain konfigurisan, pozovi smart contract
      if (blockchainConfig?.inventoryContract) {
        try {
          const pricePerKg = newItem.price_per_kg ? parseFloat(newItem.price_per_kg) : 0
          const result = await addInventoryItemOnBlockchain(
            blockchainConfig.inventoryContract,
            newItem.material,
            newItem.color,
            parseFloat(newItem.quantity_kg),
            pricePerKg,
            0
          )
          blockchainTxHash = result.txHash
          blockchainItemId = result.itemId
        } catch (blockchainError) {
          console.error('Blockchain error:', blockchainError)
          // Nastavi sa upisom u bazu čak i ako blockchain ne radi
        }
      }

      const res = await fetch('/api/supplier/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newItem,
          quantity_kg: parseFloat(newItem.quantity_kg),
          price_per_kg: newItem.price_per_kg ? parseFloat(newItem.price_per_kg) : null,
          blockchain_tx_hash: blockchainTxHash,
          blockchain_item_id: blockchainItemId
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri dodavanju zaliha')
      }

      await fetchInventory()
      setShowAddModal(false)
      setNewItem({
        material: '',
        color: '',
        quantity_kg: '',
        price_per_kg: ''
      })
      if (blockchainTxHash) {
        alert('Upisano na blockchain ✅')
      }
    } catch (error) {
      alert(error.message || 'Greška pri dodavanju zaliha')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      let blockchainTxHash = null

      // Ako je blockchain konfigurisan i ažurira se količina/cena
      if (blockchainConfig?.inventoryContract && (updates.quantity_kg !== undefined || updates.price_per_kg !== undefined)) {
        try {
          const item = inventory.find(i => i.id === itemId)
          const newQty = updates.quantity_kg !== undefined ? updates.quantity_kg : (item?.quantity_kg || 0)
          const newPrice = updates.price_per_kg !== undefined ? updates.price_per_kg : (item?.price_per_kg || 0)
          
          const result = await updateInventoryItemOnBlockchain(
            blockchainConfig.inventoryContract,
            item?.blockchain_item_id || '0',
            newQty,
            newPrice
          )
          blockchainTxHash = result.txHash
        } catch (blockchainError) {
          console.error('Blockchain error:', blockchainError)
        }
      }

      const res = await fetch(`/api/supplier/inventory/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...updates,
          blockchain_tx_hash: blockchainTxHash
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri ažuriranju')
      }

      await fetchInventory()
      setEditingItem(null)
      if (blockchainTxHash) {
        alert('Ažurirano na blockchain ✅')
      }
    } catch (error) {
      alert(error.message || 'Greška pri ažuriranju')
    }
  }

  const handleToggleStatus = async (item) => {
    try {
      const token = localStorage.getItem('auth_access_token')
      let blockchainTxHash = null

      if (blockchainConfig?.inventoryContract && item.blockchain_item_id) {
        try {
          const result = item.status === 'active'
            ? await pauseInventoryItemOnBlockchain(blockchainConfig.inventoryContract, item.blockchain_item_id)
            : await activateInventoryItemOnBlockchain(blockchainConfig.inventoryContract, item.blockchain_item_id)
          blockchainTxHash = result.txHash
        } catch (blockchainError) {
          console.error('Blockchain error:', blockchainError)
        }
      }

      await handleUpdateItem(item.id, {
        status: item.status === 'active' ? 'paused' : 'active',
        blockchain_tx_hash: blockchainTxHash
      })
    } catch (error) {
      alert(error.message || 'Greška pri promeni statusa')
    }
  }

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return

    try {
      const token = localStorage.getItem('auth_access_token')

      // Ako je zahtev deo bundle-a i ima blockchain contract, koristi se smart contract tok
      const bundleId = requestDetails?.request?.request_bundle_id
      const contractAddress =
        requestDetails?.request?.contract_address || blockchainConfig?.designerSupplierContract

      if (bundleId && contractAddress) {
        // 1) Smart contract – dobavljač prihvata zahtev (prenosi sredstva sa ugovora na dobavljača)
        const tx = await acceptMaterialRequestOnBlockchain(contractAddress, bundleId)

        // 2) Backend – umanji zalihe i ažuriraj statuse za ceo bundle
        const confirmRes = await fetch(`/api/supplier/requests/bundle/${bundleId}/confirm-accepted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tx_hash: tx.txHash
          })
        })

        if (!confirmRes.ok) {
          const error = await confirmRes.json().catch(() => ({}))
          throw new Error(error.error || 'Greška pri ažuriranju zaliha nakon prihvatanja zahteva')
        }

        await fetchRequests()
        await fetchRequestDetails(selectedRequest.id)
        setRequestStep(2)
        alert('Zahtev je prihvaćen. Plaćanje je izvršeno na blockchainu i zalihe su ažurirane.')
        return
      }

      // Fallback: stari tok bez blockchaina (za stare zahteve)
      const res = await fetch(`/api/supplier/requests/${selectedRequest.id}/accept`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri prihvatanju zahteva')
      }

      await fetchRequests()
      await fetchRequestDetails(selectedRequest.id)
      setRequestStep(2)
    } catch (error) {
      alert(error.message || 'Greška pri prihvatanju zahteva')
    }
  }

  const handleRejectRequest = async () => {
    if (!rejectionReason) {
      alert('Molimo unesite razlog odbijanja')
      return
    }

    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/supplier/requests/${selectedRequest.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rejection_reason: rejectionReason })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri odbijanju zahteva')
      }

      await fetchRequests()
      setSelectedRequest(null)
      setRequestDetails(null)
    } catch (error) {
      alert(error.message || 'Greška pri odbijanju zahteva')
    }
  }

  const handlePrepareShipment = async () => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/supplier/requests/${selectedRequest.id}/prepare`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity_sent_kg: requestForm.quantity_sent_kg ? parseFloat(requestForm.quantity_sent_kg) : null,
          batch_lot_id: requestForm.batch_lot_id || null,
          document_url: requestForm.document_url || null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri čuvanju pripreme')
      }

      await fetchRequestDetails(selectedRequest.id)
      alert('Priprema pošiljke je sačuvana')
    } catch (error) {
      alert(error.message || 'Greška pri čuvanju pripreme')
    }
  }


  const handleCompleteRequest = async () => {
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/supplier/requests/${selectedRequest.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri označavanju kao završeno')
      }

      await fetchRequests()
      await fetchRequestDetails(selectedRequest.id)
      alert('Zahtev je označen kao završen')
    } catch (error) {
      alert(error.message || 'Greška pri označavanju kao završeno')
    }
  }

  const handleSendToManufacturer = async () => {
    if (!sendToManufacturerForm.manufacturer_id) {
      alert('Molimo izaberite proizvođača')
      return
    }

    const bundleId = selectedRequest?.request_bundle_id
    const isBundleWithContract = bundleId && requestDetails?.requests?.length > 0 && blockchainConfig?.supplierManufacturerContract

    setIsSendingToManufacturer(true)
    try {
      const token = localStorage.getItem('auth_access_token')

      if (isBundleWithContract) {
        // 1) Priprema: podaci za blockchain
        const prepareRes = await fetch(`/api/supplier/requests/bundle/${bundleId}/send-to-manufacturer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            manufacturer_id: sendToManufacturerForm.manufacturer_id,
            shipping_date: sendToManufacturerForm.shipping_date || new Date().toISOString().split('T')[0],
            tracking_number: sendToManufacturerForm.tracking_number || null
          })
        })
        if (!prepareRes.ok) {
          const err = await prepareRes.json()
          throw new Error(err.error || 'Greška pri pripremi pošiljke')
        }
        const payload = await prepareRes.json()
        if (!payload.manufacturer_wallet) {
          throw new Error('Izabrani proizvođač nema podešen wallet (wallet_address).')
        }

        // 2) Blockchain: createShipment
        const { txHash, shipmentIdHex } = await createShipmentOnBlockchain(
          blockchainConfig.supplierManufacturerContract,
          payload.bundle_id,
          payload.manufacturer_wallet,
          payload.product_model_id,
          payload.expectedMaterialNames,
          payload.lines
        )

        // 3) Potvrda u bazi
        const confirmRes = await fetch(`/api/supplier/requests/bundle/${bundleId}/confirm-shipment-sent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tx_hash: txHash,
            shipment_id_hex: shipmentIdHex,
            manufacturer_id: sendToManufacturerForm.manufacturer_id,
            shipping_date: sendToManufacturerForm.shipping_date || new Date().toISOString().split('T')[0],
            tracking_number: sendToManufacturerForm.tracking_number || null
          })
        })
        if (!confirmRes.ok) {
          const err = await confirmRes.json()
          throw new Error(err.error || 'Greška pri čuvanju pošiljke')
        }
      } else {
        // Stari tok: pojedinačan zahtev
        const res = await fetch(`/api/supplier/requests/${selectedRequest.id}/send-to-manufacturer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            manufacturer_id: sendToManufacturerForm.manufacturer_id,
            quantity_sent_kg: sendToManufacturerForm.quantity_sent_kg || requestDetails?.request?.quantity_kg,
            shipping_date: sendToManufacturerForm.shipping_date || new Date().toISOString().split('T')[0],
            tracking_number: sendToManufacturerForm.tracking_number || null
          })
        })
        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Greška pri slanju proizvođaču')
        }
      }

      alert('Materijal je uspešno poslat proizvođaču!')
      await fetchRequests()
      await fetchRequestDetails(selectedRequest.id, selectedRequest.request_bundle_id)
      await fetchInventory()
      setSendToManufacturerForm({
        manufacturer_id: '',
        quantity_sent_kg: '',
        shipping_date: '',
        tracking_number: ''
      })
    } catch (error) {
      alert(error.message || 'Greška pri slanju proizvođaču')
    } finally {
      setIsSendingToManufacturer(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/supplier/requests/${selectedRequest.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body: newMessage })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri slanju poruke')
      }

      setNewMessage('')
      await fetchMessages(selectedRequest.id)
    } catch (error) {
      alert(error.message || 'Greška pri slanju poruke')
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
      'new': 'Novo',
      'in_progress': 'U toku',
      'sent': 'Poslato',
      'completed': 'Završeno',
      'rejected': 'Odbijeno',
      'active': 'Aktivno',
      'paused': 'Pauzirano'
    }
    return labels[status] || status
  }

  const getStatusColor = (status) => {
    const colors = {
      'new': '#3b82f6',
      'in_progress': '#f59e0b',
      'sent': 'var(--color-olive-dark)',
      'completed': '#10b981',
      'rejected': '#ef4444',
      'active': '#10b981',
      'paused': '#6b7280'
    }
    return colors[status] || '#6b7280'
  }

  if (loading || isLoadingInventory) {
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

  if (profile?.role !== 'dobavljac_materijala') {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Nemate pristup ovoj strani. Potrebna uloga: Dobavljač materijala.</div>
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
          <h2>Dobavljač materijala</h2>
          <p className="designer-subtitle">
            Upravljajte zalihama i zahtevima dizajnera na jednom mestu
          </p>
        </div>

        {/* Tabs */}
        <div className="designer-card">
          <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('inventory')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'inventory' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeTab === 'inventory' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeTab === 'inventory' ? '600' : '400'
              }}
            >
              Moje zalihe
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'requests' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeTab === 'requests' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeTab === 'requests' ? '600' : '400'
              }}
            >
              Zahtevi dizajnera
            </button>
          </div>

          {/* TAB A: Moje zalihe */}
          {activeTab === 'inventory' && (
            <div>
              <div className="designer-section-header">
                <h3>Moje zalihe</h3>
                <button
                  className="designer-primary-button"
                  onClick={() => setShowAddModal(true)}
                >
                  + Dodaj novu zalihu
                </button>
              </div>

              {inventory.length === 0 ? (
                <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                  Trenutno nema zaliha. Kliknite "Dodaj novu zalihu" da počnete.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Materijal</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Boja</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Dostupno (kg)</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Cena/kg</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '12px' }}>{item.material}</td>
                          <td style={{ padding: '12px' }}>{item.color}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {editingItem?.id === item.id ? (
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={item.quantity_kg}
                                onBlur={(e) => {
                                  const newQty = parseFloat(e.target.value)
                                  if (!isNaN(newQty) && newQty !== item.quantity_kg) {
                                    handleUpdateItem(item.id, { quantity_kg: newQty })
                                  }
                                }}
                                style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            ) : (
                              (item.available_kg ?? item.quantity_kg)
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {editingItem?.id === item.id ? (
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={item.price_per_kg || ''}
                                onBlur={(e) => {
                                  const newPrice = parseFloat(e.target.value)
                                  if (!isNaN(newPrice) && newPrice !== (item.price_per_kg || 0)) {
                                    handleUpdateItem(item.id, { price_per_kg: newPrice || null })
                                  }
                                }}
                                style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            ) : (
                              item.price_per_kg ? `${item.price_per_kg} RSD` : '-'
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '4px 12px',
                                borderRadius: '999px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                backgroundColor: item.status === 'active' ? '#d1fae5' : '#f3f4f6',
                                color: item.status === 'active' ? '#065f46' : '#374151'
                              }}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => setEditingItem(editingItem?.id === item.id ? null : item)}
                                style={{
                                  padding: '4px 12px',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  background: 'white',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {editingItem?.id === item.id ? 'Sačuvaj' : 'Izmeni'}
                              </button>
                              <button
                                onClick={() => handleToggleStatus(item)}
                                style={{
                                  padding: '4px 12px',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  background: 'white',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {item.status === 'active' ? 'Pauziraj' : 'Aktiviraj'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB B: Zahtevi dizajnera */}
          {activeTab === 'requests' && (
            <div>
              {/* Filteri i KPI */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  >
                    <option value="">Svi statusi</option>
                    <option value="new">Novo</option>
                    <option value="in_progress">U toku</option>
                    <option value="sent">Poslato</option>
                    <option value="completed">Završeno</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Pretraga (SKU, naziv, materijal)..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div className="designer-metrics">
                  <div className="designer-metric">
                    <span className="designer-muted">Novi zahtevi</span>
                    <strong style={{ fontSize: '1.5rem' }}>{kpis.new}</strong>
                  </div>
                  <div className="designer-metric">
                    <span className="designer-muted">U toku</span>
                    <strong style={{ fontSize: '1.5rem' }}>{kpis.in_progress}</strong>
                  </div>
                  <div className="designer-metric">
                    <span className="designer-muted">Poslato</span>
                    <strong style={{ fontSize: '1.5rem' }}>{kpis.sent}</strong>
                  </div>
                  <div className="designer-metric">
                    <span className="designer-muted">Završeno</span>
                    <strong style={{ fontSize: '1.5rem' }}>{kpis.completed}</strong>
                  </div>
                </div>
              </div>

              {/* Lista zahteva i detalji */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Levo: Lista zahteva */}
                <div>
                  <h3 style={{ marginBottom: '16px' }}>Zahtevi</h3>
                  {isLoadingRequests ? (
                    <div className="designer-muted">Učitavanje...</div>
                  ) : groupedRequests.length === 0 ? (
                    <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                      Nema zahteva
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {groupedRequests.map((group) => (
                        <button
                          key={group.key}
                          onClick={() => setSelectedRequest(group.representative)}
                          style={{
                            padding: '12px',
                            border: selectedRequest?.id === group.representative.id ? '2px solid var(--color-olive)' : '1px solid #ddd',
                            borderRadius: '8px',
                            background: selectedRequest?.id === group.representative.id ? '#f5f7f0' : 'white',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                            <strong>{group.model_name || group.model_sku || 'Bez naziva'}</strong>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: getStatusColor(group.status) + '20',
                                color: getStatusColor(group.status)
                              }}
                            >
                              {getStatusLabel(group.status)}
                            </span>
                          </div>
                          <div className="designer-muted" style={{ fontSize: '0.85rem' }}>
                            {group.materialsLabel}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desno: Detalji zahteva */}
                <div>
                  {selectedRequest && requestDetails ? (
                    <div className="designer-card">
                      {/* Korak 1: Prihvati/Odbij */}
                      {requestStep === 1 && selectedRequest.status === 'new' && (
                        <div>
                          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '12px' }}>
                              <strong>Model/SKU:</strong> {requestDetails.request.model_name} ({requestDetails.request.model_sku})
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <strong>Traženo:</strong>
                              {currentGroup && currentGroup.requests.length > 1 ? (
                                <div style={{ marginTop: '4px' }}>
                                  {currentGroup.requests.map((r) => (
                                    <div key={r.id}>
                                      - {r.material} / {r.color} / {r.quantity_kg} kg
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span> {requestDetails.request.material} / {requestDetails.request.color} / {requestDetails.request.quantity_kg} kg</span>
                              )}
                            </div>
                            {requestDetails.request.deadline && (
                              <div style={{ marginBottom: '12px' }}>
                                <strong>Rok:</strong> {formatDate(requestDetails.request.deadline)}
                              </div>
                            )}
                            {requestDetails.request.notes && (
                              <div style={{ marginBottom: '12px' }}>
                                <strong>Napomena:</strong> {requestDetails.request.notes}
                              </div>
                            )}
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
                              <strong>Dostupno kod mene:</strong>
                              {requestDetails.requests && requestDetails.requests.length > 0 ? (
                                <div style={{ marginTop: '6px' }}>
                                  {requestDetails.requests.map((r) => (
                                    <div key={r.id}>
                                      {r.material} / {r.color}:{' '}
                                      {r.available_inventory
                                        ? `${r.available_inventory.quantity_kg} kg`
                                        : '0 kg'}
                                      {!r.has_enough && (
                                        <span style={{ color: '#ef4444', marginLeft: '8px' }}>— nema dovoljno</span>
                                      )}
                                    </div>
                                  ))}
                                  {!requestDetails.bundle_has_enough && (
                                    <div style={{ color: '#ef4444', marginTop: '8px' }}>
                                      Nema dovoljno na stanju za sve stavke. Predloži izmenu količine ili rok.
                                    </div>
                                  )}
                                </div>
                              ) : requestDetails.available_inventory ? (
                                <div>
                                  {requestDetails.request.material} / {requestDetails.request.color}: {requestDetails.available_inventory.quantity_kg} kg
                                  {!requestDetails.has_enough && (
                                    <div style={{ color: '#ef4444', marginTop: '8px' }}>
                                      Nema dovoljno na stanju. Predloži izmenu količine ili rok.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ color: '#ef4444' }}>Nema ovog materijala/boje u zalihama</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <button
                              className="designer-primary-button"
                              onClick={handleAcceptRequest}
                            >
                              Prihvatam zahtev
                            </button>
                            <div style={{ flex: 1 }}>
                              <select
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                              >
                                <option value="">Izaberi razlog...</option>
                                <option value="nema količine">Nema količine</option>
                                <option value="nema boje">Nema boje</option>
                                <option value="rok prekratak">Rok prekratak</option>
                                <option value="drugi razlog">Drugi razlog</option>
                              </select>
                              {rejectionReason && (
                                <button
                                  onClick={handleRejectRequest}
                                  style={{
                                    marginTop: '8px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: '#ef4444',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Ne mogu da isporučim
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sekcija: Pošalji proizvođaču (prikazuje se kada je status 'in_progress') */}
                      {selectedRequest.status === 'in_progress' && (
                        <div>
                          <h3 style={{ marginBottom: '20px', color: 'var(--color-olive-dark)' }}>Pošalji proizvođaču</h3>
                          {currentGroup && currentGroup.requests.length > 1 && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.9rem' }}>
                              <strong>Grupna pošiljka (ugovor na blockchainu):</strong>
                              <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                                {currentGroup.requests.map((r) => (
                                  <li key={r.id}>{r.material} / {r.color} / {r.quantity_kg} kg</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                Proizvođač *
                              </label>
                              <select
                                value={sendToManufacturerForm.manufacturer_id}
                                onChange={(e) => setSendToManufacturerForm({ ...sendToManufacturerForm, manufacturer_id: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                              >
                                <option value="">Izaberi proizvođača...</option>
                                {manufacturers.map((mfr) => (
                                  <option key={mfr.user_id} value={mfr.user_id}>
                                    {mfr.full_name}{!mfr.wallet_address ? ' (nema wallet)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {(!currentGroup || currentGroup.requests.length <= 1) && (
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                Količina koju šaljem (kg)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={sendToManufacturerForm.quantity_sent_kg || requestDetails?.request?.quantity_kg || ''}
                                onChange={(e) => setSendToManufacturerForm({ ...sendToManufacturerForm, quantity_sent_kg: e.target.value })}
                                placeholder={requestDetails?.request?.quantity_kg || ''}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                              />
                            </div>
                            )}
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                Datum slanja
                              </label>
                              <input
                                type="date"
                                value={sendToManufacturerForm.shipping_date}
                                onChange={(e) => setSendToManufacturerForm({ ...sendToManufacturerForm, shipping_date: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                Tracking broj (opciono)
                              </label>
                              <input
                                type="text"
                                value={sendToManufacturerForm.tracking_number}
                                onChange={(e) => setSendToManufacturerForm({ ...sendToManufacturerForm, tracking_number: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                              />
                            </div>
                            <button
                              className="designer-primary-button"
                              onClick={handleSendToManufacturer}
                              disabled={isSendingToManufacturer}
                              style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                            >
                              {isSendingToManufacturer ? 'Slanje...' : 'Pošalji proizvođaču'}
                            </button>
                          </div>
                        </div>
                      )}


                      {/* Poruke */}
                      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
                        <h4 style={{ marginBottom: '16px' }}>Komunikacija</h4>
                        <div style={{ marginBottom: '16px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {messages.map((msg) => (
                            <div key={msg.id} style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong>{msg.author_name || msg.author_profile?.full_name}</strong>
                                <span className="designer-muted" style={{ fontSize: '0.85rem' }}>
                                  {formatDate(msg.created_at)}
                                </span>
                              </div>
                              <div>{msg.body}</div>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Napiši poruku..."
                            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                          />
                          <button
                            type="submit"
                            className="designer-primary-button"
                          >
                            Pošalji
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                      Izaberite zahtev sa leve strane
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal za dodavanje zaliha */}
      {showAddModal && (
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
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="designer-card"
            style={{ maxWidth: '500px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '20px' }}>Dodaj novu zalihu</h3>
            <form onSubmit={handleAddItem}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Materijal *
                  </label>
                  <input
                    type="text"
                    value={newItem.material}
                    onChange={(e) => setNewItem({ ...newItem, material: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                    placeholder="npr. Likra"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Boja *
                  </label>
                  <input
                    type="text"
                    value={newItem.color}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                    placeholder="npr. Crna"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Količina (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.quantity_kg}
                    onChange={(e) => setNewItem({ ...newItem, quantity_kg: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Cena/kg (RSD) (opciono)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.price_per_kg}
                    onChange={(e) => setNewItem({ ...newItem, price_per_kg: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="designer-secondary-button"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    className="designer-primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Čuvanje...' : 'Sačuvaj'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DobavljacMaterijalaPage
