import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './Contact.css'

const Contact = () => {
  // State za formu
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  // Handler za promene u formi
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handler za submit forme
  const handleSubmit = (e) => {
    e.preventDefault()
    // Ovde bi se obično slala poruka na backend
    console.log('Form data:', formData)
    alert('Hvala vam na poruci! Kontaktiraćemo vas uskoro.')
    // Reset forme
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    })
  }

  return (
    <div className="contact-page">
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
              <a href="#shop" className="navbar-link">Prodavnica</a>
            </li>
            <li className="navbar-item">
              <Link to="/collection" className="navbar-link">Kolekcije</Link>
            </li>
            <li className="navbar-item">
              <Link to="/about" className="navbar-link">O nama</Link>
            </li>
            <li className="navbar-item">
              <Link to="/contact" className="navbar-link active">Kontakt</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero sekcija */}
      <section className="contact-hero">
        <div className="contact-hero-overlay"></div>
        <div className="contact-hero-content">
          <h1 className="contact-hero-title">Kontaktirajte Nas</h1>
          <p className="contact-hero-subtitle">Rado ćemo čuti od vas</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="contact-content">
        <div className="contact-container">
          {/* Kontakt informacije */}
          <div className="contact-info">
            <h2 className="contact-info-title">Kontakt Informacije</h2>
            <p className="contact-info-text">
              Imate pitanje ili želite da sarađujete? Slobodno nas kontaktirajte.
            </p>

            <div className="contact-details">
              <div className="contact-detail-item">
                <div className="contact-icon">📍</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Adresa</h3>
                  <p className="contact-detail-text">
                    Bulevar Zorana Đinđića 123<br />
                    Beograd, Srbija 11000
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">📧</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Email</h3>
                  <p className="contact-detail-text">
                    <a href="mailto:info@mydivinastyle.com">info@mydivinastyle.com</a>
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">📞</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Telefon</h3>
                  <p className="contact-detail-text">
                    <a href="tel:+381123456789">+381 12 345 6789</a>
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">🕒</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Radno Vreme</h3>
                  <p className="contact-detail-text">
                    Ponedeljak - Petak: 9:00 - 18:00<br />
                    Subota: 10:00 - 16:00<br />
                    Nedelja: Zatvoreno
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kontakt forma */}
          <div className="contact-form-wrapper">
            <h2 className="contact-form-title">Pošaljite Nam Poruku</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Ime</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Vaše ime"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="@gmail.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject" className="form-label">Predmet</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="form-input"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Naslov poruke"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">Poruka</label>
                <textarea
                  id="message"
                  name="message"
                  className="form-textarea"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Vaša poruka ovde..."
                ></textarea>
              </div>

              <button type="submit" className="form-submit-button">
                Pošalji Poruku
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact

