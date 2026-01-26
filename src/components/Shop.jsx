import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CustomSelect from './CustomSelect'
import './Shop.css'

const Shop = () => {
  // State za filtere i pretragu (za buduću integraciju sa bazom)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [currentPage, setCurrentPage] = useState(1)

  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')
        const response = await fetch('/api/products')
        if (!response.ok) {
          throw new Error('Greška prilikom učitavanja proizvoda.')
        }
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        setErrorMessage(error.message || 'Došlo je do greške.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesSearch = normalizedSearch
        ? product.title?.toLowerCase().includes(normalizedSearch)
        : true
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : product.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    const sorted = [...filtered]
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'name-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title))
        break
      case 'newest':
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
      default:
        break
    }

    return sorted
  }, [products, searchTerm, selectedCategory, sortBy])

  const formatPrice = (price) =>
    new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0
    }).format(price)

  // Handleri za filtere (za buduću integraciju)
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryChange = (value) => {
    setSelectedCategory(value)
  }

  const handleSortChange = (value) => {
    setSortBy(value)
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
            <Link to="/">Piccola</Link>
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
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Sve Kategorije' },
                    { value: 'kosulje', label: 'Košulje' },
                    { value: 'pantalone', label: 'Pantalone' },
                    { value: 'suknje', label: 'Suknje' },
                    { value: 'haljine', label: 'Haljine' },
                    { value: 'jakne', label: 'Jakne' },
                    { value: 'obuca', label: 'Obuća' }
                  ]}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  placeholder="Sve Kategorije"
                />
              </div>

              {/* Sortiranje */}
              <div className="filter-group">
                <CustomSelect
                  options={[
                    { value: 'default', label: 'Podrazumevano' },
                    { value: 'price-low', label: 'Cena: Niska → Visoka' },
                    { value: 'price-high', label: 'Cena: Visoka → Niska' },
                    { value: 'name-asc', label: 'Naziv: A → Z' },
                    { value: 'name-desc', label: 'Naziv: Z → A' },
                    { value: 'newest', label: 'Najnovije' }
                  ]}
                  value={sortBy}
                  onChange={handleSortChange}
                  placeholder="Podrazumevano"
                />
              </div>
            </div>
          </div>

          {/* Grid sa proizvodima */}
          <div className="products-section">
            {isLoading ? (
              <div className="loading-state">
                <p className="loading-state-text">Učitavanje proizvoda...</p>
              </div>
            ) : errorMessage ? (
              <div className="error-state">
                <p className="error-state-text">{errorMessage}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">
                  Nema proizvoda za prikaz.
                </p>
              </div>
            ) : (
              <div className="products-grid">
                {/* Proizvodi će biti mapirani ovde kada se povežu sa bazom */}
                {filteredProducts.map((product) => (
                  <div key={product.id} className="product-card">
                    {/* Struktura kartice proizvoda */}
                    <div className="product-image-wrapper">
                      <img 
                        src={product.image_url} 
                        alt={product.title}
                        className="product-image"
                      />
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.title}</h3>
                      <p className="product-price">{formatPrice(product.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paginacija (placeholder) */}
          {filteredProducts.length > 0 && (
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

