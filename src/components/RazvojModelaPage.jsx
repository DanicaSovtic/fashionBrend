import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'

const RazvojModelaPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  
  const [collections, setCollections] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [models, setModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [requests, setRequests] = useState([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  
  // Modal state
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState(null)
  const [requestForm, setRequestForm] = useState({
    material: '',
    color: '',
    quantity_kg: '',
    deadline: '',
    supplier_id: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Učitaj kolekcije
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const token = localStorage.getItem('auth_access_token')
        const res = await fetch('/api/designer/collections', {
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

  // Učitaj dobavljače
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = localStorage.getItem('auth_access_token')
        const res = await fetch('/api/designer/material-requests/suppliers', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await res.json()
        setSuppliers(data.suppliers || [])
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      }
    }
    fetchSuppliers()
  }, [])

  // Učitaj modele
  useEffect(() => {
    if (user && profile?.role === 'modni_dizajner') {
      fetchModels()
    }
  }, [user, profile, selectedCollectionId, searchQuery])

  // Učitaj zahteve
  useEffect(() => {
    if (user && profile?.role === 'modni_dizajner') {
      fetchRequests()
    }
  }, [user, profile])

  const fetchModels = async () => {
    try {
      setIsLoadingModels(true)
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (selectedCollectionId) params.append('collection_id', selectedCollectionId)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/designer/material-requests/models?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setModels(data.models || [])
    } catch (error) {
      console.error('Error fetching models:', error)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true)
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch('/api/designer/material-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const handleRequestMaterial = (model) => {
    setSelectedModel(model)
    setRequestForm({
      material: '',
      color: '',
      quantity_kg: '',
      deadline: '',
      supplier_id: '',
      notes: ''
    })
    setShowRequestModal(true)
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    
    if (!requestForm.material || !requestForm.color || !requestForm.quantity_kg) {
      alert('Materijal, boja i količina su obavezni')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch('/api/designer/material-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_model_id: selectedModel?.id || null,
          material: requestForm.material,
          color: requestForm.color,
          quantity_kg: parseFloat(requestForm.quantity_kg),
          deadline: requestForm.deadline || null,
          supplier_id: requestForm.supplier_id || null,
          notes: requestForm.notes || null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri slanju zahteva')
      }

      const data = await res.json()
      alert('Zahtev je uspešno poslat!')
      setShowRequestModal(false)
      setSelectedModel(null)
      await fetchModels()
      await fetchRequests()
    } catch (error) {
      alert(error.message || 'Greška pri slanju zahteva')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getMaterialStatusLabel = (status) => {
    const labels = {
      'no_request': 'Nema zahteva',
      'new': 'Poslato',
      'in_progress': 'Prihvaćeno',
      'sent': 'Poslato (u transportu)',
      'completed': 'Završeno',
      'rejected': 'Odbijeno'
    }
    return labels[status] || status
  }

  const getMaterialStatusColor = (status) => {
    const colors = {
      'no_request': '#6b7280',
      'new': '#3b82f6',
      'in_progress': '#f59e0b',
      'sent': 'var(--color-olive-dark)',
      'completed': '#10b981',
      'rejected': '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  const getRequestStatusLabel = (status) => {
    const labels = {
      'new': 'Novo',
      'in_progress': 'U toku',
      'sent': 'Poslato',
      'completed': 'Završeno',
      'rejected': 'Odbijeno'
    }
    return labels[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading || isLoadingModels) {
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

  if (profile?.role !== 'modni_dizajner') {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Nemate pristup ovoj strani. Potrebna uloga: Modni dizajner.</div>
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
          <h2>Razvoj modela</h2>
          <p className="designer-subtitle">
            Upravljajte svojim modelima i šaljite zahteve za materijale dobavljačima
          </p>
        </div>

        {/* Filteri */}
        <div className="designer-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>
                Pretraga modela
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži po nazivu ili SKU..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>
        </div>

        {/* Tabela modela */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Moji modeli</h3>
          {models.length === 0 ? (
            <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
              {isLoadingModels ? 'Učitavanje...' : 'Nema modela'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Naziv / SKU</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Kolekcija</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Faza razvoja</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status materijala</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Akcija</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <strong>{model.name}</strong>
                          <br />
                          <span className="designer-muted" style={{ fontSize: '0.85rem' }}>
                            {model.sku || 'Nema SKU'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {model.collection?.name || '-'}
                        {model.collection?.season && (
                          <span className="designer-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                            {model.collection.season}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="designer-status-chip">
                          {model.development_stage === 'idea' ? 'Ideja' :
                           model.development_stage === 'prototype' ? 'Prototip' :
                           model.development_stage === 'testing' ? 'Testiranje' :
                           model.development_stage === 'approved' ? 'Odobreno' : model.development_stage}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            backgroundColor: getMaterialStatusColor(model.material_status) + '20',
                            color: getMaterialStatusColor(model.material_status)
                          }}
                        >
                          {getMaterialStatusLabel(model.material_status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRequestMaterial(model)}
                          className="designer-primary-button"
                          style={{ fontSize: '0.85rem', padding: '6px 16px' }}
                        >
                          Zatraži materijal
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lista poslatih zahteva */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Moji poslati zahtevi</h3>
          {isLoadingRequests ? (
            <div className="designer-muted" style={{ padding: '1rem', textAlign: 'center' }}>
              Učitavanje...
            </div>
          ) : requests.length === 0 ? (
            <div className="designer-muted" style={{ padding: '1rem', textAlign: 'center' }}>
              Nema poslatih zahteva
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Model / SKU</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Materijal / boja / kg</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Dobavljač</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr 
                      key={req.id} 
                      style={{ 
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // Opciono: otvori detalje
                        alert(`Zahtev: ${req.model_name || req.model_sku}\nStatus: ${getRequestStatusLabel(req.status)}\nMaterijal: ${req.material} / ${req.color} / ${req.quantity_kg} kg`)
                      }}
                    >
                      <td style={{ padding: '10px' }}>
                        <strong>{req.model_name || req.model_sku || '-'}</strong>
                        {req.model_sku && req.model_name && (
                          <span className="designer-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                            {req.model_sku}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {req.material} / {req.color} / {req.quantity_kg} kg
                      </td>
                      <td style={{ padding: '10px' }}>
                        {req.supplier_profile?.full_name || 'Nije dodeljen'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            backgroundColor: getMaterialStatusColor(req.status) + '20',
                            color: getMaterialStatusColor(req.status)
                          }}
                        >
                          {getRequestStatusLabel(req.status)}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {formatDate(req.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal za slanje zahteva */}
      {showRequestModal && (
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
          onClick={() => setShowRequestModal(false)}
        >
          <div
            className="designer-card"
            style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '20px' }}>
              Zatraži materijal
              {selectedModel && (
                <span className="designer-muted" style={{ fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
                  {selectedModel.name} ({selectedModel.sku})
                </span>
              )}
            </h3>
            <form onSubmit={handleSubmitRequest}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Materijal *
                  </label>
                  <input
                    type="text"
                    value={requestForm.material}
                    onChange={(e) => setRequestForm({ ...requestForm, material: e.target.value })}
                    required
                    placeholder="npr. Likra"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Boja *
                  </label>
                  <input
                    type="text"
                    value={requestForm.color}
                    onChange={(e) => setRequestForm({ ...requestForm, color: e.target.value })}
                    required
                    placeholder="npr. Crna"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Količina (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={requestForm.quantity_kg}
                    onChange={(e) => setRequestForm({ ...requestForm, quantity_kg: e.target.value })}
                    required
                    placeholder="npr. 100"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Rok (datum)
                  </label>
                  <input
                    type="date"
                    value={requestForm.deadline}
                    onChange={(e) => setRequestForm({ ...requestForm, deadline: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Dobavljač
                  </label>
                  <select
                    value={requestForm.supplier_id}
                    onChange={(e) => setRequestForm({ ...requestForm, supplier_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  >
                    <option value="">Izaberi dobavljača (opciono)</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.user_id} value={supplier.user_id}>
                        {supplier.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Napomena (opciono)
                  </label>
                  <textarea
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                    rows="3"
                    placeholder="Dodatne napomene..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="designer-secondary-button"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    className="designer-primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Slanje...' : 'Pošalji zahtev'}
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

export default RazvojModelaPage
