import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import './Collection.css'

const CollectionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [collection, setCollection] = useState(null)
  const [productModels, setProductModels] = useState([])
  const [modelsByStage, setModelsByStage] = useState({
    idea: [],
    prototype: [],
    testing: [],
    approved: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStage, setSelectedStage] = useState('all')

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/collections/${id}/products`)
        if (!response.ok) {
          throw new Error('Greška prilikom učitavanja kolekcije.')
        }

        const data = await response.json()
        setCollection(data)
        setProductModels(data.productModels || [])
        setModelsByStage(data.modelsByStage || {
          idea: [],
          prototype: [],
          testing: [],
          approved: []
        })
      } catch (err) {
        setError(err.message || 'Došlo je do greške.')
        console.error('Error fetching collection:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchCollection()
    }
  }, [id])

  const getStageLabel = (stage) => {
    const labels = {
      idea: 'Ideja',
      prototype: 'Prototip',
      testing: 'Testiranje',
      approved: 'Odobreno'
    }
    return labels[stage] || stage
  }

  const getStageColor = (stage) => {
    const colors = {
      idea: '#9ca3af',
      prototype: '#3b82f6',
      testing: '#f59e0b',
      approved: '#10b981'
    }
    return colors[stage] || '#666'
  }

  const getModelImage = (model) => {
    if (model.media && model.media.length > 0) {
      const primaryImage = model.media.find(m => m.is_primary) || model.media[0]
      return primaryImage.image_url
    }
    return 'https://via.placeholder.com/300x400'
  }

  const filteredModels = selectedStage === 'all' 
    ? productModels 
    : productModels.filter(m => m.development_stage === selectedStage)

  if (isLoading) {
    return (
      <div className="collection-page">
        <Navbar activePath="/collection" />
        <div className="collection-content">
          <div className="collection-container">
            <div style={{ textAlign: 'center', padding: '2rem' }}>Učitavanje...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="collection-page">
        <Navbar activePath="/collection" />
        <div className="collection-content">
          <div className="collection-container">
            <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
              {error || 'Kolekcija nije pronađena.'}
            </div>
            <button 
              onClick={() => navigate('/collection')}
              style={{ 
                marginTop: '1rem', 
                padding: '0.75rem 1.5rem',
                backgroundColor: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Nazad na kolekcije
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="collection-page">
      <Navbar activePath="/collection" />

      {/* Hero sekcija sa kolekcijom */}
      <section 
        className="collection-hero"
        style={{
          backgroundImage: collection.image_url 
            ? `url(${collection.image_url})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="collection-hero-overlay"></div>
        <div className="collection-hero-content">
          <h1 className="collection-hero-title">{collection.name}</h1>
          <p className="collection-hero-subtitle">{collection.description || ''}</p>
          {collection.outfit_style && (
            <span style={{ 
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              fontSize: '0.9rem'
            }}>
              {collection.outfit_style}
            </span>
          )}
          {collection.event_date && (
            <span style={{ 
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              fontSize: '0.9rem',
              marginLeft: collection.outfit_style ? '0.5rem' : '0'
            }}>
              {new Date(collection.event_date).toLocaleDateString('sr-RS')}
            </span>
          )}
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="collection-content">
        <div className="collection-container">
          <button 
            onClick={() => navigate('/collection')}
            style={{ 
              marginBottom: '2rem', 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ← Nazad na kolekcije
          </button>

          {/* Statistika kolekcije */}
          {collection && productModels.length > 0 && (
            <div style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              backgroundColor: '#f9fafb', 
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '600', color: '#333' }}>
                  {productModels.length}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                  Ukupno modela
                </div>
              </div>
              {Object.entries(modelsByStage).map(([stage, models]) => (
                <div key={stage} style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '600', 
                    color: getStageColor(stage) 
                  }}>
                    {models.length}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                    {getStageLabel(stage)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filteri po fazama */}
          {productModels.length > 0 && (
            <div style={{ 
              marginBottom: '2rem', 
              display: 'flex', 
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setSelectedStage('all')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: selectedStage === 'all' ? '#333' : '#e5e7eb',
                  color: selectedStage === 'all' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: selectedStage === 'all' ? '600' : '400'
                }}
              >
                Svi ({productModels.length})
              </button>
              {Object.entries(modelsByStage).map(([stage, models]) => (
                models.length > 0 && (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: selectedStage === stage ? getStageColor(stage) : '#e5e7eb',
                      color: selectedStage === stage ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: selectedStage === stage ? '600' : '400'
                    }}
                  >
                    {getStageLabel(stage)} ({models.length})
                  </button>
                )
              ))}
            </div>
          )}

          {/* Modeli proizvoda */}
          {filteredModels.length > 0 ? (
            <div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: '600' }}>
                Modeli u kolekciji
              </h2>
              <div className="collections-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {filteredModels.map((model) => (
                  <div 
                    key={model.id} 
                    className="collection-card" 
                    style={{ 
                      cursor: 'pointer', 
                      transition: 'transform 0.2s',
                      position: 'relative'
                    }}
                  >
                    <div className="collection-card-image-wrapper">
                      <img 
                        src={getModelImage(model)} 
                        alt={model.name}
                        className="collection-card-image"
                        style={{ height: '300px', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        backgroundColor: getStageColor(model.development_stage),
                        color: 'white',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {getStageLabel(model.development_stage)}
                      </div>
                    </div>
                    <div className="collection-card-content">
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#666', 
                        marginBottom: '0.5rem',
                        fontFamily: 'monospace'
                      }}>
                        {model.sku || 'N/A'}
                      </div>
                      <h3 className="collection-card-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                        {model.name}
                      </h3>
                      {model.concept && (
                        <p className="collection-card-description" style={{ 
                          fontSize: '0.9rem', 
                          marginBottom: '0.5rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {model.concept}
                        </p>
                      )}
                      {model.color_palette && (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#666',
                          marginTop: '0.5rem',
                          fontStyle: 'italic'
                        }}>
                          Paleta: {model.color_palette}
                        </div>
                      )}
                      {model.category && (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#999',
                          marginTop: '0.25rem'
                        }}>
                          {model.category}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : productModels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>
                Ova kolekcija trenutno nema modele proizvoda.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>
                Nema modela u izabranoj fazi razvoja.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CollectionDetail
