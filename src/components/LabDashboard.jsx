import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'
import { formatMaterialsForDisplay, formatMaterialsDetailed, parseMaterials } from '../utils/materialParser'

const TEST_METHODS_BY_ORG = {
  ISO: [
    {
      id: 'material-composition',
      test: 'Provera sastava materijala',
      method: 'ISO 1833',
      description: 'Kvantitativna analiza vlaknastog sastava laboratorijskim postupcima razdvajanja i merenja.',
      procedure: 'Uzorak se priprema i hemijski/mehanicki obradi prema proceduri kako bi se odredio procenat vlakana.'
    },
    {
      id: 'abrasion-resistance',
      test: 'Otpornost na habanje (Martindale)',
      method: 'ISO 12947',
      description: 'Martindale metoda za ispitivanje otpornosti tkanine na habanje.',
      procedure: 'Uzorak se izlaze kontrolisanom trljanju pod definisanim pritiskom, a rezultat je broj ciklusa do ostecenja.'
    },
    {
      id: 'pilling-resistance',
      test: 'Otpornost na piling',
      method: 'ISO 12945',
      description: 'Procena pojave kuglica, paperja i matiranja pri simuliranom nosenju.',
      procedure: 'Uzorak prolazi kroz kontrolisano trenje/tumbanje, zatim se vizuelno ocenjuje stepen pilinga.'
    },
    {
      id: 'colorfastness-wash',
      test: 'Postojanost boje pri pranju',
      method: 'ISO 105-C06',
      description: 'Ispitivanje otpornosti boje na kucno i komercijalno pranje.',
      procedure: 'Uzorak se pere u kontrolisanim uslovima i ocenjuje se promena boje i prenos boje na pratecu tkaninu.'
    },
    {
      id: 'shrinkage-wash',
      test: 'Skupljanje pri pranju',
      method: 'ISO 5077',
      description: 'Odredjivanje promene dimenzija nakon pranja i susenja.',
      procedure: 'Pre i posle definisanog ciklusa pranja/susenja mere se duzina i sirina uzorka i racuna procenat promene.'
    },
    {
      id: 'seam-strength',
      test: 'Cvrstoca savova',
      method: 'ISO 13935',
      description: 'Odredjivanje maksimalne sile koju sav moze da izdrzi pre pucanja.',
      procedure: 'Uzorak sa savom se opterecuje na zateznoj masini do pucanja sava ili razdvajanja materijala.'
    },
    {
      id: 'tear-resistance',
      test: 'Otpornost na kidanje materijala',
      method: 'ISO 13937',
      description: 'Serija metoda za merenje sile potrebne za nastavak kidanja.',
      procedure: 'Uzorak sa pocetnim prorezom se opterecuje definisanom metodom (npr. trouser/tongue) i meri sila kidanja.'
    }
  ],
  ASTM: [
    {
      id: 'abrasion-resistance',
      test: 'Otpornost na habanje (Martindale)',
      method: 'ASTM D4966',
      description: 'Martindale ispitivanje otpornosti materijala na habanje.',
      procedure: 'Uzorak se izlaze kontrolisanom trljanju i prati broj ciklusa do vidljivog ostecenja ili znacajnog gubitka mase.'
    },
    {
      id: 'pilling-resistance',
      test: 'Otpornost na piling',
      method: 'ASTM D4970',
      description: 'Procena sklonosti materijala ka stvaranju kuglica na povrsini.',
      procedure: 'Uzorak se ispituje kroz kontrolisano mehanicko delovanje, zatim se vrsi vizuelna ocena stepena pilinga.'
    },
    {
      id: 'seam-strength',
      test: 'Cvrstoca savova',
      method: 'ASTM D1683',
      description: 'Merenje otpornosti sava na razdvajanje pod opterecenjem.',
      procedure: 'Uzorak sa savom se opterecuje na zateznoj masini dok ne dodje do pucanja ili razmicanja sava.'
    },
    {
      id: 'tear-resistance',
      test: 'Otpornost na kidanje materijala',
      method: 'ASTM D1424 / D2261 / D5587',
      description: 'Odredjivanje sile potrebne da se kidanje nastavi kroz materijal.',
      procedure: 'Koriste se odgovarajuce ASTM metode i geometrije uzorka za merenje sile kidanja.'
    }
  ],
  AATCC: [
    {
      id: 'material-composition-qualitative',
      test: 'Provera sastava materijala (kvalitativno)',
      method: 'AATCC TM20',
      description: 'Kvalitativna identifikacija vrsta vlakana u tekstilu.',
      procedure: 'Uzorak se analizira prema AATCC smernicama za identifikaciju prisutnih vlakana.'
    },
    {
      id: 'material-composition-quantitative',
      test: 'Provera sastava materijala (kvantitativno)',
      method: 'AATCC TM20A',
      description: 'Kvantitativna procena udelа vlakana u mesavinama.',
      procedure: 'Primenjuju se laboratorijske procedure za izdvajanje i merenje vlakana radi procentualne raspodele.'
    },
    {
      id: 'colorfastness-wash',
      test: 'Postojanost boje pri pranju',
      method: 'AATCC TM61',
      description: 'Ubrzani laboratorijski test za procenu colorfastness to laundering.',
      procedure: 'Uzorak se pere pod kontrolisanim uslovima i ocenjuje se promena boje i moguce bojenje pratece tkanine.'
    },
    {
      id: 'shrinkage-wash',
      test: 'Skupljanje pri pranju',
      method: 'AATCC TM135',
      description: 'Odredjivanje dimenzione promene tkanine nakon domaceg pranja.',
      procedure: 'Mere se dimenzije pre i posle pranja/susenja i iskazuje procenat skupljanja ili sirenja.'
    }
  ]
}

const MATERIAL_COMPOSITION_TEST_IDS = [
  'material-composition',
  'material-composition-qualitative',
  'material-composition-quantitative'
]

const MINI_TEST_RULES = {
  'abrasion-resistance': {
    metricLabel: 'Broj ciklusa do ostecenja',
    unit: 'ciklusa',
    thresholdLabel: 'Minimalno 20000 ciklusa',
    evaluate: (value) => value >= 20000
  },
  'pilling-resistance': {
    metricLabel: 'Ocena pilinga (1-5)',
    unit: 'ocena',
    thresholdLabel: 'Minimalna ocena 4.0',
    evaluate: (value) => value >= 4
  },
  'colorfastness-wash': {
    metricLabel: 'Ocena postojanosti boje (1-5)',
    unit: 'ocena',
    thresholdLabel: 'Minimalna ocena 4.0',
    evaluate: (value) => value >= 4
  },
  'shrinkage-wash': {
    metricLabel: 'Promena dimenzija (%)',
    unit: '%',
    thresholdLabel: 'Dozvoljeno odstupanje +/- 3.0%',
    evaluate: (value) => Math.abs(value) <= 3
  },
  'seam-strength': {
    metricLabel: 'Maksimalna sila do pucanja',
    unit: 'N',
    thresholdLabel: 'Minimalno 180 N',
    evaluate: (value) => value >= 180
  },
  'tear-resistance': {
    metricLabel: 'Sila kidanja',
    unit: 'N',
    thresholdLabel: 'Minimalno 40 N',
    evaluate: (value) => value >= 40
  }
}

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
  const [selectedOrganization, setSelectedOrganization] = useState('ISO')
  const [selectedTestId, setSelectedTestId] = useState('material-composition')
  const [miniTestValue, setMiniTestValue] = useState('')

  useEffect(() => {
    const firstTestId = TEST_METHODS_BY_ORG[selectedOrganization]?.[0]?.id || ''
    setSelectedTestId(firstTestId)
    setMiniTestValue('')
  }, [selectedOrganization])

  useEffect(() => {
    setMiniTestValue('')
  }, [selectedTestId])

  const isMaterialCompositionTest = MATERIAL_COMPOSITION_TEST_IDS.includes(selectedTestId)

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

    if (!isMaterialCompositionTest) {
      const rule = MINI_TEST_RULES[selectedTestId]
      const parsedValue = parseFloat(miniTestValue)
      if (!rule) {
        alert('Za izabrani test trenutno nema mini logike.')
        return
      }
      if (isNaN(parsedValue)) {
        alert('Unesite merenu vrednost testa.')
        return
      }
      const passed = rule.evaluate(parsedValue)
      setSuccessMessage(
        `Interna procena testa je zabelezena. Rezultat: ${passed ? 'PROSAO' : 'NIJE PROSAO'} (${parsedValue} ${rule.unit}).`
      )
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
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f9f6ff', border: '1px solid #e2d6ff', borderRadius: '8px' }}>
              <label
                htmlFor="standardOrganization"
                style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}
              >
                Organizacija standarda i metoda
              </label>
              <select
                id="standardOrganization"
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '15px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  backgroundColor: '#fff'
                }}
              >
                <option value="ISO">ISO (International Organization for Standardization)</option>
                <option value="ASTM">ASTM (American Society for Testing and Materials)</option>
                <option value="AATCC">AATCC (American Association of Textile Chemists and Colorists)</option>
              </select>

              <div>
                <strong style={{ display: 'block', marginBottom: '8px' }}>
                  Vrste testova za izabrani proizvod {selectedOrganization}
                </strong>
                <div className="designer-muted" style={{ marginBottom: '10px', fontSize: '13px' }}>
                  Kliknite na test iz liste da izaberete vrstu testa za proizvod.
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {TEST_METHODS_BY_ORG[selectedOrganization].map((item) => (
                    <div
                      key={`${selectedOrganization}-${item.id}`}
                      onClick={() => setSelectedTestId(item.id)}
                      style={{
                        padding: '10px',
                        border: selectedTestId === item.id ? '2px solid #8B5CF6' : '1px solid #ebe5ff',
                        borderRadius: '8px',
                        backgroundColor: selectedTestId === item.id ? '#f5f3ff' : '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>{item.test}</div>
                      <div className="designer-muted" style={{ fontSize: '14px' }}>{item.method}</div>
                    </div>
                  ))}
                </div>
                {selectedOrganization === 'ASTM' && (
                  <div
                    className="designer-muted"
                    style={{
                      marginTop: '10px',
                      fontSize: '13px',
                      padding: '8px 10px',
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      border: '1px dashed #d1d5db'
                    }}
                  >
                    Napomena: raniji ASTM standardi za identifikaciju i kvantitativnu analizu sastava
                    materijala (D276 i D629) su oznaceni kao withdrawn i nisu prikazani kao primarne
                    aktivne metode.
                  </div>
                )}
              </div>
            </div>
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
                  {isMaterialCompositionTest ? (
                    <>
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
                    </>
                  ) : (
                    <div style={{ marginBottom: '16px' }}>
                      <label htmlFor="miniTestValue" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        {MINI_TEST_RULES[selectedTestId]?.metricLabel || 'Merena vrednost'} *
                      </label>
                      <input
                        id="miniTestValue"
                        type="number"
                        step="0.1"
                        value={miniTestValue}
                        onChange={(e) => setMiniTestValue(e.target.value)}
                        placeholder={`Unesite vrednost (${MINI_TEST_RULES[selectedTestId]?.unit || ''})`}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          border: '1px solid #ddd',
                          borderRadius: '8px'
                        }}
                      />
                      <div className="designer-muted" style={{ marginTop: '6px', fontSize: '13px' }}>
                        {MINI_TEST_RULES[selectedTestId]?.thresholdLabel}
                      </div>
                    </div>
                  )}

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
                    {isSubmitting
                      ? 'Slanje...'
                      : isMaterialCompositionTest
                        ? 'Pošalji rezultat testa'
                        : 'Sačuvaj internu procenu testa'}
                  </button>
                </form>
                {selectedTestId && (
                  <div style={{ marginTop: '20px', padding: '14px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                    <strong style={{ display: 'block', marginBottom: '10px' }}>Detalji izabranog testa</strong>
                    {TEST_METHODS_BY_ORG[selectedOrganization]
                      .filter((item) => item.id === selectedTestId)
                      .map((item) => (
                        <div key={`details-${selectedOrganization}-${item.id}`}>
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Naziv testa:</strong> {item.test}
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Standard/metoda:</strong> {item.method}
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Opis:</strong> {item.description}
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Nacin ispitivanja:</strong> {item.procedure}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
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
