import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'
import { approveProductOnBlockchain, switchToSepolia, getCurrentMetaMaskAccount } from '../lib/blockchain'
import { formatMaterialsForDisplay, formatMaterialsDetailed } from '../utils/materialParser'
import { ethers } from 'ethers'

const mapStatus = (status) => {
  const statusMap = { 'active': 'Aktivna', 'planned': 'Planiranje', 'archived': 'Arhivirana' }
  return statusMap[status] || status
}

const mapStage = (stage) => {
  const stageMap = { 'idea': 'Ideja', 'prototype': 'Prototip', 'testing': 'Testiranje', 'approved': 'Odobreno' }
  return stageMap[stage] || stage
}

const mapApprovalStatus = (status) => {
  const statusMap = { 'pending': 'Na čekanju', 'in_progress': 'U toku', 'approved': 'Odobreno', 'changes_required': 'Potrebne korekcije' }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return ''
  const start = new Date(startDate)
  const end = new Date(endDate)
  const months = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar']
  return `${months[start.getMonth()]} - ${months[end.getMonth()]} ${start.getFullYear()}`
}

const TesterCollectionsPage = () => {
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
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [approvalContractAddress, setApprovalContractAddress] = useState(null)
  const [testResults, setTestResults] = useState([])
  const [isLoadingTestResults, setIsLoadingTestResults] = useState(false)
  const [currentMetaMaskAccount, setCurrentMetaMaskAccount] = useState(null)

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const token = localStorage.getItem('auth_access_token')
        console.log('[TesterCollectionsPage] Fetching collections, token exists:', !!token, 'Profile:', profile)
        if (!token) {
          throw new Error('Niste prijavljeni. Molimo prijavite se.')
        }
        const response = await fetch('/api/tester/collections', {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const msg = errorData.message || errorData.error || `Greška ${response.status}`
          if (response.status === 401) {
            throw new Error('Sesija istekla ili niste prijavljeni. Molimo prijavite se ponovo.')
          }
          if (response.status === 403) {
            throw new Error(errorData.message || 'Nemate dozvolu za pristup (potrebna uloga: Tester kvaliteta).')
          }
          throw new Error(msg)
        }
        const collectionsData = await response.json()
        if (!collectionsData?.length) {
          setCollections([])
          setIsLoading(false)
          return
        }
        const collectionsWithStats = await Promise.all(
          collectionsData.map(async (collection) => {
            try {
              const statsResponse = await fetch(`/api/collections/${collection.id}/stats`)
              const stats = statsResponse.ok ? await statsResponse.json() : { idea: 0, prototype: 0, testing: 0, approved: 0, total: 0 }
              return {
                ...collection,
                phaseSummary: { idea: stats.idea || 0, prototype: stats.prototype || 0, testing: stats.testing || 0, approved: stats.approved || 0 },
                modelsCount: stats.total || 0
              }
            } catch {
              return { ...collection, phaseSummary: { idea: 0, prototype: 0, testing: 0, approved: 0 }, modelsCount: 0 }
            }
          })
        )
        setCollections(collectionsWithStats)
        if (collectionsWithStats.length > 0 && !selectedCollectionId) {
          setSelectedCollectionId(collectionsWithStats[0].id)
        }
      } catch (err) {
        setError(err.message || 'Greška pri učitavanju kolekcija')
      } finally {
        setIsLoading(false)
      }
    }
    if (user && profile?.role === 'tester_kvaliteta') {
      fetchCollections()
    } else {
      setIsLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    if (!selectedCollectionId) return
    const fetchModels = async () => {
      try {
        const response = await fetch(`/api/collections/${selectedCollectionId}/products`)
        if (!response.ok) throw new Error('Greška pri učitavanju modela')
        const data = await response.json()
        const modelsData = data.productModels || []
        setModels(modelsData)
        if (modelsData.length > 0 && !selectedModelId) setSelectedModelId(modelsData[0].id)
      } catch (err) {
        console.error('Error fetching models:', err)
      }
    }
    fetchModels()
  }, [selectedCollectionId, selectedModelId])

  useEffect(() => {
    if (!selectedModelId) return
    const fetchModelDetails = async () => {
      try {
        const token = localStorage.getItem('auth_access_token')
        if (!token) {
          console.warn('[TesterCollectionsPage] No auth token found, skipping fetch')
          return
        }
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
        
        const [approvalsResponse, commentsResponse, testResultsResponse] = await Promise.all([
          fetch(`/api/product-models/${selectedModelId}/approvals`, { headers }),
          fetch(`/api/product-models/${selectedModelId}/comments`, { headers }),
          fetch(`/api/tester/products/${selectedModelId}/test-results`, { headers })
        ])
        
        if (approvalsResponse.ok) setApprovals(await approvalsResponse.json())
        if (commentsResponse.ok) setComments(await commentsResponse.json())
        
        if (testResultsResponse.ok) {
          const testData = await testResultsResponse.json()
          setTestResults(testData.testResults || [])
          console.log('[TesterCollectionsPage] Test results loaded:', testData.testResults?.length || 0, 'results')
        } else {
          const errorData = await testResultsResponse.json().catch(() => ({}))
          console.error('[TesterCollectionsPage] Failed to fetch test results:', testResultsResponse.status, errorData)
          
          // Ako je 401, korisnik nije ulogovan - ne postavljamo grešku
          if (testResultsResponse.status === 401) {
            console.warn('[TesterCollectionsPage] User not authenticated, cannot fetch test results')
            setTestResults([])
          } else {
            // Za druge greške, postavljamo prazan niz
            setTestResults([])
          }
        }
      } catch (err) {
        console.error('[TesterCollectionsPage] Error fetching model details:', err)
      }
    }
    fetchModelDetails()
  }, [selectedModelId])

  // Učitaj adresu smart contracta za odobrenje
  useEffect(() => {
    const fetchContractAddress = async () => {
      try {
        const response = await fetch('/api/config/blockchain')
        const config = await response.json()
        // Koristi productApprovalContract ako postoji, inače fallback na contractAddress
        setApprovalContractAddress(config.productApprovalContract || config.contractAddress)
      } catch (err) {
        console.error('Error fetching contract address:', err)
      }
    }
    fetchContractAddress()
  }, [])

  // Proveri trenutni MetaMask account
  useEffect(() => {
    const checkMetaMaskAccount = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const account = await getCurrentMetaMaskAccount()
          setCurrentMetaMaskAccount(account)
        } catch (err) {
          console.warn('Error getting MetaMask account:', err)
        }
      }
    }
    checkMetaMaskAccount()

    // Listener za promene account-a
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.on) {
      const handleAccountsChanged = (accounts) => {
        if (accounts && accounts.length > 0) {
          setCurrentMetaMaskAccount(accounts[0])
        } else {
          setCurrentMetaMaskAccount(null)
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [])

  const handleApproveProduct = async () => {
    if (!selectedModel || !selectedModelId) {
      alert('Molimo izaberite proizvod')
      return
    }

    if (selectedModel.development_stage !== 'testing') {
      alert(`Proizvod mora biti u fazi 'Testiranje'. Trenutna faza: ${mapStage(selectedModel.development_stage)}`)
      return
    }

    if (!approvalContractAddress) {
      alert('Smart contract adresa nije konfigurisana. Kontaktirajte administratora.')
      return
    }

    // Proveri da li je adresa validna
    if (!ethers.isAddress(approvalContractAddress)) {
      alert(`Neispravna adresa smart contracta: ${approvalContractAddress}\n\nProveri backend/.env - PRODUCT_APPROVAL_CONTRACT mora biti validna Ethereum adresa.`)
      return
    }

    if (testResults.length === 0) {
      alert('Proizvod mora biti testiran u laboratoriji pre odobrenja.')
      return
    }

    // Zahtevani materijali - koristi materijale iz proizvoda
    const requiredMaterials = selectedModel.materials || ''

    if (!requiredMaterials) {
      alert('Proizvod mora imati definisane materijale')
      return
    }

    setIsApproving(true)
    setError(null)

    try {
      // Proveri trenutni MetaMask account pre poziva
      let currentAccount = currentMetaMaskAccount
      if (!currentAccount && typeof window !== 'undefined' && window.ethereum) {
        try {
          currentAccount = await getCurrentMetaMaskAccount()
          setCurrentMetaMaskAccount(currentAccount)
        } catch (err) {
          console.warn('Could not get MetaMask account:', err)
        }
      }

      // Upozori korisnika ako nije povezan sa MetaMask-om
      if (!currentAccount) {
        const connect = confirm(
          'MetaMask nije povezan. Da li želite da se povežete?\n\n' +
          'NAPOMENA: Molimo izaberite "Tester kvaliteta" account u MetaMask-u.'
        )
        if (!connect) {
          setIsApproving(false)
          return
        }
        currentAccount = await getCurrentMetaMaskAccount()
        setCurrentMetaMaskAccount(currentAccount)
      }

      // Pozivamo smart contract sa rezultatima testova
      // Smart contract će proveriti da li rezultati testova odgovaraju zahtevanim materijalima
      const txResult = await approveProductOnBlockchain(
        approvalContractAddress,
        selectedModelId,
        testResults, // Prosleđujemo rezultate testova od laboranta
        requiredMaterials,
        'testing',
        null // Ne specificiramo requiredAccount - dozvoljavamo bilo koji account koji je owner ili qualityTester
      )

      console.log('Blockchain transaction:', txResult)

      // Pozivamo backend endpoint da ažurira status u bazi
      const token = localStorage.getItem('auth_access_token')
      const response = await fetch(`/api/tester/products/${selectedModelId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txHash: txResult.txHash,
          requiredMaterials
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška pri odobrenju proizvoda')
      }

      const result = await response.json()
      
      alert('Proizvod je uspešno odobren! Smart contract je proverio rezultate testova i odobrio proizvod.\n\nTransakcija: ' + txResult.txHash.substring(0, 10) + '...')

      // Osveži podatke
      window.location.reload()
    } catch (err) {
      console.error('Error approving product:', err)
      setError(err.message || 'Greška pri odobrenju proizvoda')
      
      // Ako je greška od smart contracta, prikaži detaljnije
      if (err.message.includes('revert') || err.message.includes('require')) {
        alert(`Greška od smart contracta: ${err.message}\n\nProverite da li rezultati testova odgovaraju zahtevanim materijalima.`)
      } else {
        alert(`Greška: ${err.message}`)
      }
    } finally {
      setIsApproving(false)
    }
  }

  const selectedModel = useMemo(() => models.find((m) => m.id === selectedModelId) || models[0], [models, selectedModelId])
  const selectedCollection = useMemo(() => collections.find((c) => c.id === selectedCollectionId), [collections, selectedCollectionId])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!selectedModelId || !newComment.trim()) return
    try {
      setIsSubmittingComment(true)
      const token = localStorage.getItem('auth_access_token')
      const response = await fetch(`/api/product-models/${selectedModelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          body: newComment.trim(),
          author_name: profile?.full_name || user?.email || 'Korisnik',
          role: profile?.role || 'tester_kvaliteta'
        })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška pri dodavanju komentara')
      }
      const newCommentData = await response.json()
      setComments((prev) => [newCommentData, ...prev])
      setNewComment('')
    } catch (err) {
      alert(`Greška: ${err.message}`)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const collectionMetrics = useMemo(() => {
    if (!selectedCollection) return { totalModels: 0, prototypeModels: 0, approvedModels: 0, totalComments: 0 }
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
        <div className="designer-content"><div className="designer-card">Učitavanje...</div></div>
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  if (profile?.role !== 'tester_kvaliteta') {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Nemate pristup ovoj strani. Potrebna uloga: Tester kvaliteta.</div>
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
            <h2>Pregled kvaliteta kolekcija</h2>
            <p className="designer-subtitle">
              Pregled kolekcija dizajnera. Možete ostavljati komentare – bez mogućnosti uređivanja ili brisanja.
            </p>
          </div>
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <label htmlFor="collection-select" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#5a5463' }}>
              Izaberite kolekciju:
            </label>
            <select
              id="collection-select"
              value={selectedCollectionId || ''}
              onChange={(e) => { setSelectedCollectionId(e.target.value); setSelectedModelId(null) }}
              disabled={isLoading || collections.length === 0}
              style={{
                width: '100%', padding: '12px 16px', fontSize: '16px', border: '1px solid #ddd',
                borderRadius: '8px', backgroundColor: isLoading || collections.length === 0 ? '#f5f5f5' : '#fff',
                cursor: isLoading || collections.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}
            >
              <option value="">{isLoading ? 'Učitavanje...' : collections.length === 0 ? 'Nema kolekcija' : '-- Izaberite kolekciju --'}</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>{col.name} ({col.season}) - {mapStatus(col.status)}</option>
              ))}
            </select>
            {error && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#ffe6e6', borderRadius: '8px', color: '#d32f2f' }}>
                <strong>Greška:</strong> {error}
              </div>
            )}
          </div>
          {selectedCollection && (
            <div className="designer-metrics">
              <div className="designer-metric"><span>Ukupno modela</span><strong>{collectionMetrics.totalModels}</strong></div>
              <div className="designer-metric"><span>Modeli u prototipu</span><strong>{collectionMetrics.prototypeModels}</strong></div>
              <div className="designer-metric"><span>Odobreno</span><strong>{collectionMetrics.approvedModels}</strong></div>
              <div className="designer-metric"><span>Komentari</span><strong>{collectionMetrics.totalComments}</strong></div>
            </div>
          )}
        </div>

        {selectedCollection && (
          <div className="designer-card">
            <div className="designer-section-header">
              <div>
                <h3>{selectedCollection.name}</h3>
                <p className="designer-muted">
                  {selectedCollection.season} • {formatPeriod(selectedCollection.start_date, selectedCollection.end_date)} • Status: {mapStatus(selectedCollection.status)}
                </p>
              </div>
            </div>
            <div className="designer-collection-card" style={{ marginTop: '16px' }}>
              <div>
                <h4>{selectedCollection.name}</h4>
                <p className="designer-muted">{selectedCollection.description || 'Nema opisa'}</p>
              </div>
              <div className="designer-collection-meta">
                <span>Status: {mapStatus(selectedCollection.status)}</span>
                <span>Modela: {selectedCollection.modelsCount || 0}</span>
              </div>
              <div className="designer-phase-grid">
                <div><strong>{selectedCollection.phaseSummary?.idea || 0}</strong><span>Ideja</span></div>
                <div><strong>{selectedCollection.phaseSummary?.prototype || 0}</strong><span>Prototip</span></div>
                <div><strong>{selectedCollection.phaseSummary?.testing || 0}</strong><span>Test</span></div>
                <div><strong>{selectedCollection.phaseSummary?.approved || 0}</strong><span>Odobreno</span></div>
              </div>
            </div>
          </div>
        )}

        {selectedCollection && (
          <div className="designer-grid">
            <div className="designer-card">
              <h3>Razvoj modela - {selectedCollection.name}</h3>
              <div className="designer-models">
                <div className="designer-model-list">
                  {models.length === 0 ? (
                    <div className="designer-muted" style={{ padding: '1rem' }}>Nema modela</div>
                  ) : (
                    models.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        className={`designer-model-item ${model.id === selectedModel?.id ? 'active' : ''}`}
                        onClick={() => setSelectedModelId(model.id)}
                      >
                        <div><strong>{model.name}</strong><span className="designer-muted">{model.sku}</span></div>
                        <span className="designer-status">{mapStage(model.development_stage)}</span>
                      </button>
                    ))
                  )}
                </div>
                {selectedModel && (
                  <div className="designer-model-detail">
                    <div className="designer-model-header">
                      <div>
                        <h4>{selectedModel.name}</h4>
                        <p className="designer-muted">{selectedModel.sku} • {selectedCollection?.name}</p>
                      </div>
                      <span className="designer-status-chip">{mapStage(selectedModel.development_stage)}</span>
                    </div>
                    <div className="designer-model-section">
                      <h5>Koncept i inspiracija</h5>
                      <p>{selectedModel.concept || 'Nema opisa'}</p>
                      <p className="designer-muted">Inspiracija: {selectedModel.inspiration || 'Nema informacija'}</p>
                    </div>
                    <div className="designer-model-section">
                      <h5>Paleta i varijante</h5>
                      <div className="designer-tags">
                        {selectedModel.color_palette ? selectedModel.color_palette.split(',').map((tone, idx) => (
                          <span key={idx} className="designer-tag">{tone.trim()}</span>
                        )) : <span className="designer-muted">Nema palete</span>}
                      </div>
                      <p className="designer-muted">Varijante: {selectedModel.variants || 'Nema varijanti'}</p>
                    </div>
                    <div className="designer-model-section">
                      <h5>Tehnički podaci</h5>
                      <div>
                        <strong>Materijali:</strong>
                        {selectedModel.materials ? (
                          <div style={{ marginTop: '8px' }}>
                            {formatMaterialsDetailed(selectedModel.materials).map((material, idx) => (
                              <div key={idx} style={{ marginBottom: '4px', paddingLeft: '12px' }}>
                                • {material}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ marginLeft: '8px' }}>Nema informacija</span>
                        )}
                      </div>
                      <p>Krojevi: {selectedModel.pattern_notes || 'Nema informacija'}</p>
                      <p>Tabela veličina: {selectedModel.size_table || 'Nema informacija'}</p>
                      <p>Napomene: {selectedModel.tech_notes || 'Nema napomena'}</p>
                    </div>
                    {selectedModel.development_stage === 'testing' && (
                      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <h5 style={{ marginTop: 0, marginBottom: '12px', color: '#5a5463' }}>Rezultati testova laboratorije</h5>
                        {testResults.length === 0 ? (
                          <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107', marginBottom: '16px' }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                              ⚠️ Proizvod još nije testiran u laboratoriji. Laborant mora prvo izvršiti testiranje materijala pre nego što možete odobriti proizvod.
                            </p>
                          </div>
                        ) : (
                          <div style={{ marginBottom: '16px' }}>
                            <p style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
                              Rezultati testova koje je laborant potvrdio:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {testResults.map((result, idx) => (
                                <div key={result.id || idx} style={{ 
                                  padding: '10px 12px', 
                                  backgroundColor: '#fff', 
                                  borderRadius: '6px', 
                                  border: '1px solid #e0e0e0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <div>
                                    <strong style={{ color: '#5a5463' }}>{result.material_name}</strong>
                                    <span style={{ marginLeft: '8px', color: '#666', fontSize: '14px' }}>
                                      {result.percentage}%
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#999' }}>
                                    {result.lab_name || 'Laborant'} • {formatDate(result.created_at)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {testResults.length > 0 && (
                              <p style={{ marginTop: '12px', fontSize: '13px', color: '#4caf50' }}>
                                ✓ Proizvod je testiran. Možete nastaviti sa odobrenjem.
                              </p>
                            )}
                          </div>
                        )}
                        
                        <h5 style={{ marginTop: '20px', marginBottom: '12px', color: '#5a5463' }}>Odobrenje proizvoda</h5>
                        {currentMetaMaskAccount && (
                          <div style={{ 
                            marginBottom: '12px', 
                            padding: '10px', 
                            backgroundColor: '#fff3cd', 
                            borderRadius: '6px', 
                            border: '1px solid #ffc107',
                            fontSize: '13px'
                          }}>
                            <strong>MetaMask Account:</strong> {currentMetaMaskAccount.slice(0, 6)}...{currentMetaMaskAccount.slice(-4)}
                            <br />
                            <span style={{ color: '#856404' }}>
                              ⚠️ Proverite da li je ovo "Tester kvaliteta" account. Ako nije, prebacite account u MetaMask-u pre odobrenja.
                            </span>
                          </div>
                        )}
                        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
                          Proizvod je u fazi testiranja. Kliknite na dugme ispod da odobrite proizvod preko blockchaina.
                          Smart contract će proveriti da li materijali odgovaraju zahtevima i da li su rezultati testova u skladu sa zahtevima.
                        </p>
                        <button
                          onClick={handleApproveProduct}
                          disabled={isApproving || !selectedModel.materials || testResults.length === 0}
                          style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#fff',
                            backgroundColor: isApproving || !selectedModel.materials || testResults.length === 0 ? '#ccc' : '#8B5CF6',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isApproving || !selectedModel.materials || testResults.length === 0 ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {isApproving ? 'Odobravanje...' : '✓ Odobri proizvod (Blockchain)'}
                        </button>
                        {!selectedModel.materials && (
                          <p style={{ marginTop: '8px', fontSize: '12px', color: '#d32f2f' }}>
                            Proizvod mora imati definisane materijale pre odobrenja.
                          </p>
                        )}
                        {testResults.length === 0 && selectedModel.materials && (
                          <p style={{ marginTop: '8px', fontSize: '12px', color: '#d32f2f' }}>
                            Proizvod mora biti testiran u laboratoriji pre odobrenja.
                          </p>
                        )}
                      </div>
                    )}
                    {selectedModel.development_stage === 'approved' && (
                      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
                        <p style={{ margin: 0, color: '#2e7d32', fontWeight: '500' }}>
                          ✓ Proizvod je odobren
                        </p>
                      </div>
                    )}
                    <div className="designer-model-footer">
                      <span>Poslednja izmena: {formatDate(selectedModel.updated_at || selectedModel.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="designer-card">
              <h3>Odobrenja i komentari</h3>
              <div className="designer-approvals">
                {approvals.length === 0 ? (
                  <div className="designer-muted" style={{ padding: '1rem' }}>Nema odobrenja za ovaj model</div>
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
                <form onSubmit={handleAddComment} style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Unesite vaš komentar (npr. provera kvaliteta, procenat pamuka...)..."
                      disabled={isSubmittingComment || !selectedModelId}
                      required
                      style={{
                        width: '100%', minHeight: '100px', padding: '12px', fontSize: '14px',
                        border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical',
                        backgroundColor: isSubmittingComment || !selectedModelId ? '#f5f5f5' : '#fff'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="designer-secondary-button"
                    disabled={isSubmittingComment || !selectedModelId || !newComment.trim()}
                  >
                    {isSubmittingComment ? 'Dodavanje...' : 'Dodaj komentar'}
                  </button>
                </form>
                {comments.length === 0 ? (
                  <div className="designer-muted" style={{ padding: '1rem', textAlign: 'center' }}>
                    Nema komentara. Budite prvi koji će dodati komentar!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {comments.map((comment) => (
                      <div key={comment.id} className="designer-comment">
                        <div className="designer-comment-header">
                          <strong>{comment.author_name || 'Anonimni'}</strong>
                          <span className="designer-muted">{comment.role || 'Nepoznata uloga'} • {formatDate(comment.created_at)}</span>
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

        {selectedCollection && selectedModel && (
          <div className="designer-card">
            <h3>Pregled webshop prikaza</h3>
            <p className="designer-muted" style={{ marginBottom: '1rem' }}>Provera kako će proizvod biti predstavljen krajnjim kupcima.</p>
            <div className="designer-webshop">
              <div className="designer-webshop-preview">
                <div className="designer-webshop-image">
                  {selectedModel.media?.length > 0 ? (
                    <img
                      src={selectedModel.media.find((m) => m.is_primary)?.image_url || selectedModel.media[0].image_url}
                      alt={selectedModel.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    'Preview foto'
                  )}
                </div>
                <div>
                  <h4>{selectedModel.name}</h4>
                  <p className="designer-muted">{selectedModel.concept || 'Nema opisa'}</p>
                  <ul>
                    <li>Materijali: {selectedModel.materials || 'Nema'}</li>
                    <li>Varijante: {selectedModel.variants || 'Nema'}</li>
                    <li>Paleta: {selectedModel.color_palette || 'Nema'}</li>
                  </ul>
                </div>
              </div>
              <div className="designer-webshop-meta">
                <div><span className="designer-muted">Naziv</span><strong>{selectedModel.name}</strong></div>
                <div><span className="designer-muted">SKU</span><strong>{selectedModel.sku}</strong></div>
                <div>
                  <span className="designer-muted">Priprema za prodaju</span>
                  <strong>{selectedModel.development_stage === 'approved' ? 'Spremno' : 'U toku'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TesterCollectionsPage
