import React from 'react'
import { Link } from 'react-router-dom'
import './Collection.css'

const Collection = () => {
  // Statički podaci o kolekcijama
  const collections = [
    {
      id: 1,
      name: 'Zimska Kolekcija 2026',
      season: 'Zima',
      year: '2026',
      description: 'Elegantni komadi dizajnirani za modernu zimsku garderobu. Udobno, a ipak sofisticirano.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      items: '45+ komada',
      status: 'Dostupno Sada'
    },
    {
      id: 2,
      name: 'Jesenji Osnovni Komadi',
      season: 'Jesen',
      year: '2024',
      description: 'Bezvremenski jesenji komadi koji spajaju udobnost sa stilom. Savršeno za prelazno vreme.',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80',
      items: '38+ komada',
      status: 'Dostupno Sada'
    },
    {
      id: 3,
      name: 'Letnji Povetarac',
      season: 'Leto',
      year: '2024',
      description: 'Lagani, prozračni dizajni savršeni za tople dane. Sveža i živahna letnja kolekcija.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      items: '52+ komada',
      status: 'Dostupno Sada'
    },
    {
      id: 4,
      name: 'Prolećno Budenje',
      season: 'Proleće',
      year: '2024',
      description: 'Sveže boje i tečne siluete. Proslavite novu sezonu u stilu.',
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      items: '41+ komada',
      status: 'Dostupno Sada'
    },
    {
      id: 5,
      name: 'Klasična Crno-Bela',
      season: 'Sve Sezone',
      year: '2024',
      description: 'Bezvremenski monohromni komadi koji nikada ne izlaze iz mode. Osnovni garderobni komadi.',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80',
      items: '35+ komada',
      status: 'Dostupno Sada'
    },
    {
      id: 6,
      name: 'Večernja Elegantnost',
      season: 'Posebno',
      year: '2024',
      description: 'Sofisticirana večernja odeća za posebne prilike. Napravite izjavu gde god da idete.',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80',
      items: '28+ komada',
      status: 'Dostupno Sada'
    }
  ]

  return (
    <div className="collection-page">
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
              <Link to="/shop" className="navbar-link">Prodavnica</Link>
            </li>
            <li className="navbar-item">
              <Link to="/collection" className="navbar-link active">Kolekcije</Link>
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
                    Pogledaj Kolekciju
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

