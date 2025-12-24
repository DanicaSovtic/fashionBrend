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
              <Link to="/collection" className="navbar-link">Kolekcije</Link>
            </li>
            <li className="navbar-item">
              <Link to="/about" className="navbar-link active">O nama</Link>
            </li>
            <li className="navbar-item">
              <Link to="/contact" className="navbar-link">Kontakt</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero sekcija za About */}
      <section className="about-hero">
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1 className="about-hero-title">O MyDivinaStyle</h1>
          <p className="about-hero-subtitle">Gde se elegantnost susreće sa inovacijom</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="about-content">
        {/* Story sekcija */}
        <section className="about-section">
          <div className="about-container">
            <div className="about-text-block">
              <h2 className="about-heading">Naša Priča</h2>
              <p className="about-text">
                MyDivinaStyle je rođen iz vizije da redefinišemo modernu modu. Osnovan 2022. godine, 
                posvetili smo se stvaranju bezvremenskih komada koji spajaju 
                savremeni dizajn sa klasičnom elegantnošću.
              </p>
              <p className="about-text">
                Naša posvećenost kvalitetu, održivosti i inovacijama učinila nas je 
                pouzdanim imenom u modnoj industriji. Svaka kolekcija priča priču, 
                svaki komad je pažljivo izrađen, i svaki detalj je važan.
              </p>
            </div>
            <div className="about-image-block">
              <div className="about-image-placeholder">
                <span>Naša Priča</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mission sekcija */}
        <section className="about-section about-section-dark">
          <div className="about-container">
            <div className="about-image-block">
              <div className="about-image-placeholder">
                <span>Naša Misija</span>
              </div>
            </div>
            <div className="about-text-block">
              <h2 className="about-heading">Naša Misija</h2>
              <p className="about-text">
                Da osnažimo pojedince da izraze svoj jedinstveni stil kroz 
                pažljivo dizajnirane, visokokvalitetne modne komade koji 
                izdržavaju test vremena.
              </p>
              <p className="about-text">
                Verujemo da moda treba da bude pristupačna, održiva i 
                inspirišuća. Naša misija seže dalje od odeće—gradimo 
                zajednicu svesti o stilu pojedinaca koji vrednuju kvalitet 
                preko količine.
              </p>
            </div>
          </div>
        </section>

        {/* Values sekcija */}
        <section className="about-section">
          <div className="about-container about-container-column">
            <h2 className="about-heading about-heading-center">Naše Vrednosti</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="value-icon">✨</div>
                <h3 className="value-title">Kvalitet</h3>
                <p className="value-text">
                  Koristimo samo najfinije materijale i radimo sa veštim 
                  zanatlijama kako bismo osigurali da svaki komad ispunjava naše visoke standarde.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🌱</div>
                <h3 className="value-title">Održivost</h3>
                <p className="value-text">
                  Posvećeni etičkim praksama i ekološkoj odgovornosti 
                  u svakom aspektu našeg procesa proizvodnje.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🎨</div>
                <h3 className="value-title">Inovacija</h3>
                <p className="value-text">
                  Stalno pomeramo granice kako bismo stvorili sveže, moderne dizajne 
                  koji inspirišu i očaravaju.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">❤️</div>
                <h3 className="value-title">Autentičnost</h3>
                <p className="value-text">
                  Ostanemo verni našoj viziji i vrednostima dok gradimo iskrene 
                  veze sa našom zajednicom.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA sekcija */}
        <section className="about-cta">
          <div className="about-cta-content">
            <h2 className="about-cta-title">Pridružite Nam Se</h2>
            <p className="about-cta-text">
              Otkrijte naše najnovije kolekcije i budite deo MyDivinaStyle zajednice.
            </p>
            <Link to="/" className="about-cta-button">Istraži Kolekcije</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default About

