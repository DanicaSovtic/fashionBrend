import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import './Shop.css'

const NewCollectionDetail = () => {
  const { collectionId } = useParams()
  const navigate = useNavigate()
  const [collection, setCollection] = useState(null)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchCollectionProducts = async () => {
      if (!collectionId) {
        setErrorMessage('Neispravan link za kolekciju.')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setErrorMessage('')
        const response = await fetch(`/api/new-collections/${collectionId}/products`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Greška prilikom učitavanja proizvoda.')
        }
        const data = await response.json()
        setCollection(data.collection)
        setProducts(data.products || [])
      } catch (error) {
        setErrorMessage(error.message || 'Došlo je do greške.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCollectionProducts()
  }, [collectionId])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesSearch = normalizedSearch
        ? product.title?.toLowerCase().includes(normalizedSearch)
        : true
      const normalizedCategory = String(product.category || '')
        .trim()
        .toLowerCase()
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : normalizedCategory === selectedCategory
      return matchesSearch && matchesCategory
    })

    const sorted = [...filtered]
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case 'price-high':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case 'name-asc':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        break
      case 'name-desc':
        sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, sortBy])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / itemsPerPage)
  )
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(start, start + itemsPerPage)
  }, [currentPage, filteredProducts])

  const formatPrice = (price) => {
    if (!price || price === 0) {
      return 'Cena na upit'
    }
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0
    }).format(price)
  }

  const slugify = (value) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')

  const getProductPath = (product) => {
    // Za sada koristimo product model ID, možda će trebati drugačiji path
    const slug = slugify(product.title) || 'proizvod'
    return `/product/${product.id}--${slug}`
  }

  // Handleri za filtere
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

  // Dobijamo jedinstvene kategorije iz proizvoda
  const categories = useMemo(() => {
    const cats = new Set()
    products.forEach(product => {
      if (product.category) {
        cats.add(product.category)
      }
    })
    return Array.from(cats).map(cat => ({
      value: cat.toLowerCase(),
      label: cat.charAt(0).toUpperCase() + cat.slice(1)
    }))
  }, [products])

  if (isLoading) {
    return (
      <div className="shop-page">
        <Navbar activePath="/new-collections" />
        <div className="shop-content">
          <div className="shop-container">
            <div className="loading-state">
              <p className="loading-state-text">Učitavanje proizvoda...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (errorMessage || !collection) {
    return (
      <div className="shop-page">
        <Navbar activePath="/new-collections" />
        <div className="shop-content">
          <div className="shop-container">
            <div className="error-state">
              <p className="error-state-text">{errorMessage || 'Kolekcija nije pronađena.'}</p>
              <button 
                onClick={() => navigate('/new-collections')}
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
      </div>
    )
  }

  return (
    <div className="shop-page">
      <Navbar activePath="/new-collections" />

      {/* Hero sekcija sa kolekcijom */}
      <section 
        className="shop-hero"
        style={{
          backgroundImage: collection.image_url 
            ? `url(${collection.image_url})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="shop-hero-overlay"></div>
        <div className="shop-hero-content">
          <h1 className="shop-hero-title">{collection.name}</h1>
          <p className="shop-hero-subtitle">{collection.description || 'Odobreni proizvodi iz kolekcije'}</p>
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
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="shop-content">
        <div className="shop-container">
          <button 
            onClick={() => navigate('/new-collections')}
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
                  className="search-input"
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{ padding: '0.75rem' }}
                >
                  <option value="all">Sve Kategorije</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Sortiranje */}
              <div className="filter-group">
                <select
                  className="search-input"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  style={{ padding: '0.75rem' }}
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
            {filteredProducts.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">
                  Nema odobrenih proizvoda u ovoj kolekciji.
                </p>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {paginatedProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={getProductPath(product)}
                      className="product-card"
                    >
                      <div className="product-image-wrapper">
                        <img 
                          src={product.image_url} 
                          alt={product.title}
                          className="product-image"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x400'
                          }}
                        />
                      </div>
                      <div className="product-info">
                        <h3 className="product-name">{product.title}</h3>
                        <p className="product-price">{formatPrice(product.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Paginacija */}
                {filteredProducts.length > itemsPerPage && (
                  <div className="pagination">
                    <button 
                      className="pagination-button"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Prethodna
                    </button>
                    <span className="pagination-info">
                      Stranica {currentPage} / {totalPages}
                    </span>
                    <button 
                      className="pagination-button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Sledeća
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewCollectionDetail
