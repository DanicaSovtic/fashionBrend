import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import './Collection.css'

const Collection = () => {
  const [outfitCollections, setOutfitCollections] = useState([])
  const [blogCollections, setBlogCollections] = useState([])
  const [collectionStats, setCollectionStats] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchCollections = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const outfitUrl = '/api/collections?type=outfit'
      const blogUrl = '/api/collections?type=blog'

      const [outfitResponse, blogResponse] = await Promise.all([
        fetch(outfitUrl).catch(err => {
          console.error('[Collection Component] Fetch error for outfit:', err)
          throw err
        }),
        fetch(blogUrl).catch(err => {
          console.error('[Collection Component] Fetch error for blog:', err)
          throw err
        })
      ])

      // Proveri greške sa detaljnim porukama
      if (!outfitResponse.ok) {
        const errorData = await outfitResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Greška prilikom učitavanja outfit kolekcija (${outfitResponse.status})`)
      }

      if (!blogResponse.ok) {
        const errorData = await blogResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Greška prilikom učitavanja blog kolekcija (${blogResponse.status})`)
      }

      const outfitData = await outfitResponse.json()
      const blogData = await blogResponse.json()

      setOutfitCollections(outfitData || [])
      setBlogCollections(blogData || [])

      // Učitaj statistiku za sve kolekcije
      const allCollections = [...(outfitData || []), ...(blogData || [])]
      const statsPromises = allCollections.map(collection =>
        fetch(`/api/collections/${collection.id}/stats`)
          .then(res => res.ok ? res.json() : { total: 0 })
          .then(stats => ({ [collection.id]: stats }))
          .catch(() => ({ [collection.id]: { total: 0 } }))
      )

      const statsResults = await Promise.all(statsPromises)
      const statsMap = Object.assign({}, ...statsResults)
      setCollectionStats(statsMap)
    } catch (err) {
      console.error('[Collection Component] Error:', err)
      setError(err.message || 'Došlo je do greške.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()

    // Slušaj promene statusa kolekcije
    const handleStatusChange = () => {
      fetchCollections()
    }

    window.addEventListener('collectionStatusChanged', handleStatusChange)

    return () => {
      window.removeEventListener('collectionStatusChanged', handleStatusChange)
    }
  }, [])

  const formatStatus = (status) => {
    const statusMap = {
      active: 'Dostupno Sada',
      planned: 'Uskoro',
      archived: 'Arhivirano'
    }
    return statusMap[status] || status
  }

  const handleCollectionClick = (collectionId) => {
    navigate(`/collection/${collectionId}`)
  }

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

  if (error) {
    return (
      <div className="collection-page">
        <Navbar activePath="/collection" />
        <div className="collection-content">
          <div className="collection-container">
            <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="collection-page">
      <Navbar activePath="/collection" />

      {/* Hero sekcija */}
      <section className="collection-hero">
        <div className="collection-hero-overlay"></div>
        <div className="collection-hero-content">
          <h1 className="collection-hero-title">Naše Kolekcije</h1>
          <p className="collection-hero-subtitle">Otkrijte bezvremensku elegantnost u svakom komadu</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="collection-content">
        <div className="collection-container">
          {/* Intro tekst */}
          <div className="collection-intro">
            <h2 className="collection-intro-title">Istražite Naše Najnovije Kolekcije</h2>
            <p className="collection-intro-text">
              Svaka kolekcija je pažljivo odabrana da vam donese najfinije komade 
              koji spajaju moderan dizajn sa bezvremenskom elegantnošću. Pregledajte 
              naše dostupne kolekcije i pronađite svoj savršen stil.
            </p>
          </div>

          {/* Outfit kolekcije */}
          {outfitCollections.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: '600' }}>
                Outfit Kolekcije
              </h2>
              <div className="collections-grid">
                {outfitCollections.map((collection) => (
                  <div key={collection.id} className="collection-card">
                    <div className="collection-card-image-wrapper">
                      <img 
                        src={collection.image_url || 'https://via.placeholder.com/400x500'} 
                        alt={collection.name}
                        className="collection-card-image"
                      />
                      <div className="collection-card-overlay">
                        <span className="collection-status">{formatStatus(collection.status)}</span>
                        {collection.outfit_style && (
                          <span className="collection-style-badge">{collection.outfit_style}</span>
                        )}
                      </div>
                    </div>
                    <div className="collection-card-content">
                      <div className="collection-card-header">
                        <span className="collection-season">{collection.season || 'N/A'}</span>
                        {collectionStats[collection.id] && (
                          <span className="collection-items">
                            {collectionStats[collection.id].total} modela
                          </span>
                        )}
                      </div>
                      <h3 className="collection-card-title">{collection.name}</h3>
                      <p className="collection-card-description">{collection.description || ''}</p>
                      {collectionStats[collection.id] && collectionStats[collection.id].total > 0 && (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#666', 
                          marginTop: '0.5rem',
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          {collectionStats[collection.id].idea > 0 && (
                            <span style={{ color: '#9ca3af' }}>Ideja: {collectionStats[collection.id].idea}</span>
                          )}
                          {collectionStats[collection.id].prototype > 0 && (
                            <span style={{ color: '#3b82f6' }}>Prototip: {collectionStats[collection.id].prototype}</span>
                          )}
                          {collectionStats[collection.id].testing > 0 && (
                            <span style={{ color: '#f59e0b' }}>Test: {collectionStats[collection.id].testing}</span>
                          )}
                          {collectionStats[collection.id].approved > 0 && (
                            <span style={{ color: '#10b981' }}>Odobreno: {collectionStats[collection.id].approved}</span>
                          )}
                        </div>
                      )}
                      <button 
                        className="collection-card-button"
                        onClick={() => handleCollectionClick(collection.id)}
                      >
                        Pogledaj Kolekciju
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blog kolekcije */}
          {blogCollections.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: '600' }}>
                Blog Kolekcije
              </h2>
              <div className="collections-grid">
                {blogCollections.map((collection) => (
                  <div key={collection.id} className="collection-card">
                    <div className="collection-card-image-wrapper">
                      <img 
                        src={collection.image_url || 'https://via.placeholder.com/400x500'} 
                        alt={collection.name}
                        className="collection-card-image"
                      />
                      <div className="collection-card-overlay">
                        <span className="collection-status">{formatStatus(collection.status)}</span>
                        {collection.event_date && (
                          <span className="collection-event-date">
                            {new Date(collection.event_date).toLocaleDateString('sr-RS')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="collection-card-content">
                      <div className="collection-card-header">
                        <span className="collection-season">{collection.season || 'N/A'}</span>
                        {collectionStats[collection.id] && (
                          <span className="collection-items">
                            {collectionStats[collection.id].total} modela
                          </span>
                        )}
                      </div>
                      <h3 className="collection-card-title">{collection.name}</h3>
                      <p className="collection-card-description">{collection.description || ''}</p>
                      {collection.event_date && (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#666', 
                          marginTop: '0.5rem'
                        }}>
                          Datum događaja: {new Date(collection.event_date).toLocaleDateString('sr-RS')}
                        </div>
                      )}
                      {collectionStats[collection.id] && collectionStats[collection.id].total > 0 && (
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#666', 
                          marginTop: '0.5rem',
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          {collectionStats[collection.id].idea > 0 && (
                            <span style={{ color: '#9ca3af' }}>Ideja: {collectionStats[collection.id].idea}</span>
                          )}
                          {collectionStats[collection.id].prototype > 0 && (
                            <span style={{ color: '#3b82f6' }}>Prototip: {collectionStats[collection.id].prototype}</span>
                          )}
                          {collectionStats[collection.id].testing > 0 && (
                            <span style={{ color: '#f59e0b' }}>Test: {collectionStats[collection.id].testing}</span>
                          )}
                          {collectionStats[collection.id].approved > 0 && (
                            <span style={{ color: '#10b981' }}>Odobreno: {collectionStats[collection.id].approved}</span>
                          )}
                        </div>
                      )}
                      <button 
                        className="collection-card-button"
                        onClick={() => handleCollectionClick(collection.id)}
                      >
                        Pogledaj Kolekciju
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Collection

