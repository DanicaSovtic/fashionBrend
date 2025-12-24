import React from 'react'
import { Link } from 'react-router-dom'
import './About.css'

const About = () => {
  return (
    <div className="about-page">
      {/* Navigacioni meni - isti kao na Home stranici */}
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
              <Link to="/about" className="navbar-link active">About</Link>
            </li>
            <li className="navbar-item">
              <Link to="/contact" className="navbar-link">Contact</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero sekcija za About */}
      <section className="about-hero">
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1 className="about-hero-title">About NOIR</h1>
          <p className="about-hero-subtitle">Where elegance meets innovation</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="about-content">
        {/* Story sekcija */}
        <section className="about-section">
          <div className="about-container">
            <div className="about-text-block">
              <h2 className="about-heading">Our Story</h2>
              <p className="about-text">
                NOIR was born from a vision to redefine modern fashion. Founded in 2020, 
                we have dedicated ourselves to creating timeless pieces that blend 
                contemporary design with classic elegance.
              </p>
              <p className="about-text">
                Our commitment to quality, sustainability, and innovation has made us 
                a trusted name in the fashion industry. Every collection tells a story, 
                every piece is crafted with care, and every detail matters.
              </p>
            </div>
            <div className="about-image-block">
              <div className="about-image-placeholder">
                <span>Our Story</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mission sekcija */}
        <section className="about-section about-section-dark">
          <div className="about-container">
            <div className="about-image-block">
              <div className="about-image-placeholder">
                <span>Our Mission</span>
              </div>
            </div>
            <div className="about-text-block">
              <h2 className="about-heading">Our Mission</h2>
              <p className="about-text">
                To empower individuals to express their unique style through 
                thoughtfully designed, high-quality fashion pieces that stand 
                the test of time.
              </p>
              <p className="about-text">
                We believe that fashion should be accessible, sustainable, and 
                inspiring. Our mission extends beyond clothing—we're building 
                a community of style-conscious individuals who value quality 
                over quantity.
              </p>
            </div>
          </div>
        </section>

        {/* Values sekcija */}
        <section className="about-section">
          <div className="about-container about-container-column">
            <h2 className="about-heading about-heading-center">Our Values</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="value-icon">✨</div>
                <h3 className="value-title">Quality</h3>
                <p className="value-text">
                  We source only the finest materials and work with skilled 
                  artisans to ensure every piece meets our high standards.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🌱</div>
                <h3 className="value-title">Sustainability</h3>
                <p className="value-text">
                  Committed to ethical practices and environmental responsibility 
                  in every aspect of our production process.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🎨</div>
                <h3 className="value-title">Innovation</h3>
                <p className="value-text">
                  Constantly pushing boundaries to create fresh, modern designs 
                  that inspire and captivate.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">❤️</div>
                <h3 className="value-title">Authenticity</h3>
                <p className="value-text">
                  Staying true to our vision and values while building genuine 
                  connections with our community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA sekcija */}
        <section className="about-cta">
          <div className="about-cta-content">
            <h2 className="about-cta-title">Join Our Journey</h2>
            <p className="about-cta-text">
              Discover our latest collections and be part of the NOIR community.
            </p>
            <Link to="/" className="about-cta-button">Explore Collections</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default About

