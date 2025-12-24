import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './Shop.css'

const Shop = () => {
  // State za filtere i pretragu (za buduću integraciju sa bazom)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [currentPage, setCurrentPage] = useState(1)

  // Placeholder za proizvode (biće zamenjeno podacima iz baze)
  const products = [] // Prazan niz - biće popunjen iz baze

  // Handleri za filtere (za buduću integraciju)
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
  }

  const handleSortChange = (e) => {
    setSortBy(e.target.value)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  return (
    <div className="shop-page">
      {/* Navigacioni meni */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">
            <Link to="/">MyDivinaStyle</Link>
          </div>
          <ul className="navbar-menu">
            <li className="navbar-item">
              <Link to="/" className="navbar-link">Početna</Link>
            </li>
            <li className="navbar-item">
              <Link to="/shop" className="navbar-link active">Prodavnica</Link>
            </li>
            <li className="navbar-item">
              <Link to="/collection" className="navbar-link">Kolekcije</Link>
            </li>
            <li className="navbar-item">
              <Link to="/about" className="navbar-link">O nama</Link>
            </li>
            <li className="navbar-item">
              <Link to="/contact" className="navbar-link">Kontakt</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero sekcija */}
      <section className="shop-hero">
        <div className="shop-hero-overlay"></div>
        <div className="shop-hero-content">
          <h1 className="shop-hero-title">Prodavnica</h1>
          <p className="shop-hero-subtitle">Pronađite savršen komad za sebe</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="shop-content">
        <div className="shop-container">
          {/* Filter i pretraga sekcija */}
          <div className="shop-filters">
            <div className="filters-row">
              {/* Pretraga */}
              <div className="filter-group">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Pretraži proizvode..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Kategorije */}
              <div className="filter-group">
                <select
                  className="filter-select"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                >
                  <option value="all">Sve Kategorije</option>
                  <option value="dresses">Haljine</option>
                  <option value="tops">Gornji Delovi</option>
                  <option value="bottoms">Donji Delovi</option>
                  <option value="outerwear">Jakne</option>
                  <option value="accessories">Aksesoari</option>
                </select>
              </div>

              {/* Sortiranje */}
              <div className="filter-group">
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={handleSortChange}
                >
                  <option value="default">Podrazumevano</option>
                  <option value="price-low">Cena: Niska → Visoka</option>
                  <option value="price-high">Cena: Visoka → Niska</option>
                  <option value="name-asc">Naziv: A → Z</option>
                  <option value="name-desc">Naziv: Z → A</option>
                  <option value="newest">Najnovije</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid sa proizvodima */}
          <div className="products-section">
            {products.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">
                  Proizvodi će biti prikazani ovde kada se povežu sa bazom podataka.
                </p>
              </div>
            ) : (
              <div className="products-grid">
                {/* Proizvodi će biti mapirani ovde kada se povežu sa bazom */}
                {products.map((product) => (
                  <div key={product.id} className="product-card">
                    {/* Struktura kartice proizvoda */}
                    <div className="product-image-wrapper">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="product-image"
                      />
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-price">{product.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paginacija (placeholder) */}
          {products.length > 0 && (
            <div className="pagination">
              <button 
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Prethodna
              </button>
              <span className="pagination-info">
                Stranica {currentPage}
              </span>
              <button 
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Sledeća
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Shop

