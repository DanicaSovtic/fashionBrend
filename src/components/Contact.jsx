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
              <Link to="/contact" className="navbar-link active">Contact</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero sekcija */}
      <section className="contact-hero">
        <div className="contact-hero-overlay"></div>
        <div className="contact-hero-content">
          <h1 className="contact-hero-title">Get In Touch</h1>
          <p className="contact-hero-subtitle">We'd love to hear from you</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="contact-content">
        <div className="contact-container">
          {/* Kontakt informacije */}
          <div className="contact-info">
            <h2 className="contact-info-title">Contact Information</h2>
            <p className="contact-info-text">
              Have a question or want to collaborate? Feel free to reach out to us.
            </p>

            <div className="contact-details">
              <div className="contact-detail-item">
                <div className="contact-icon">📍</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Address</h3>
                  <p className="contact-detail-text">
                    123 Fashion Street<br />
                    Belgrade, Serbia 11000
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">📧</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Email</h3>
                  <p className="contact-detail-text">
                    <a href="mailto:info@noir.com">info@noir.com</a>
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">📞</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Phone</h3>
                  <p className="contact-detail-text">
                    <a href="tel:+381123456789">+381 12 345 6789</a>
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">🕒</div>
                <div className="contact-detail-content">
                  <h3 className="contact-detail-title">Working Hours</h3>
                  <p className="contact-detail-text">
                    Monday - Friday: 9:00 - 18:00<br />
                    Saturday: 10:00 - 16:00<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kontakt forma */}
          <div className="contact-form-wrapper">
            <h2 className="contact-form-title">Send Us a Message</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
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
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject" className="form-label">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="form-input"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="What is this regarding?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">Message</label>
                <textarea
                  id="message"
                  name="message"
                  className="form-textarea"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Your message here..."
                ></textarea>
              </div>

              <button type="submit" className="form-submit-button">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact

