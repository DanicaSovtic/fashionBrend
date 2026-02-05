import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './DesignerCollectionsPage.css'

const COLLECTIONS = [
  {
    id: 'col-ss26',
    name: 'Aurora SS26',
    season: 'SS26',
    period: 'mart - jun 2026',
    modelsCount: 12,
    status: 'Aktivna',
    phaseSummary: {
      idea: 3,
      prototype: 4,
      testing: 3,
      approved: 2
    }
  },
  {
    id: 'col-f26',
    name: 'Noir Atelier FW26',
    season: 'FW26',
    period: 'avgust - novembar 2026',
    modelsCount: 8,
    status: 'Planiranje',
    phaseSummary: {
      idea: 5,
      prototype: 2,
      testing: 1,
      approved: 0
    }
  },
  {
    id: 'col-archive',
    name: 'Essenza Resort 25',
    season: 'Resort 25',
    period: 'januar - april 2025',
    modelsCount: 16,
    status: 'Arhivirana',
    phaseSummary: {
      idea: 0,
      prototype: 0,
      testing: 0,
      approved: 16
    }
  }
]

const MODELS = [
  {
    id: 'mdl-001',
    name: 'Silk Drape Dress',
    code: 'MD-SS26-014',
    stage: 'Prototip',
    collection: 'Aurora SS26',
    concept: 'Fluidna silueta inspirisana pokretom svetlosti i refleksijom na vodi.',
    inspiration: 'Skandinavska arhitektura, minimalizam, jutarnja svetlost.',
    palette: ['pearl', 'misty rose', 'soft lilac'],
    variants: ['Midi', 'Maxi', 'Sleeveless'],
    pattern: 'Asimetrično drapiranje sa skrivenim šavovima.',
    materials: ['Svila 22 momme', 'Lagana postava - viskoza', 'Metalne kopče'],
    sizeTable: 'XS-XL standard, korekcije za dužinu +2cm',
    techNotes: 'Ojačati ramena, skriveni zip na levom boku.',
    lastUpdate: '05.02.2026'
  },
  {
    id: 'mdl-002',
    name: 'Structured Linen Blazer',
    code: 'MD-SS26-021',
    stage: 'Testiranje',
    collection: 'Aurora SS26',
    concept: 'Balans između kroja i ležernog feel-a.',
    inspiration: 'Vintage tailoring, city garden.',
    palette: ['sand', 'olive', 'chalk'],
    variants: ['Cropped', 'Regular'],
    pattern: 'Dvostruko postavljen rever, ručno oblikovan.',
    materials: ['Lan 280g', 'Pamuk - podstava'],
    sizeTable: 'S-XXL, dodatne korekcije u ramenima',
    techNotes: 'Uraditi probu za dugmad i utezanje.',
    lastUpdate: '02.02.2026'
  },
  {
    id: 'mdl-003',
    name: 'Sheer Layered Top',
    code: 'MD-SS26-032',
    stage: 'Ideja',
    collection: 'Aurora SS26',
    concept: 'Slojevita transparentnost za dnevne i večernje look-ove.',
    inspiration: 'Contemporary art, layered textures.',
    palette: ['ivory', 'sky blue'],
    variants: ['Long sleeve', 'Sleeveless'],
    pattern: 'Slojevita organza sa nevidljivim šavovima.',
    materials: ['Organza', 'Mrežasti uložak'],
    sizeTable: 'XS-L',
    techNotes: 'Testirati stabilnost šavova u pranju.',
    lastUpdate: '01.02.2026'
  }
]

const APPROVALS = [
  { label: 'Materijali', status: 'U toku', owner: 'Dobavljač' },
  { label: 'Krojevi', status: 'Odobreno', owner: 'Proizvođač' },
  { label: 'Fit test', status: 'Potrebne korekcije', owner: 'QA tim' },
  { label: 'Vizuelni identitet', status: 'Odobreno', owner: 'Brand tim' }
]

const COMMENTS = [
  {
    id: 'c-01',
    author: 'Mila Petrović',
    role: 'Proizvođač',
    message: 'Predlog: ojačati šavove na ramenom delu zbog težine materijala.',
    date: '04.02.2026'
  },
  {
    id: 'c-02',
    author: 'Nikola Ilić',
    role: 'QA tim',
    message: 'Fit test pokazuje potrebu za +1cm u struku za veličinu M.',
    date: '03.02.2026'
  },
  {
    id: 'c-03',
    author: 'Ivana Marković',
    role: 'Brand tim',
    message: 'Fotografije proizvoda za webshop zahtevaju dodatnu teksturu u opisu.',
    date: '02.02.2026'
  }
]

const DesignerCollectionsPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const [selectedModelId, setSelectedModelId] = useState(MODELS[0]?.id)

  const selectedModel = useMemo(
    () => MODELS.find((model) => model.id === selectedModelId) || MODELS[0],
    [selectedModelId]
  )

  if (loading) {
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
          <div className="designer-metrics">
            <div className="designer-metric">
              <span>Aktivne kolekcije</span>
              <strong>2</strong>
            </div>
            <div className="designer-metric">
              <span>Modeli u prototipu</span>
              <strong>6</strong>
            </div>
            <div className="designer-metric">
              <span>Odobreno za proizvodnju</span>
              <strong>2</strong>
            </div>
            <div className="designer-metric">
              <span>Otvoreni komentari</span>
              <strong>4</strong>
            </div>
          </div>
        </div>

        <div className="designer-card">
          <div className="designer-section-header">
            <div>
              <h3>Aktivne i arhivirane kolekcije</h3>
              <p className="designer-muted">
                Pregled po sezoni, statusu i fazi razvoja modela.
              </p>
            </div>
            <button type="button" className="designer-primary-button">
              + Nova kolekcija
            </button>
          </div>
          <div className="designer-collections">
            {COLLECTIONS.map((collection) => (
              <div key={collection.id} className="designer-collection-card">
                <div>
                  <h4>{collection.name}</h4>
                  <p className="designer-muted">
                    {collection.season} • {collection.period}
                  </p>
                </div>
                <div className="designer-collection-meta">
                  <span>Status: {collection.status}</span>
                  <span>Modela: {collection.modelsCount}</span>
                </div>
                <div className="designer-phase-grid">
                  <div>
                    <strong>{collection.phaseSummary.idea}</strong>
                    <span>Ideja</span>
                  </div>
                  <div>
                    <strong>{collection.phaseSummary.prototype}</strong>
                    <span>Prototip</span>
                  </div>
                  <div>
                    <strong>{collection.phaseSummary.testing}</strong>
                    <span>Test</span>
                  </div>
                  <div>
                    <strong>{collection.phaseSummary.approved}</strong>
                    <span>Odobreno</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="designer-grid">
          <div className="designer-card">
            <h3>Razvoj modela</h3>
            <div className="designer-models">
              <div className="designer-model-list">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={`designer-model-item ${model.id === selectedModel?.id ? 'active' : ''}`}
                    onClick={() => setSelectedModelId(model.id)}
                  >
                    <div>
                      <strong>{model.name}</strong>
                      <span className="designer-muted">{model.code}</span>
                    </div>
                    <span className="designer-status">{model.stage}</span>
                  </button>
                ))}
              </div>
              <div className="designer-model-detail">
                <div className="designer-model-header">
                  <div>
                    <h4>{selectedModel?.name}</h4>
                    <p className="designer-muted">
                      {selectedModel?.code} • {selectedModel?.collection}
                    </p>
                  </div>
                  <span className="designer-status-chip">{selectedModel?.stage}</span>
                </div>
                <div className="designer-model-section">
                  <h5>Koncept i inspiracija</h5>
                  <p>{selectedModel?.concept}</p>
                  <p className="designer-muted">Inspiracija: {selectedModel?.inspiration}</p>
                </div>
                <div className="designer-model-section">
                  <h5>Paleta i varijante</h5>
                  <div className="designer-tags">
                    {selectedModel?.palette?.map((tone) => (
                      <span key={tone} className="designer-tag">
                        {tone}
                      </span>
                    ))}
                  </div>
                  <p className="designer-muted">Varijante: {selectedModel?.variants?.join(', ')}</p>
                </div>
                <div className="designer-model-section">
                  <h5>Tehnički podaci</h5>
                  <p>Materijali: {selectedModel?.materials?.join(', ')}</p>
                  <p>Krojevi: {selectedModel?.pattern}</p>
                  <p>Tabela veličina: {selectedModel?.sizeTable}</p>
                  <p>Napomene: {selectedModel?.techNotes}</p>
                </div>
                <div className="designer-model-footer">
                  <span>Poslednja izmena: {selectedModel?.lastUpdate}</span>
                  <button type="button" className="designer-secondary-button">
                    Sačuvaj verziju
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="designer-card">
            <h3>Saradnja i odobrenja</h3>
            <div className="designer-approvals">
              {APPROVALS.map((approval) => (
                <div key={approval.label} className="designer-approval-item">
                  <div>
                    <strong>{approval.label}</strong>
                    <span className="designer-muted">{approval.owner}</span>
                  </div>
                  <span className="designer-status">{approval.status}</span>
                </div>
              ))}
            </div>
            <div className="designer-comments">
              <h4>Komentari tima</h4>
              {COMMENTS.map((comment) => (
                <div key={comment.id} className="designer-comment">
                  <div className="designer-comment-header">
                    <strong>{comment.author}</strong>
                    <span className="designer-muted">
                      {comment.role} • {comment.date}
                    </span>
                  </div>
                  <p>{comment.message}</p>
                </div>
              ))}
              <button type="button" className="designer-secondary-button">
                Dodaj komentar
              </button>
            </div>
          </div>
        </div>

        <div className="designer-card">
          <div className="designer-section-header">
            <div>
              <h3>Pregled webshop prikaza</h3>
              <p className="designer-muted">
                Provera kako ce proizvod biti predstavljen krajnjim kupcima.
              </p>
            </div>
            <button type="button" className="designer-primary-button">
              Ažuriraj listing
            </button>
          </div>
          <div className="designer-webshop">
            <div className="designer-webshop-preview">
              <div className="designer-webshop-image">Preview foto</div>
              <div>
                <h4>{selectedModel?.name}</h4>
                <p className="designer-muted">
                  Elegantan komad sa fokusom na teksturu i fluidnost. {selectedModel?.concept}
                </p>
                <ul>
                  <li>Materijali: {selectedModel?.materials?.join(', ')}</li>
                  <li>Varijante: {selectedModel?.variants?.join(', ')}</li>
                  <li>Paleta: {selectedModel?.palette?.join(', ')}</li>
                </ul>
              </div>
            </div>
            <div className="designer-webshop-meta">
              <div>
                <span className="designer-muted">Naziv proizvoda</span>
                <strong>{selectedModel?.name}</strong>
              </div>
              <div>
                <span className="designer-muted">SKU</span>
                <strong>{selectedModel?.code}</strong>
              </div>
              <div>
                <span className="designer-muted">Istaknute karakteristike</span>
                <strong>Premium materijal, ručna obrada</strong>
              </div>
              <div>
                <span className="designer-muted">Priprema za online prodaju</span>
                <strong>U toku fotografisanje</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesignerCollectionsPage
