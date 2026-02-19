import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import './Collection.css'

const NewCollections = () => {
  const [collections, setCollections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/new-collections')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Greška prilikom učitavanja kolekcija.')
        }

        const data = await response.json()
        setCollections(data || [])
      } catch (err) {
        console.error('[NewCollections Component] Error:', err)
        setError(err.message || 'Došlo je do greške.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCollections()
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
    navigate(`/new-collections/${collectionId}`)
  }

  if (isLoading) {
    return (
      <div className="collection-page">
        <Navbar activePath="/new-collections" />
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
        <Navbar activePath="/new-collections" />
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
      <Navbar activePath="/new-collections" />

      {/* Hero sekcija */}
      <section className="collection-hero">
        <div className="collection-hero-overlay"></div>
        <div className="collection-hero-content">
          <h1 className="collection-hero-title">Nove kolekcije</h1>
          <p className="collection-hero-subtitle">Odobreni proizvodi iz aktivnih kolekcija</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="collection-content">
        <div className="collection-container">
          {/* Intro tekst */}
          <div className="collection-intro">
            <h2 className="collection-intro-title">Aktivne kolekcije sa odobrenim proizvodima</h2>
            <p className="collection-intro-text">
              Pregledajte naše aktivne kolekcije koje sadrže odobrene proizvode spremne za kupovinu.
              Kliknite na kolekciju da vidite sve dostupne proizvode.
            </p>
          </div>

          {/* Kolekcije */}
          {collections.length > 0 ? (
            <div className="collections-grid">
              {collections.map((collection) => (
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
                      {/* Sakriveno od krajnjih korisnika */}
                      {false && collection.approved_count !== undefined && (
                        <span className="collection-items" style={{ color: '#10b981', fontWeight: '600' }}>
                          {collection.approved_count} odobrenih proizvoda
                        </span>
                      )}
                    </div>
                    <h3 className="collection-card-title">{collection.name}</h3>
                    <p className="collection-card-description">{collection.description || ''}</p>
                    {collection.outfit_style && (
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#666', 
                        marginTop: '0.5rem'
                      }}>
                        Stil: {collection.outfit_style}
                      </div>
                    )}
                    {collection.event_date && (
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#666', 
                        marginTop: '0.5rem'
                      }}>
                        Datum događaja: {new Date(collection.event_date).toLocaleDateString('sr-RS')}
                      </div>
                    )}
                    <button 
                      className="collection-card-button"
                      onClick={() => handleCollectionClick(collection.id)}
                    >
                      Pogledaj Proizvode
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>
                Trenutno nema aktivnih kolekcija sa odobrenim proizvodima.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NewCollections
