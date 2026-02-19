import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'
import { formatMaterialsForDisplay, formatMaterialsDetailed } from '../utils/materialParser'

// Helper funkcije za mapiranje podataka
const mapStatus = (status) => {
  const statusMap = {
    'active': 'Aktivna',
    'planned': 'Planiranje',
    'archived': 'Arhivirana'
  }
  return statusMap[status] || status
}

const mapStage = (stage) => {
  const stageMap = {
    'idea': 'Ideja',
    'prototype': 'Prototip',
    'testing': 'Testiranje',
    'approved': 'Odobreno'
  }
  return stageMap[stage] || stage
}

const mapApprovalStatus = (status) => {
  const statusMap = {
    'pending': 'Na čekanju',
    'in_progress': 'U toku',
    'approved': 'Odobreno',
    'changes_required': 'Potrebne korekcije'
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return ''
  const start = new Date(startDate)
  const end = new Date(endDate)
  const months = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar']
  return `${months[start.getMonth()]} - ${months[end.getMonth()]} ${start.getFullYear()}`
}

const DesignerCollectionsPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const [collections, setCollections] = useState([])
  const [models, setModels] = useState([])
  const [approvals, setApprovals] = useState([])
  const [comments, setComments] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState(null)
  const [selectedModelId, setSelectedModelId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [isSavingModel, setIsSavingModel] = useState(false)
  const [isUpdatingStage, setIsUpdatingStage] = useState(false)

  const canEditModel = (model) => model && model.development_stage !== 'approved'

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) || models[0],
    [models, selectedModelId]
  )

  const selectedCollection = useMemo(
    () => collections.find((col) => col.id === selectedCollectionId),
    [collections, selectedCollectionId]
  )

  useEffect(() => {
    if (selectedModel && canEditModel(selectedModel)) {
      setEditForm({
        name: selectedModel.name || '',
        sku: selectedModel.sku || '',
        concept: selectedModel.concept || '',
        inspiration: selectedModel.inspiration || '',
        color_palette: selectedModel.color_palette || '',
        variants: selectedModel.variants || '',
        materials: selectedModel.materials || '',
        pattern_notes: selectedModel.pattern_notes || '',
        size_table: selectedModel.size_table || '',
        tech_notes: selectedModel.tech_notes || '',
        price: selectedModel.price || ''
      })
    } else {
      setEditForm(null)
    }
  }, [selectedModel])

  // Učitaj kolekcije sa statistikom
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const token = localStorage.getItem('auth_access_token')
        
        const response = await fetch('/api/designer/collections', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        })
        
        if (!response.ok) {
          let errorMessage = `Greška pri učitavanju kolekcija: ${response.status}`
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch (e) {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          }
          
          if (response.status === 401) {
            errorMessage = 'Niste autentifikovani. Molimo ulogujte se ponovo.'
          } else if (response.status === 403) {
            errorMessage = 'Nemate dozvolu za pristup ovim podacima.'
          }
          
          throw new Error(errorMessage)
        }
        
        const collectionsData = await response.json()
        
        if (!collectionsData || collectionsData.length === 0) {
          setCollections([])
          setIsLoading(false)
          return
        }
        
        // Učitaj statistiku za svaku kolekciju
        const collectionsWithStats = await Promise.all(
          collectionsData.map(async (collection) => {
            try {
              const statsResponse = await fetch(`/api/collections/${collection.id}/stats`)
              const stats = statsResponse.ok ? await statsResponse.json() : { idea: 0, prototype: 0, testing: 0, approved: 0, total: 0 }
              return {
                ...collection,
                phaseSummary: {
                  idea: stats.idea || 0,
                  prototype: stats.prototype || 0,
                  testing: stats.testing || 0,
                  approved: stats.approved || 0
                },
                modelsCount: stats.total || 0
              }
            } catch (err) {
              console.error('Error fetching stats for collection:', collection.id, err)
              return {
                ...collection,
                phaseSummary: { idea: 0, prototype: 0, testing: 0, approved: 0 },
                modelsCount: 0
              }
            }
          })
        )
        
        setCollections(collectionsWithStats)
        
        // Postavi prvu kolekciju kao selektovanu samo ako još nije selektovana
        if (collectionsWithStats.length > 0 && !selectedCollectionId) {
          setSelectedCollectionId(collectionsWithStats[0].id)
        }
      } catch (err) {
        console.error('[DesignerCollectionsPage] Error fetching collections:', err)
        setError(err.message || 'Greška pri učitavanju kolekcija')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user && profile?.role === 'modni_dizajner') {
      fetchCollections()
    } else {
      setIsLoading(false)
    }
  }, [user, profile]) // Uklonjen selectedCollectionId iz dependency array-a

  // Učitaj modele za selektovanu kolekciju
  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedCollectionId) return
      
      try {
        const response = await fetch(`/api/collections/${selectedCollectionId}/products`)
        
        if (!response.ok) {
          throw new Error('Greška pri učitavanju modela')
        }
        
        const data = await response.json()
        const modelsData = data.productModels || []
        
        setModels(modelsData)
        
        // Postavi prvi model kao selektovani
        if (modelsData.length > 0 && !selectedModelId) {
          setSelectedModelId(modelsData[0].id)
        }
      } catch (err) {
        console.error('Error fetching models:', err)
      }
    }
    
    fetchModels()
  }, [selectedCollectionId, selectedModelId])

  // Učitaj odobrenja i komentare za selektovani model
  useEffect(() => {
    const fetchModelDetails = async () => {
      if (!selectedModelId) return
      
      try {
        const token = localStorage.getItem('auth_access_token')
        const [approvalsResponse, commentsResponse] = await Promise.all([
          fetch(`/api/product-models/${selectedModelId}/approvals`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          }),
          fetch(`/api/product-models/${selectedModelId}/comments`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          })
        ])
        
        if (approvalsResponse.ok) {
          const approvalsData = await approvalsResponse.json()
          setApprovals(approvalsData)
        }
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json()
          setComments(commentsData)
        }
      } catch (err) {
        console.error('Error fetching model details:', err)
      }
    }
    
    fetchModelDetails()
  }, [selectedModelId])

  // Funkcija za promenu statusa kolekcije
  const handleStatusChange = async (newStatus) => {
    if (!selectedCollectionId) return

    try {
      setIsUpdatingStatus(true)
      const token = localStorage.getItem('auth_access_token')
      
      const response = await fetch(`/api/collections/${selectedCollectionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška pri ažuriranju statusa')
      }

      const updatedCollection = await response.json()
      
      // Ažuriraj kolekciju u listi
      setCollections(prev => 
        prev.map(col => 
          col.id === selectedCollectionId 
            ? { ...col, ...updatedCollection }
            : col
        )
      )

      // Pošalji custom event da javna stranica osveži podatke
      window.dispatchEvent(new CustomEvent('collectionStatusChanged', {
        detail: { collectionId: selectedCollectionId, newStatus: newStatus }
      }))
    } catch (err) {
      console.error('[DesignerCollectionsPage] Error updating status:', err)
      alert(`Greška pri ažuriranju statusa: ${err.message}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Funkcija za dodavanje komentara
  const handleAddComment = async (e) => {
    e.preventDefault()
    
    if (!selectedModelId || !newComment.trim()) {
      return
    }

    try {
      setIsSubmittingComment(true)
      const token = localStorage.getItem('auth_access_token')
      
      const response = await fetch(`/api/product-models/${selectedModelId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          body: newComment.trim(),
          author_name: profile?.full_name || user?.email || 'Korisnik',
          role: profile?.role || 'korisnik'
        })
      })

      if (!response.ok) {
        let errorMessage = 'Greška pri dodavanju komentara'
        try {
          const errorData = await response.json()
          console.error('[DesignerCollectionsPage] Comment error response:', errorData)
          errorMessage = errorData.error || errorData.message || errorMessage
          
          if (response.status === 403) {
            errorMessage = `Nemate dozvolu za dodavanje komentara. ${errorData.message || 'Vaša uloga: ' + (profile?.role || 'nepoznata')}`
          } else if (response.status === 401) {
            errorMessage = 'Niste autentifikovani. Molimo ulogujte se ponovo.'
          }
        } catch (e) {
          const errorText = await response.text()
          console.error('[DesignerCollectionsPage] Comment error text:', errorText)
        }
        throw new Error(errorMessage)
      }

      const newCommentData = await response.json()
      
      // Dodaj novi komentar na početak liste
      setComments(prev => [newCommentData, ...prev])
      
      // Očisti formu
      setNewComment('')
    } catch (err) {
      console.error('[DesignerCollectionsPage] Error adding comment:', err)
      console.error('[DesignerCollectionsPage] User profile:', { 
        role: profile?.role, 
        full_name: profile?.full_name,
        user_id: user?.id 
      })
      alert(`Greška pri dodavanju komentara: ${err.message}`)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleSaveModel = async () => {
    if (!selectedModelId || !editForm || !canEditModel(selectedModel)) return

    try {
      setIsSavingModel(true)
      const token = localStorage.getItem('auth_access_token')
      const response = await fetch(`/api/product-models/${selectedModelId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška pri čuvanju modela')
      }

      const updated = await response.json()
      setModels((prev) => prev.map((m) => (m.id === selectedModelId ? { ...m, ...updated } : m)))
    } catch (err) {
      alert(`Greška pri čuvanju: ${err.message}`)
    } finally {
      setIsSavingModel(false)
    }
  }

  // Funkcija za promenu statusa proizvoda
  const handleStageChange = async (newStage) => {
    if (!selectedModelId) return

    try {
      setIsUpdatingStage(true)
      const token = localStorage.getItem('auth_access_token')
      
      const response = await fetch(`/api/designer/products/${selectedModelId}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ stage: newStage })
      })

      if (!response.ok) {
        let errorMessage = 'Greška pri ažuriranju statusa'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          // Ako ima dodatne informacije o grešci
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`
          }
        } catch (e) {
          // Ako nije JSON, pokušaj da pročitaš tekst
          const errorText = await response.text().catch(() => '')
          if (errorText) {
            errorMessage = errorText
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // Ažuriraj model u listi - selectedModel će se automatski ažurirati preko useMemo
      setModels((prev) => 
        prev.map((m) => 
          m.id === selectedModelId 
            ? { ...m, ...result.product }
            : m
        )
      )
    } catch (err) {
      console.error('[DesignerCollectionsPage] Error updating stage:', err)
      alert(`Greška pri ažuriranju statusa: ${err.message}`)
    } finally {
      setIsUpdatingStage(false)
    }
  }

  // Izračunaj metrike za selektovanu kolekciju
  const collectionMetrics = useMemo(() => {
    if (!selectedCollection) {
      return {
        totalModels: 0,
        prototypeModels: 0,
        approvedModels: 0,
        totalComments: 0
      }
    }
    
    return {
      totalModels: selectedCollection.modelsCount || 0,
      prototypeModels: selectedCollection.phaseSummary?.prototype || 0,
      approvedModels: selectedCollection.phaseSummary?.approved || 0,
      totalComments: comments.length
    }
  }, [selectedCollection, comments])

  if (loading || isLoading) {
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
          <div className="designer-card">Nemate pristup ovoj strani.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="designer-page">
      <Navbar />
      <div className="designer-content">
        <div className="designer-card designer-card--hero">
          <div>
            <h2>Pregled kolekcija i razvoj proizvoda</h2>
            <p className="designer-subtitle">
              Centralni radni prostor za planiranje, praćenje i validaciju modnih proizvoda.
            </p>
          </div>
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <label htmlFor="collection-select" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#5a5463' }}>
              Izaberite kolekciju za pregled:
            </label>
            <select
              id="collection-select"
              value={selectedCollectionId || ''}
              onChange={(e) => {
                const collectionId = e.target.value
                setSelectedCollectionId(collectionId)
                setSelectedModelId(null) // Resetuj selektovani model kada se promeni kolekcija
              }}
              disabled={isLoading || collections.length === 0}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: isLoading || collections.length === 0 ? '#f5f5f5' : '#fff',
                cursor: isLoading || collections.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <option value="">
                {isLoading ? 'Učitavanje...' : collections.length === 0 ? 'Nema dostupnih kolekcija' : '-- Izaberite kolekciju --'}
              </option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name} ({collection.season}) - {mapStatus(collection.status)}
                </option>
              ))}
            </select>
            {error && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#ffe6e6', borderRadius: '8px', color: '#d32f2f' }}>
                <strong>Greška:</strong> {error}
              </div>
            )}
            {!isLoading && collections.length === 0 && !error && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '8px', color: '#856404' }}>
                Nema kolekcija u bazi podataka. Molimo kreirajte kolekciju.
              </div>
            )}
          </div>
          {selectedCollection && (
            <div className="designer-metrics">
              <div className="designer-metric">
                <span>Ukupno modela</span>
                <strong>{collectionMetrics.totalModels}</strong>
              </div>
              <div className="designer-metric">
                <span>Modeli u prototipu</span>
                <strong>{collectionMetrics.prototypeModels}</strong>
              </div>
              <div className="designer-metric">
                <span>Odobreno za proizvodnju</span>
                <strong>{collectionMetrics.approvedModels}</strong>
              </div>
              <div className="designer-metric">
                <span>Komentari</span>
                <strong>{collectionMetrics.totalComments}</strong>
              </div>
            </div>
          )}
        </div>

        {selectedCollection && (
          <div className="designer-card">
            <div className="designer-section-header">
              <div>
                <h3>Selektovana kolekcija: {selectedCollection.name}</h3>
                <p className="designer-muted">
                  {selectedCollection.season} • {formatPeriod(selectedCollection.start_date, selectedCollection.end_date)} • Status: {mapStatus(selectedCollection.status)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label htmlFor="status-select" style={{ fontWeight: '500', color: '#5a5463' }}>
                  Promeni status:
                </label>
                <select
                  id="status-select"
                  value={selectedCollection.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: isUpdatingStatus ? '#f5f5f5' : '#fff',
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    minWidth: '150px'
                  }}
                >
                  <option value="planned">Planiranje</option>
                  <option value="active">Aktivna</option>
                  <option value="archived">Arhivirana</option>
                </select>
                {isUpdatingStatus && (
                  <span style={{ fontSize: '14px', color: '#5a5463' }}>Čuvanje...</span>
                )}
              </div>
            </div>
            {error && (
              <div style={{ color: 'red', marginBottom: '1rem', padding: '12px', backgroundColor: '#ffe6e6', borderRadius: '8px' }}>
                Greška: {error}
              </div>
            )}
            <div className="designer-collection-card" style={{ marginTop: '16px' }}>
              <div>
                <h4>{selectedCollection.name}</h4>
                <p className="designer-muted">
                  {selectedCollection.description || 'Nema opisa'}
                </p>
              </div>
              <div className="designer-collection-meta">
                <span>Status: {mapStatus(selectedCollection.status)}</span>
                <span>Modela: {selectedCollection.modelsCount || 0}</span>
              </div>
              <div className="designer-phase-grid">
                <div>
                  <strong>{selectedCollection.phaseSummary?.idea || 0}</strong>
                  <span>Ideja</span>
                </div>
                <div>
                  <strong>{selectedCollection.phaseSummary?.prototype || 0}</strong>
                  <span>Prototip</span>
                </div>
                <div>
                  <strong>{selectedCollection.phaseSummary?.testing || 0}</strong>
                  <span>Test</span>
                </div>
                <div>
                  <strong>{selectedCollection.phaseSummary?.approved || 0}</strong>
                  <span>Odobreno</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedCollection && collections.length > 0 && (
          <div className="designer-card">
            <p className="designer-muted" style={{ textAlign: 'center', padding: '2rem' }}>
              Molimo izaberite kolekciju iz padajućeg menija iznad da biste videli detalje.
            </p>
          </div>
        )}

        {selectedCollection && (
          <div className="designer-grid">
            <div className="designer-card">
              <h3>Razvoj modela - {selectedCollection.name}</h3>
            <div className="designer-models">
              <div className="designer-model-list">
                {models.length === 0 ? (
                  <div className="designer-muted" style={{ padding: '1rem' }}>
                    Nema modela za ovu kolekciju
                  </div>
                ) : (
                  models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      className={`designer-model-item ${model.id === selectedModel?.id ? 'active' : ''}`}
                      onClick={() => setSelectedModelId(model.id)}
                    >
                      <div className="designer-model-item-text">
                        <strong>{model.name}</strong>
                        <span className="designer-muted">{model.sku}</span>
                      </div>
                      <span className="designer-status">{mapStage(model.development_stage)}</span>
                    </button>
                  ))
                )}
              </div>
              {selectedModel && (
                <div className="designer-model-detail">
                  <div className="designer-model-header">
                    <div>
                      {canEditModel(selectedModel) && editForm ? (
                        <>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Naziv modela"
                            className="designer-edit-input designer-edit-input--title"
                          />
                          <input
                            type="text"
                            value={editForm.sku}
                            onChange={(e) => setEditForm((f) => ({ ...f, sku: e.target.value }))}
                            placeholder="SKU"
                            className="designer-edit-input designer-muted"
                          />
                        </>
                      ) : (
                        <>
                          <h4>{selectedModel.name}</h4>
                          <p className="designer-muted">
                            {selectedModel.sku} • {selectedCollection?.name || ''}
                          </p>
                        </>
                      )}
                    </div>
                    <span className="designer-status-chip">{mapStage(selectedModel.development_stage)}</span>
                  </div>
                  <div className="designer-model-section">
                    <h5>Koncept i inspiracija</h5>
                    {canEditModel(selectedModel) && editForm ? (
                      <>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Koncept:</span>
                          <textarea
                            value={editForm.concept}
                            onChange={(e) => setEditForm((f) => ({ ...f, concept: e.target.value }))}
                            placeholder="Opis koncepta"
                            className="designer-edit-input"
                            rows={2}
                          />
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Inspiracija:</span>
                          <input
                            type="text"
                            value={editForm.inspiration}
                            onChange={(e) => setEditForm((f) => ({ ...f, inspiration: e.target.value }))}
                            placeholder="Inspiracija"
                            className="designer-edit-input"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Koncept:</span>
                          <span className="designer-tech-content">{selectedModel.concept || 'Nema opisa koncepta'}</span>
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Inspiracija:</span>
                          <span className="designer-tech-content">{selectedModel.inspiration || 'Nema informacija'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="designer-model-section">
                    <h5>Paleta i varijante</h5>
                    {canEditModel(selectedModel) && editForm ? (
                      <>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Paleta:</span>
                          <input
                            type="text"
                            value={editForm.color_palette}
                            onChange={(e) => setEditForm((f) => ({ ...f, color_palette: e.target.value }))}
                            placeholder="npr. crvena, plava, crna"
                            className="designer-edit-input"
                          />
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Varijante:</span>
                          <input
                            type="text"
                            value={editForm.variants}
                            onChange={(e) => setEditForm((f) => ({ ...f, variants: e.target.value }))}
                            placeholder="npr. Regular, Cropped"
                            className="designer-edit-input"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Paleta:</span>
                          <div className="designer-tags">
                            {selectedModel.color_palette ? (
                              selectedModel.color_palette.split(',').map((tone, idx) => (
                                <span key={idx} className="designer-tag">
                                  {tone.trim()}
                                </span>
                              ))
                            ) : (
                              <span className="designer-muted designer-tech-content">Nema palete</span>
                            )}
                          </div>
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Varijante:</span>
                          <span className="designer-tech-content">{selectedModel.variants || 'Nema varijanti'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="designer-model-section">
                    <h5>Tehnički podaci</h5>
                    {canEditModel(selectedModel) && editForm ? (
                      <>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Materijali:</span>
                          <input
                            type="text"
                            value={editForm.materials}
                            onChange={(e) => setEditForm((f) => ({ ...f, materials: e.target.value }))}
                            placeholder="npr. Pamuk 98%, Elastan 2%"
                            className="designer-edit-input"
                          />
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Krojevi:</span>
                          <input
                            type="text"
                            value={editForm.pattern_notes}
                            onChange={(e) => setEditForm((f) => ({ ...f, pattern_notes: e.target.value }))}
                            placeholder="Opis kroja"
                            className="designer-edit-input"
                          />
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Tabela veličina:</span>
                          <input
                            type="text"
                            value={editForm.size_table}
                            onChange={(e) => setEditForm((f) => ({ ...f, size_table: e.target.value }))}
                            placeholder="npr. 24-34"
                            className="designer-edit-input"
                          />
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Napomene:</span>
                          <textarea
                            value={editForm.tech_notes}
                            onChange={(e) => setEditForm((f) => ({ ...f, tech_notes: e.target.value }))}
                            placeholder="Tehničke napomene"
                            className="designer-edit-input"
                            rows={2}
                          />
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Cena (RSD):</span>
                          <input
                            type="number"
                            value={editForm.price}
                            onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value ? parseFloat(e.target.value) : '' }))}
                            placeholder="npr. 5000"
                            className="designer-edit-input"
                            min="0"
                            step="100"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Materijali:</span>
                          {selectedModel.materials ? (
                            <div className="designer-tech-content">
                              {formatMaterialsDetailed(selectedModel.materials).map((material, idx) => (
                                <div key={idx}>• {material}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="designer-tech-content">Nema informacija</span>
                          )}
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Krojevi:</span>
                          <span className="designer-tech-content">{selectedModel.pattern_notes || 'Nema informacija'}</span>
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Tabela veličina:</span>
                          <span className="designer-tech-content">{selectedModel.size_table || 'Nema informacija'}</span>
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Napomene:</span>
                          <span className="designer-tech-content">{selectedModel.tech_notes || 'Nema napomena'}</span>
                        </div>
                        <div className="designer-tech-block">
                          <span className="designer-tech-label">Cena (RSD):</span>
                          <span className="designer-tech-content">
                            {selectedModel.price 
                              ? new Intl.NumberFormat('sr-RS', { 
                                  style: 'currency', 
                                  currency: 'RSD',
                                  minimumFractionDigits: 0 
                                }).format(selectedModel.price)
                              : 'Nije postavljena'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="designer-model-footer">
                    <span>Poslednja izmena: {formatDate(selectedModel.updated_at || selectedModel.created_at)}</span>
                    {canEditModel(selectedModel) && (
                      <button
                        type="button"
                        className="designer-primary-button"
                        onClick={handleSaveModel}
                        disabled={isSavingModel}
                      >
                        {isSavingModel ? 'Čuvanje...' : 'Sačuvaj izmene'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

            <div className="designer-card">
              <h3>Saradnja i odobrenja</h3>
            <div className="designer-approvals">
              {approvals.length === 0 ? (
                <div className="designer-muted" style={{ padding: '1rem' }}>
                  Nema odobrenja za ovaj model
                </div>
              ) : (
                approvals.map((approval) => (
                  <div key={approval.id} className="designer-approval-item">
                    <div>
                      <strong>{approval.approval_item}</strong>
                      <span className="designer-muted">{approval.note || 'Nema napomene'}</span>
                    </div>
                    <span className="designer-status">{mapApprovalStatus(approval.status)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="designer-comments">
              <h4>Komentari tima</h4>
              
              {/* Forma za dodavanje komentara */}
              <form onSubmit={handleAddComment} style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Unesite vaš komentar..."
                    disabled={isSubmittingComment || !selectedModelId}
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
                      backgroundColor: isSubmittingComment || !selectedModelId ? '#f5f5f5' : '#fff'
                    }}
                  />
                </div>
                <button 
                  type="submit" 
                  className="designer-secondary-button"
                  disabled={isSubmittingComment || !selectedModelId || !newComment.trim()}
                  style={{
                    opacity: (isSubmittingComment || !selectedModelId || !newComment.trim()) ? 0.6 : 1,
                    cursor: (isSubmittingComment || !selectedModelId || !newComment.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmittingComment ? 'Dodavanje...' : 'Dodaj komentar'}
                </button>
              </form>

              {/* Lista komentara */}
              {comments.length === 0 ? (
                <div className="designer-muted" style={{ padding: '1rem', textAlign: 'center' }}>
                  Nema komentara za ovaj model. Budite prvi koji će dodati komentar!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {comments.map((comment) => (
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
            </div>
          </div>
        )}

        {selectedCollection && (
          <div className="designer-card">
            <div className="designer-section-header">
              <div>
                <h3>Pregled webshop prikaza</h3>
                <p className="designer-muted">
                  Provera kako će proizvod biti predstavljen krajnjim kupcima.
                </p>
              </div>
              {selectedModel ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label htmlFor="stage-select" style={{ fontWeight: '500', color: '#5a5463', fontSize: '14px' }}>
                    Status proizvoda:
                  </label>
                  <select
                    id="stage-select"
                    value={selectedModel.development_stage || 'idea'}
                    onChange={(e) => handleStageChange(e.target.value)}
                    disabled={isUpdatingStage}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: isUpdatingStage ? '#f5f5f5' : '#fff',
                      cursor: isUpdatingStage ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      minWidth: '150px'
                    }}
                  >
                    <option value="idea">Ideja</option>
                    <option value="prototype">Prototip</option>
                    <option value="testing">Testiranje</option>
                  </select>
                  {isUpdatingStage && (
                    <span style={{ fontSize: '14px', color: '#5a5463' }}>Čuvanje...</span>
                  )}
                </div>
              ) : (
                <button type="button" className="designer-primary-button" disabled>
                  Izaberite proizvod
                </button>
              )}
            </div>
            {selectedModel ? (
              <div className="designer-webshop">
                <div className="designer-webshop-preview">
                  <div className="designer-webshop-image">
                    {selectedModel.media && selectedModel.media.length > 0 ? (
                      <img 
                        src={selectedModel.media.find(m => m.is_primary)?.image_url || selectedModel.media[0].image_url} 
                        alt={selectedModel.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      'Preview foto'
                    )}
                  </div>
                  <div className="designer-webshop-details">
                    <h4>{selectedModel.name}</h4>
                    <div className="designer-webshop-block">
                      <span className="designer-tech-label">Opis:</span>
                      <p className="designer-muted designer-tech-content">
                        {selectedModel.concept || 'Elegantan komad sa fokusom na teksturu i fluidnost.'}
                      </p>
                    </div>
                    <div className="designer-webshop-block">
                      <span className="designer-tech-label">Materijali:</span>
                      <span className="designer-tech-content">
                        {selectedModel.materials ? formatMaterialsForDisplay(selectedModel.materials) : 'Nema informacija'}
                      </span>
                    </div>
                    <div className="designer-webshop-block">
                      <span className="designer-tech-label">Varijante:</span>
                      <span className="designer-tech-content">{selectedModel.variants || 'Nema varijanti'}</span>
                    </div>
                    <div className="designer-webshop-block">
                      <span className="designer-tech-label">Paleta:</span>
                      <span className="designer-tech-content">{selectedModel.color_palette || 'Nema palete'}</span>
                    </div>
                  </div>
                </div>
                <div className="designer-webshop-meta">
                  <div className="designer-webshop-meta-row">
                    <span className="designer-muted">Naziv proizvoda:</span>
                    <strong>{selectedModel.name}</strong>
                  </div>
                  <div className="designer-webshop-meta-row">
                    <span className="designer-muted">SKU:</span>
                    <strong>{selectedModel.sku}</strong>
                  </div>
                  <div className="designer-webshop-meta-row">
                    <span className="designer-muted">Istaknute karakteristike:</span>
                    <strong>Premium materijal, ručna obrada</strong>
                  </div>
                  <div className="designer-webshop-meta-row">
                    <span className="designer-muted">Priprema za online prodaju:</span>
                    <strong>{selectedModel.development_stage === 'approved' ? 'Spremno za prodaju' : 'U toku fotografisanje'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="designer-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                Izaberite model iz liste da biste videli webshop pregled.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DesignerCollectionsPage
