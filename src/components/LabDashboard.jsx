import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'
import { formatMaterialsForDisplay, formatMaterialsDetailed, parseMaterials } from '../utils/materialParser'

const LabDashboard = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const [pendingTests, setPendingTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [testResult, setTestResult] = useState({
    materialName: '',
    percentage: '',
    certificateHash: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    const fetchPendingTests = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const token = localStorage.getItem('auth_access_token')
        if (!token) {
          throw new Error('Niste prijavljeni. Molimo prijavite se.')
        }

        const response = await fetch('/api/lab/pending-tests', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status === 401) {
            throw new Error('Sesija istekla ili niste prijavljeni.')
          }
          if (response.status === 403) {
            throw new Error('Nemate dozvolu za pristup (potrebna uloga: Laborant).')
          }
          throw new Error(errorData.error || `Greška ${response.status}`)
        }

        const data = await response.json()
        setPendingTests(data.pendingTests || [])
      } catch (err) {
        setError(err.message || 'Greška pri učitavanju proizvoda')
      } finally {
        setIsLoading(false)
      }
    }

    if (user && profile?.role === 'laborant') {
      fetchPendingTests()
    } else {
      setIsLoading(false)
    }
  }, [user, profile])

  const handleSubmitTestResult = async (e) => {
    e.preventDefault()
    if (!selectedProduct) {
      alert('Molimo izaberite proizvod')
      return
    }

    if (!testResult.materialName || !testResult.percentage) {
      alert('Ime materijala i procenat su obavezni')
      return
    }

    const percentage = parseInt(testResult.percentage)
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Procenat mora biti broj između 0 i 100')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const token = localStorage.getItem('auth_access_token')
      const response = await fetch('/api/lab/verify-material', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productModelId: selectedProduct.id,
          materialName: testResult.materialName,
          percentage: percentage,
          certificateHash: testResult.certificateHash || null,
          notes: testResult.notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška pri slanju rezultata testa')
      }

      const result = await response.json()
      setSuccessMessage(`Rezultat testa je uspešno zabeležen! Materijal: ${testResult.materialName}, Procenat: ${percentage}%`)
      
      // Resetuj formu
      setTestResult({
        materialName: '',
        percentage: '',
        certificateHash: '',
        notes: ''
      })
      setSelectedProduct(null)

      // Osveži listu proizvoda
      const refreshResponse = await fetch('/api/lab/pending-tests', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setPendingTests(refreshData.pendingTests || [])
      }
    } catch (err) {
      setError(err.message || 'Greška pri slanju rezultata testa')
    } finally {
      setIsSubmitting(false)
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

  if (profile?.role !== 'laborant') {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Nemate pristup ovoj strani. Potrebna uloga: Laborant.</div>
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
            <h2>Laboratorija - Testiranje Materijala</h2>
            <p className="designer-subtitle">
              Pregled proizvoda koji čekaju testiranje. Unesite rezultate testova materijala.
            </p>
          </div>
        </div>

        {error && (
          <div className="designer-card" style={{ backgroundColor: '#ffe6e6', border: '1px solid #d32f2f' }}>
            <strong style={{ color: '#d32f2f' }}>Greška:</strong> {error}
          </div>
        )}

        {successMessage && (
          <div className="designer-card" style={{ backgroundColor: '#e8f5e9', border: '1px solid #4caf50' }}>
            <strong style={{ color: '#2e7d32' }}>Uspešno:</strong> {successMessage}
          </div>
        )}

        <div className="designer-grid">
          <div className="designer-card">
            <h3>Proizvodi koji čekaju testiranje</h3>
            {pendingTests.length === 0 ? (
              <div className="designer-muted" style={{ padding: '1rem', textAlign: 'center' }}>
                Trenutno nema proizvoda koji čekaju testiranje.
              </div>
            ) : (
              <div className="designer-models">
                <div className="designer-model-list">
                  {pendingTests.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className={`designer-model-item lab-model-item ${selectedProduct?.id === product.id ? 'active' : ''}`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="designer-model-item-text">
                        <strong>{product.name}</strong>
                        <span className="designer-muted">{product.sku}</span>
                      </div>
                      <span className="designer-status">Testiranje</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="designer-card">
            <h3>Unos rezultata testa</h3>
            {selectedProduct ? (
              <div>
                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <strong>Izabrani proizvod:</strong> {selectedProduct.name} ({selectedProduct.sku})
                  <br />
                  <div style={{ marginTop: '8px' }}>
                    <strong>Materijali:</strong>
                    {selectedProduct.materials ? (
                      <div style={{ marginTop: '4px' }}>
                        {formatMaterialsDetailed(selectedProduct.materials).map((material, idx) => (
                          <div key={idx} style={{ marginBottom: '2px', fontSize: '14px' }}>
                            • {material}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="designer-muted" style={{ marginLeft: '8px' }}>Nema informacija</span>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmitTestResult}>
                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="materialName" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Ime materijala *
                    </label>
                    <input
                      id="materialName"
                      type="text"
                      value={testResult.materialName}
                      onChange={(e) => setTestResult({ ...testResult, materialName: e.target.value })}
                      placeholder="npr. Vuna, Viskoza, Lan"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '16px',
                        border: '1px solid #ddd',
                        borderRadius: '8px'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="percentage" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Procenat (0-100) *
                    </label>
                    <input
                      id="percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={testResult.percentage}
                      onChange={(e) => setTestResult({ ...testResult, percentage: e.target.value })}
                      placeholder="npr. 100"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '16px',
                        border: '1px solid #ddd',
                        borderRadius: '8px'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="certificateHash" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Hash sertifikata (opciono)
                    </label>
                    <input
                      id="certificateHash"
                      type="text"
                      value={testResult.certificateHash}
                      onChange={(e) => setTestResult({ ...testResult, certificateHash: e.target.value })}
                      placeholder="IPFS hash sertifikata"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '16px',
                        border: '1px solid #ddd',
                        borderRadius: '8px'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="notes" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Napomene (opciono)
                    </label>
                    <textarea
                      id="notes"
                      value={testResult.notes}
                      onChange={(e) => setTestResult({ ...testResult, notes: e.target.value })}
                      placeholder="Dodatne napomene o testiranju..."
                      rows="4"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#fff',
                      backgroundColor: isSubmitting ? '#ccc' : '#8B5CF6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isSubmitting ? 'Slanje...' : 'Pošalji rezultat testa'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="designer-muted" style={{ padding: '1rem', textAlign: 'center' }}>
                Izaberite proizvod sa leve strane da biste uneli rezultat testa.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LabDashboard
