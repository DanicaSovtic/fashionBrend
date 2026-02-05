import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import './Home.css'

const Home = () => {
  return (
    <div className="home">
      <Navbar activePath="/" />

      {/* Hero / reklama sekcija */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-headline">Nova Zimska Kolekcija 2026</h1>
          <p className="hero-slogan">Elegantnost redefinisana. Stil uzdignut.</p>
          <Link to="/shop" className="hero-cta">
            Kupi Sada
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home

