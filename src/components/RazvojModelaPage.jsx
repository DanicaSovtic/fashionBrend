import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'
import {
  createMaterialRequestOnBlockchain,
  fundMaterialRequestOnBlockchain,
  getSewingCompletionOnBlockchain,
  designerApproveForTestingOnBlockchain,
  designerReturnForReworkOnBlockchain,
  SEWING_COMPLETION_STATUS,
  weiToEth
} from '../lib/blockchain'
import { parseMaterials } from '../utils/materialParser'

// Jednostavan katalog materijala na frontendu – koristi se samo za prikaz
// Grupisan je u 5 grupa, a sastavi su tekstualni i NE menjaju postojeći format u bazi / smart ugovorima.
const MATERIAL_GROUPS = [
  {
    code: 'POLYESTER',
    name: 'Poliester i mešavine sa poliesterom',
    items: [
      { name: 'Barbi', composition: '95% poliester / 5% elastan' },
      { name: 'Barbie crepe', composition: '95% poliester / 5% elastan' },
      { name: 'Puntoroma', composition: '60% poliester / 35% viskoza / 5% elastan' },
      { name: 'Ponte Roma', composition: '60% poliester / 35% viskoza / 5% elastan' },
      { name: 'Somot', composition: '100% poliester' },
      { name: 'Saten', composition: '100% poliester' },
      { name: 'Šifon', composition: '100% poliester' },
      { name: 'Krep', composition: '95% poliester / 5% elastan' },
      { name: 'Krep saten', composition: '95% poliester / 5% elastan' },
      { name: 'Mikado', composition: '100% poliester' },
      { name: 'Til', composition: '100% poliester' },
      { name: 'Mreža', composition: '100% poliester' },
      { name: 'Scuba', composition: '95% poliester / 5% elastan' },
      { name: 'Gabardin', composition: '65% poliester / 35% viskoza' },
      { name: 'Keper', composition: '70% poliester / 30% viskoza' },
      { name: 'Twill', composition: '70% poliester / 30% viskoza' },
      { name: 'Taft', composition: '100% poliester' },
      { name: 'Plisirana sintetika', composition: '100% poliester' }
    ]
  },
  {
    code: 'COTTON',
    name: 'Pamuk i pamučne mešavine',
    items: [
      { name: 'Pamučni keper', composition: '98% pamuk / 2% elastan' },
      { name: 'Pamučni saten', composition: '97% pamuk / 3% elastan' },
      { name: 'Sateen', composition: '97% pamuk / 3% elastan' },
      { name: 'Poplin', composition: '100% pamuk' },
      { name: 'Batist', composition: '100% pamuk' },
      { name: 'Muslin', composition: '100% pamuk' },
      { name: 'Gaz', composition: '100% pamuk' },
      { name: 'Pamučni somot', composition: '100% pamuk' },
      { name: 'Denim', composition: '98% pamuk / 2% elastan' },
      { name: 'Broderie anglaise', composition: '100% pamuk' },
      { name: 'Vez na pamuku', composition: '100% pamuk' },
      { name: 'Rebrasti pamuk', composition: '95% pamuk / 5% elastan' },
      { name: 'Single jersey pamuk', composition: '95% pamuk / 5% elastan' },
      { name: 'Cotton lycra', composition: '95% pamuk / 5% elastan' }
    ]
  },
  {
    code: 'VISCOSE',
    name: 'Viskoza / rayon i njihove mešavine',
    items: [
      { name: 'Viskozni keper', composition: '100% viskoza' },
      { name: 'Viskozni krep', composition: '100% viskoza' },
      { name: 'Viskozni saten', composition: '100% viskoza' },
      { name: 'Viskozni jersey', composition: '95% viskoza / 5% elastan' },
      { name: 'Viskoza + elastan', composition: '95% viskoza / 5% elastan' },
      { name: 'Viskoza + poliester', composition: '70% viskoza / 30% poliester' },
      { name: 'Puntoroma', composition: '60% poliester / 35% viskoza / 5% elastan' }
    ]
  },
  {
    code: 'ELASTANE',
    name: 'Elastan / likra grupe',
    items: [
      { name: 'Vodena likra', composition: '80% poliamid / 20% elastan' },
      { name: 'Mat likra', composition: '90% poliester / 10% elastan' },
      { name: 'Sjajna likra', composition: '85% poliester / 15% elastan' },
      { name: 'Mrežica sa elastanom', composition: '90% poliester / 10% elastan' },
      { name: 'Pamuk likra', composition: '95% pamuk / 5% elastan' },
      { name: 'Poliester likra', composition: '92% poliester / 8% elastan' },
      { name: 'Viskoza likra', composition: '95% viskoza / 5% elastan' },
      { name: 'Scuba sa elastanom', composition: '95% poliester / 5% elastan' }
    ]
  },
  {
    code: 'SATIN',
    name: 'Sateni',
    items: [
      { name: 'Poliesterski saten', composition: '100% poliester' },
      { name: 'Svilen saten', composition: '100% svila' },
      { name: 'Viskozni saten', composition: '100% viskoza' },
      { name: 'Pamučni saten', composition: '97% pamuk / 3% elastan' },
      { name: 'Elastični saten', composition: '95% poliester / 5% elastan' },
      { name: 'Duchess saten', composition: '100% poliester' },
      { name: 'Krep saten', composition: '95% poliester / 5% elastan' },
      { name: 'Ruski saten', composition: '100% poliester' },
      { name: 'Američki saten', composition: '95% poliester / 5% elastan' }
    ]
  }
]

const findMaterialInfo = (rawName) => {
  if (!rawName) return null
  const name = rawName.toLowerCase().trim()
  for (const group of MATERIAL_GROUPS) {
    for (const item of group.items) {
      if (item.name.toLowerCase() === name || name.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(name)) {
        return {
          groupCode: group.code,
          groupName: group.name,
          materialName: item.name,
          composition: item.composition
        }
      }
    }
  }
  return null
}

const RazvojModelaPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  
  const [collections, setCollections] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('models') // 'models' ili 'completed-products'
  const [models, setModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [requests, setRequests] = useState([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [completedProducts, setCompletedProducts] = useState([])
  const [isLoadingCompletedProducts, setIsLoadingCompletedProducts] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [blockchainConfig, setBlockchainConfig] = useState(null)
  
  // Modal state
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showReturnForReworkModal, setShowReturnForReworkModal] = useState(false)
  const [returnForReworkOrderId, setReturnForReworkOrderId] = useState(null)
  const [returnForReworkReason, setReturnForReworkReason] = useState('')
  const [selectedModel, setSelectedModel] = useState(null)
  // Zajednički podaci za ceo bundle
  const [requestForm, setRequestForm] = useState({
    deadline: '',
    supplier_id: '',
    notes: ''
  })
  // Lista materijala u jednom zahtevu (bundle)
  const [requestMaterials, setRequestMaterials] = useState([
    { material: '', color: '', quantity_kg: '', quantity_unit: 'kg', materialGroupCode: '', materialComposition: '', useCustomMaterial: false }
  ])
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

  // Učitaj blockchain config (DesignerSupplierContract adresa)
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

  // Učitaj završene proizvode
  useEffect(() => {
    if (user && profile?.role === 'modni_dizajner' && activeTab === 'completed-products') {
      fetchCompletedProducts()
    }
  }, [user, profile, activeTab, selectedCollectionId])

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

  const fetchCompletedProducts = async () => {
    try {
      setIsLoadingCompletedProducts(true)
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (selectedCollectionId) params.append('collection_id', selectedCollectionId)

      const res = await fetch(`/api/designer/material-requests/completed-products?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setCompletedProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching completed products:', error)
    } finally {
      setIsLoadingCompletedProducts(false)
    }
  }

  // Jedan red po nalogu za šivenje (grupiši po sewing_order_id ako view vraća više redova po materijalu)
  const completedProductsGrouped = useMemo(() => {
    const list = completedProducts || []
    if (list.length === 0) return []
    const byOrder = {}
    for (const p of list) {
      const id = p.sewing_order_id
      if (!id) continue
      if (!byOrder[id]) byOrder[id] = p
    }
    return Object.values(byOrder)
  }, [completedProducts])

  const handlePublishProduct = async (sewingOrderId) => {
    if (!confirm('Da li ste sigurni da želite da pustite ovaj proizvod u prodaju?')) {
      return
    }

    try {
      const token = localStorage.getItem('auth_access_token')
      const res = await fetch(`/api/designer/material-requests/completed-products/${sewingOrderId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Greška pri puštanju proizvoda u prodaju')
      }

      const data = await res.json()
      alert('Proizvod je uspešno pušten u prodaju!')
      await fetchCompletedProducts()
      await fetchModels() // Osveži modele da se vidi ažuriran development_stage
    } catch (error) {
      alert(error.message || 'Greška pri puštanju proizvoda u prodaju')
    }
  }

  const openReturnForReworkModal = (sewingOrderId) => {
    setReturnForReworkOrderId(sewingOrderId)
    setReturnForReworkReason('')
    setShowReturnForReworkModal(true)
  }

  const handleReturnForRework = async () => {
    if (!returnForReworkOrderId) return
    try {
      const token = localStorage.getItem('auth_access_token')
      const contractAddress = blockchainConfig?.designerManufacturerContract?.trim()

      if (contractAddress) {
        const completion = await getSewingCompletionOnBlockchain(contractAddress, returnForReworkOrderId)
        if (completion && completion.status === SEWING_COMPLETION_STATUS.PendingDesignerReview) {
          await designerReturnForReworkOnBlockchain(
            contractAddress,
            returnForReworkOrderId,
            returnForReworkReason || ''
          )
        }
      }

      const res = await fetch(`/api/designer/material-requests/completed-products/${returnForReworkOrderId}/return-for-rework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: returnForReworkReason || undefined })
      })
      const text = await res.text()
      if (!res.ok) {
        let errMsg = 'Greška pri vraćanju na doradu'
        try {
          if (text) {
            const err = JSON.parse(text)
            errMsg = err.error || err.message || errMsg
          }
        } catch (_) {
          if (text) errMsg = text.slice(0, 200)
        }
        throw new Error(errMsg)
      }
      setShowReturnForReworkModal(false)
      setReturnForReworkOrderId(null)
      setReturnForReworkReason('')
      alert('Proizvod je vraćen na doradu. Proizvođač će ponovo videti nalog za šivenje i razlog.')
      await fetchCompletedProducts()
      await fetchModels()
    } catch (error) {
      alert(error.message || 'Greška pri vraćanju na doradu')
    }
  }

  const handleApproveForTesting = async (sewingOrderId) => {
    const contractAddress = blockchainConfig?.designerManufacturerContract?.trim()
    let completion = null
    if (contractAddress) {
      completion = await getSewingCompletionOnBlockchain(contractAddress, sewingOrderId).catch(() => null)
    }
    const amountEthMsg = (completion && completion.status === SEWING_COMPLETION_STATUS.PendingDesignerReview)
      ? `\n\nPri potvrdi u MetaMask-u potrebno je poslati ${weiToEth(completion.totalAmountWei)} ETH (iznos za uslugu šivenja).`
      : ''
    if (!confirm(`Potvrdite da ste zadovoljni proizvodom i da ga šaljete na testiranje (laborant i tester kvaliteta)?${amountEthMsg}`)) return

    try {
      const token = localStorage.getItem('auth_access_token')

      if (contractAddress && completion && completion.status === SEWING_COMPLETION_STATUS.PendingDesignerReview) {
        await designerApproveForTestingOnBlockchain(contractAddress, sewingOrderId, completion.totalAmountWei)
      }

      const res = await fetch(`/api/designer/material-requests/completed-products/${sewingOrderId}/approve-for-testing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const text = await res.text()
      if (!res.ok) {
        let errMsg = 'Greška'
        try {
          const err = text ? JSON.parse(text) : {}
          errMsg = err.error || err.message || errMsg
          if (err.details) errMsg += ': ' + err.details
        } catch (_) {
          if (text) errMsg = text.slice(0, 200)
        }
        throw new Error(errMsg)
      }
      try {
        if (text) JSON.parse(text)
      } catch (_) {
        // odgovor nije JSON, ali status je ok – smatramo uspehom
      }
      alert('Proizvod je pušten na testiranje. Kada ga laborant i tester kvaliteta odobre, moći ćete da ga pustite u prodaju.')
      await fetchCompletedProducts()
      await fetchModels()
    } catch (error) {
      alert(error.message || 'Greška')
    }
  }

  const handleRequestMaterial = (model) => {
    setSelectedModel(model)
    // Inicijalno popuni listu materijala na osnovu tehničkih podataka modela,
    // ali samo sa imenom materijala (bez % i brojeva)
    if (model?.materials) {
      const parsed = parseMaterials(String(model.materials))
      if (parsed.length > 0) {
        setRequestMaterials(
          parsed.map((m) => {
            const rawName = m.name || ''
            const info = findMaterialInfo(rawName)
            const normalizedRaw = rawName.toLowerCase().trim()

            const exactCatalogItem = info
              ? MATERIAL_GROUPS.find((g) => g.code === info.groupCode)?.items?.find(
                  (it) => it.name.toLowerCase() === normalizedRaw
                ) || null
              : null

            return {
              material: rawName, // ostavljamo originalni naziv iz skice (ne menjamo ga ako nije 1:1)
              color: '',
              quantity_kg: '',
              quantity_unit: 'kg',
              materialGroupCode: info?.groupCode || '',
              materialComposition: exactCatalogItem?.composition || '',
              useCustomMaterial: exactCatalogItem ? false : true
            }
          })
        )
      } else {
        setRequestMaterials([{ material: '', color: '', quantity_kg: '', quantity_unit: 'kg', materialGroupCode: '', materialComposition: '', useCustomMaterial: false }])
      }
    } else {
      setRequestMaterials([{ material: '', color: '', quantity_kg: '', quantity_unit: 'kg', materialGroupCode: '', materialComposition: '', useCustomMaterial: false }])
    }
    setRequestForm({
      deadline: '',
      supplier_id: '',
      notes: ''
    })
    setShowRequestModal(true)
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    
    const filledMaterials = requestMaterials
      .map((m) => ({
        material: m.material.trim(),
        color: m.color.trim(),
        quantity_kg: m.quantity_kg,
        quantity_unit: m.quantity_unit || 'kg'
      }))
      .filter((m) => m.material || m.color || m.quantity_kg)

    if (!requestForm.supplier_id || filledMaterials.length === 0) {
      alert('Dobavljač i bar jedan red sa materijalom/bojom/količinom su obavezni.')
      return
    }

    for (const m of filledMaterials) {
      if (!m.material || !m.color || !m.quantity_kg) {
        alert('Za svaki materijal morate uneti naziv, boju i količinu.')
        return
      }
      const qty = parseFloat(m.quantity_kg)
      if (Number.isNaN(qty) || qty <= 0) {
        alert('Količina mora biti pozitivan broj.')
        return
      }
    }

    if (!blockchainConfig?.designerSupplierContract) {
      alert('Adresa DesignerSupplierContract nije podešena na backendu. Proveri DESIGNER_SUPPLIER_CONTRACT u .env fajlu.')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('auth_access_token')
      // 1) Backend bundle – jedan model, više materijala
      const bundleRes = await fetch('/api/designer/material-requests/bundle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_model_id: selectedModel?.id || null,
          supplier_id: requestForm.supplier_id,
          deadline: requestForm.deadline || null,
          notes: requestForm.notes || null,
          materials: filledMaterials.map((m) => ({
            material: m.material,
            color: m.color,
            // Backend trenutno računa samo preko quantity_kg.
            // Za prvu fazu broj koji korisnik unese koristimo i kao kg i kao m,
            // a dodatno šaljemo unit i quantity_m da backend može kasnije da ih koristi.
            quantity_kg: parseFloat(m.quantity_kg),
            quantity_unit: m.quantity_unit || 'kg',
            quantity_m: (m.quantity_unit || 'kg') === 'm' ? parseFloat(m.quantity_kg) : null
          }))
        })
      })

      if (!bundleRes.ok) {
        const error = await bundleRes.json().catch(() => ({}))
        throw new Error(error.error || 'Greška pri slanju zahteva (bundle)')
      }

      const bundleData = await bundleRes.json()
      const bundleId = bundleData.bundle_id
      const totalPriceWei = bundleData.total_price_wei
      const supplierWallet = bundleData.supplier_wallet

      // 2) Smart contract – kreiranje zahteva
      const contractAddress = blockchainConfig.designerSupplierContract
      const materialsForContract = (bundleData.materials || []).map((m) => ({
        materialName: m.materialName || m.material || '',
        quantityKg: m.quantity_kg
      }))

      const txCreate = await createMaterialRequestOnBlockchain(
        contractAddress,
        bundleId,
        supplierWallet,
        totalPriceWei,
        materialsForContract
      )

      // 3) Smart contract – deponovanje sredstava
      const txFund = await fundMaterialRequestOnBlockchain(
        contractAddress,
        bundleId,
        totalPriceWei
      )

      // 4) Backend – potvrdi da je bundle finansiran (zapiši contract info)
      const confirmRes = await fetch(`/api/designer/material-requests/bundle/${bundleId}/confirm-funded`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contract_address: contractAddress,
          request_id_hex: txCreate.requestIdHex,
          tx_hash_fund: txFund.txHash
        })
      })

      if (!confirmRes.ok) {
        const error = await confirmRes.json().catch(() => ({}))
        console.error('[RazvojModelaPage] Greška pri confirm-funded:', error)
        throw new Error(error.error || 'Greška pri snimanju blockchain transakcije u bazu')
      }

      alert('Zahtev je uspešno poslat i zabeležen na blockchainu!')
      setShowRequestModal(false)
      setSelectedModel(null)
      setRequestMaterials([
        { material: '', color: '', quantity_kg: '', quantity_unit: 'kg', materialGroupCode: '', materialComposition: '', useCustomMaterial: false }
      ])
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
            {activeTab === 'models' && (
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
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="designer-card">
          <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('models')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'models' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeTab === 'models' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeTab === 'models' ? '600' : '400'
              }}
            >
              Moji modeli
            </button>
            <button
              onClick={() => setActiveTab('completed-products')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'completed-products' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeTab === 'completed-products' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeTab === 'completed-products' ? '600' : '400'
              }}
            >
              Pristigli proizvodi od proizvođača
            </button>
          </div>

          {/* TAB: Moji modeli */}
          {activeTab === 'models' && (
            <>
              {/* Tabela modela */}
              <div>
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
                           model.development_stage === 'development' ? 'Razvoj' :
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
              <div style={{ marginTop: '24px' }}>
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
                        {req.material} / {req.color}{' '}
                        {req.quantity_kg != null && (
                          <>/ {req.quantity_kg} {req.quantity_unit || 'kg'}</>
                        )}
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
            </>
          )}

          {/* TAB: Pristigli proizvodi od proizvođača */}
          {activeTab === 'completed-products' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>Pristigli proizvodi od proizvođača</h3>
              {isLoadingCompletedProducts ? (
                <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                  Učitavanje...
                </div>
              ) : completedProducts.length === 0 ? (
                <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                  Nema pristiglih proizvoda od proizvođača
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Model / SKU</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Kolekcija</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Faza razvoja</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Status materijala</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Količina (kom)</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Završeno</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Dokaz od proizvođača</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Akcija</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedProductsGrouped.map((product) => {
                        const stage = product.development_stage || 'development'
                        const stageLabel = stage === 'idea' ? 'Ideja' : stage === 'development' ? 'Razvoj' : stage === 'testing' ? 'Testiranje' : stage === 'approved' ? 'Odobreno' : stage
                        const stageColor = stage === 'idea' ? '#9ca3af' : stage === 'development' ? '#3b82f6' : stage === 'testing' ? '#f59e0b' : '#10b981'
                        return (
                        <tr key={product.sewing_order_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '12px' }}>
                            <div>
                              <strong>{product.model_name || product.product_model_name}</strong>
                              <br />
                              <span className="designer-muted" style={{ fontSize: '0.85rem' }}>
                                {product.model_sku || product.product_model_sku || 'Nema SKU'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {product.collection_name || '-'}
                            {product.collection_season && (
                              <span className="designer-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                                {product.collection_season}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className="designer-status-chip" style={{ backgroundColor: `${stageColor}20`, color: stageColor }}>
                              {stageLabel}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                padding: '4px 12px',
                                borderRadius: '999px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                backgroundColor: '#10b98120',
                                color: '#10b981'
                              }}
                            >
                              Potvrđen
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {product.quantity_pieces} kom
                          </td>
                          <td style={{ padding: '12px' }}>
                            {product.completed_at ? formatDate(product.completed_at) : '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {product.proof_document_url ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                {/\.(jpe?g|png|gif|webp)$/i.test(product.proof_document_url) ? (
                                  <a href={product.proof_document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                    <img
                                      src={product.proof_document_url}
                                      alt="Dokaz"
                                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }}
                                    />
                                  </a>
                                ) : null}
                                <a href={product.proof_document_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-olive-dark)' }}>
                                  {/\.(jpe?g|png|gif|webp)$/i.test(product.proof_document_url) ? 'Pogledaj' : 'Otvori dokaz'}
                                </a>
                              </div>
                            ) : (
                              <span className="designer-muted" style={{ fontSize: '0.85rem' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {product.product_id && stage === 'approved' ? (
                              <span className="designer-muted" style={{ fontSize: '0.85rem' }}>
                                U prodaji
                              </span>
                            ) : stage === 'approved' ? (
                              <button
                                onClick={() => handlePublishProduct(product.sewing_order_id)}
                                className="designer-primary-button"
                                style={{ fontSize: '0.85rem', padding: '6px 16px' }}
                              >
                                Pusti u prodaju
                              </button>
                            ) : stage === 'testing' ? (
                              <span className="designer-muted" style={{ fontSize: '0.85rem' }}>U testiranju</span>
                            ) : (stage === 'development' || stage === 'idea') ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => openReturnForReworkModal(product.sewing_order_id)}
                                  style={{
                                    fontSize: '0.85rem',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #ef4444',
                                    background: '#ef4444',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                  }}
                                >
                                  Vrati na doradu
                                </button>
                                <button
                                  onClick={() => handleApproveForTesting(product.sewing_order_id)}
                                  style={{
                                    fontSize: '0.85rem',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #10b981',
                                    background: '#10b981',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                  }}
                                >
                                  Pusti na testiranje
                                </button>
                              </div>
                            ) : (
                              <span className="designer-muted" style={{ fontSize: '0.85rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}
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
            {selectedModel && (
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    color: '#6b7280'
                  }}
                >
                  {selectedModel.media && selectedModel.media.length > 0 ? (
                    <img
                      src={
                        selectedModel.media.find((m) => m.is_primary)?.image_url ||
                        selectedModel.media[0].image_url
                      }
                      alt={selectedModel.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    'Skica / foto'
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        color: '#4b5563',
                        marginBottom: '4px'
                      }}
                    >
                      Paleta boja iz skice:
                    </span>
                    {selectedModel.color_palette ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedModel.color_palette
                          .split(',')
                          .map((tone) => tone.trim())
                          .filter(Boolean)
                          .map((tone, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                backgroundColor: '#e5e7eb',
                                fontSize: '0.8rem',
                                color: '#374151'
                              }}
                            >
                              {tone}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="designer-muted" style={{ fontSize: '0.85rem' }}>
                        Nema definisane palete za ovaj model.
                      </span>
                    )}
                  </div>
                  {selectedModel.materials && (
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          color: '#4b5563',
                          marginBottom: '2px'
                        }}
                      >
                        Materijali iz skice:
                      </span>
                      <span className="designer-muted" style={{ fontSize: '0.85rem' }}>
                        {selectedModel.materials}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <form onSubmit={handleSubmitRequest}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Dinamička lista materijala u jednom zahtevu (bundle) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Materijali u ovom zahtevu *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {requestMaterials.map((row, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 2.2fr auto',
                              gap: '8px',
                              alignItems: 'center'
                            }}
                          >
                            <select
                              value={row.materialGroupCode || ''}
                              onChange={(e) => {
                                const groupCode = e.target.value
                                const next = [...requestMaterials]
                                next[idx] = {
                                  ...next[idx],
                                  materialGroupCode: groupCode,
                                  // resetujemo izbor materijala kad se promeni grupa
                                  useCustomMaterial: false,
                                  material: '',
                                  materialComposition: ''
                                }
                                setRequestMaterials(next)
                              }}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                              <option value="">Izaberi grupu...</option>
                              {MATERIAL_GROUPS.map((group) => (
                                <option key={group.code} value={group.code}>
                                  {group.name}
                                </option>
                              ))}
                            </select>

                            <select
                              value={row.useCustomMaterial ? '__custom__' : row.material}
                              onChange={(e) => {
                                const chosenName = e.target.value
                                const next = [...requestMaterials]

                                if (chosenName === '__custom__') {
                                  next[idx] = {
                                    ...next[idx],
                                    useCustomMaterial: true,
                                    material: '',
                                    materialComposition: ''
                                  }
                                  setRequestMaterials(next)
                                  return
                                }

                                const group = MATERIAL_GROUPS.find((g) => g.code === row.materialGroupCode)
                                const chosen = group?.items?.find((it) => it.name === chosenName)
                                next[idx] = {
                                  ...next[idx],
                                  useCustomMaterial: false,
                                  material: chosenName,
                                  materialComposition: chosen?.composition || ''
                                }
                                setRequestMaterials(next)
                              }}
                              disabled={!row.materialGroupCode}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                              <option value="">{row.materialGroupCode ? 'Izaberi materijal...' : 'Najpre izaberi grupu'}</option>
                              {(MATERIAL_GROUPS.find((g) => g.code === row.materialGroupCode)?.items || []).map((it) => (
                                <option key={it.name} value={it.name}>
                                  {it.name} ({it.composition})
                                </option>
                              ))}
                              <option value="__custom__">Upiši ručno</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                if (requestMaterials.length === 1) return
                                setRequestMaterials(requestMaterials.filter((_, i) => i !== idx))
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: requestMaterials.length === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '1.2rem',
                                padding: 0
                              }}
                              disabled={requestMaterials.length === 1}
                              title="Ukloni red"
                            >
                              ×
                            </button>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr',
                              gap: '8px',
                              alignItems: 'center'
                            }}
                          >
                            <input
                              type="text"
                              value={row.color}
                              onChange={(e) => {
                                const next = [...requestMaterials]
                                next[idx] = { ...next[idx], color: e.target.value }
                                setRequestMaterials(next)
                              }}
                              placeholder="Boja (npr. crna)"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={row.quantity_kg}
                              onChange={(e) => {
                                const next = [...requestMaterials]
                                next[idx] = { ...next[idx], quantity_kg: e.target.value }
                                setRequestMaterials(next)
                              }}
                              placeholder={row.quantity_unit === 'm' ? 'm' : 'kg'}
                              style={{ width: '100%', minWidth: '90px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                            <select
                              value={row.quantity_unit || 'kg'}
                              onChange={(e) => {
                                const next = [...requestMaterials]
                                next[idx] = { ...next[idx], quantity_unit: e.target.value }
                                setRequestMaterials(next)
                              }}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                            >
                              <option value="kg">kg</option>
                              <option value="m">m</option>
                            </select>
                          </div>
                        </div>
                        {row.useCustomMaterial && (
                          <div style={{ paddingLeft: '4px' }}>
                            <input
                              type="text"
                              value={row.material}
                              onChange={(e) => {
                                const next = [...requestMaterials]
                                next[idx] = { ...next[idx], material: e.target.value }
                                setRequestMaterials(next)
                              }}
                              placeholder="Upiši tačan naziv materijala (npr. Pamuk)"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                            />
                          </div>
                        )}
                        {!row.useCustomMaterial && row.materialComposition && (
                          (() => {
                            return (
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#4b5563',
                                  paddingLeft: '4px'
                                }}
                              >
                                <div style={{ fontWeight: 500 }}>
                                  {(MATERIAL_GROUPS.find((g) => g.code === row.materialGroupCode)?.name) || ''}
                                </div>
                                <div className="designer-muted">
                                  {row.material} — {row.materialComposition}
                                </div>
                              </div>
                            )
                          })()
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setRequestMaterials([
                          ...requestMaterials,
                          {
                            material: '',
                            color: '',
                            quantity_kg: '',
                            quantity_unit: 'kg',
                            materialGroupCode: '',
                            materialComposition: '',
                            useCustomMaterial: false
                          }
                        ])
                      }
                      style={{
                        marginTop: '4px',
                        alignSelf: 'flex-start',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px dashed #ccc',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      + Dodaj još materijala
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Rok za isporuku
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
                    Dobavljač *
                  </label>
                  <select
                    value={requestForm.supplier_id}
                    onChange={(e) => setRequestForm({ ...requestForm, supplier_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  >
                    <option value="">Izaberi dobavljača</option>
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

      {/* Modal za razlog vraćanja na doradu */}
      {showReturnForReworkModal && (
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
          onClick={() => setShowReturnForReworkModal(false)}
        >
          <div
            className="designer-card"
            style={{ maxWidth: '480px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '8px' }}>Vrati na doradu</h3>
            <p className="designer-muted" style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
              Nalog za šivenje će se ponovo otvoriti kod proizvođača. Unesite razlog (opciono, ali preporučeno):
            </p>
            <textarea
              value={returnForReworkReason}
              onChange={(e) => setReturnForReworkReason(e.target.value)}
              placeholder="npr. Krivi rez, potrebna ispravka šava na leđima..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowReturnForReworkModal(false); setReturnForReworkOrderId(null); setReturnForReworkReason('') }}
                className="designer-secondary-button"
              >
                Otkaži
              </button>
              <button
                type="button"
                onClick={handleReturnForRework}
                className="designer-primary-button"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                Vrati na doradu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RazvojModelaPage
