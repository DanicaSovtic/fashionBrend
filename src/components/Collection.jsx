import React from 'react'
import { Link } from 'react-router-dom'
import './Collection.css'

const Collection = () => {
  // Statički podaci o kolekcijama
  const collections = [
    {
      id: 1,
      name: 'Winter Collection 2025',
      season: 'Winter',
      year: '2025',
      description: 'Elegant pieces designed for the modern winter wardrobe. Cozy yet sophisticated.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      items: '45+ items',
      status: 'Available Now'
    },
    {
      id: 2,
      name: 'Autumn Essentials',
      season: 'Autumn',
      year: '2024',
      description: 'Timeless autumn pieces that blend comfort with style. Perfect for transitional weather.',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80',
      items: '38+ items',
      status: 'Available Now'
    },
    {
      id: 3,
      name: 'Summer Breeze',
      season: 'Summer',
      year: '2024',
      description: 'Light, airy designs perfect for warm days. Fresh and vibrant summer collection.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      items: '52+ items',
      status: 'Available Now'
    },
    {
      id: 4,
      name: 'Spring Awakening',
      season: 'Spring',
      year: '2024',
      description: 'Fresh colors and flowing silhouettes. Celebrate the new season in style.',
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      items: '41+ items',
      status: 'Available Now'
    },
    {
      id: 5,
      name: 'Classic Black & White',
      season: 'All Seasons',
      year: '2024',
      description: 'Timeless monochrome pieces that never go out of style. Essential wardrobe staples.',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80',
      items: '35+ items',
      status: 'Available Now'
    },
    {
      id: 6,
      name: 'Evening Elegance',
      season: 'Special',
      year: '2024',
      description: 'Sophisticated evening wear for special occasions. Make a statement wherever you go.',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80',
      items: '28+ items',
      status: 'Available Now'
    }
  ]

  return (
    <div className="collection-page">
      {/* Navigacioni meni */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">
            <Link to="/">NOIR</Link>
          </div>
          <ul className="navbar-menu">
            <li className="navbar-item">
              <Link to="/" className="navbar-link">Home</Link>
            </li>
            <li className="navbar-item">
              <a href="#shop" className="navbar-link">Shop</a>
            </li>
            <li className="navbar-item">
              <Link to="/collection" className="navbar-link active">Collection</Link>
            </li>
            <li className="navbar-item">
              <Link to="/about" className="navbar-link">About</Link>
            </li>
            <li className="navbar-item">
              <Link to="/contact" className="navbar-link">Contact</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero sekcija */}
      <section className="collection-hero">
        <div className="collection-hero-overlay"></div>
        <div className="collection-hero-content">
          <h1 className="collection-hero-title">Our Collections</h1>
          <p className="collection-hero-subtitle">Discover timeless elegance in every piece</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="collection-content">
        <div className="collection-container">
          {/* Intro tekst */}
          <div className="collection-intro">
            <h2 className="collection-intro-title">Explore Our Latest Collections</h2>
            <p className="collection-intro-text">
              Each collection is carefully curated to bring you the finest pieces 
              that combine modern design with timeless elegance. Browse through 
              our available collections and find your perfect style.
            </p>
          </div>

          {/* Grid sa kolekcijama */}
          <div className="collections-grid">
            {collections.map((collection) => (
              <div key={collection.id} className="collection-card">
                <div className="collection-card-image-wrapper">
                  <img 
                    src={collection.image} 
                    alt={collection.name}
                    className="collection-card-image"
                  />
                  <div className="collection-card-overlay">
                    <span className="collection-status">{collection.status}</span>
                  </div>
                </div>
                <div className="collection-card-content">
                  <div className="collection-card-header">
                    <span className="collection-season">{collection.season} {collection.year}</span>
                    <span className="collection-items">{collection.items}</span>
                  </div>
                  <h3 className="collection-card-title">{collection.name}</h3>
                  <p className="collection-card-description">{collection.description}</p>
                  <button className="collection-card-button">
                    View Collection
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Collection

