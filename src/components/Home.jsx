import React from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

const Home = () => {
  return (
    <div className="home">
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
              <Link to="/collection" className="navbar-link">Collection</Link>
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

      {/* Hero / reklama sekcija */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-headline">New Winter Collection 2025</h1>
          <p className="hero-slogan">Elegance redefined. Style elevated.</p>
          <a href="#shop" className="hero-cta">
            Shop Now
          </a>
        </div>
      </section>
    </div>
  )
}

export default Home

