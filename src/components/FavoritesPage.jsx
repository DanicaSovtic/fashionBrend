import React from 'react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import Navbar from './Navbar'
import './Favorites.css'

const FavoritesPage = () => {
  const { items, removeFavorite } = useFavorites()

  const formatPrice = (price) =>
    new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0
    }).format(price)

  return (
    <div className="favorites-page">
      <Navbar />

      <div className="favorites-content">
        <div className="favorites-container">
          <h1>Favoriti</h1>
          {items.length === 0 ? (
            <p className="favorites-empty">Trenutno nema omiljenih proizvoda.</p>
          ) : (
            <div className="favorites-grid">
              {items.map((item) => (
                <div key={item.id} className="favorites-card">
                  <div className="favorites-image">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} />
                    ) : (
                      <div className="favorites-placeholder">Nema slike</div>
                    )}
                  </div>
                  <div className="favorites-info">
                    <h3>{item.title}</h3>
                    <p>{formatPrice(item.price)}</p>
                    <div className="favorites-actions">
                      <Link
                        to={`/product/${item.id}`}
                        className="favorites-view"
                      >
                        Pogledaj proizvod
                      </Link>
                      <button
                        type="button"
                        className="favorites-remove"
                        onClick={() => removeFavorite(item.id)}
                      >
                        Ukloni
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FavoritesPage
