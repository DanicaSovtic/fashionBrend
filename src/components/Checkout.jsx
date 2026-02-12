import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './Checkout.css'

const Checkout = () => {
  const navigate = useNavigate()
  const { items, total, clearCart } = useCart()
  const { user, profile } = useAuth()

  const [step, setStep] = useState(1) // 1 = delivery info, 2 = payment method
  const [paymentMethod, setPaymentMethod] = useState('')
  const [formData, setFormData] = useState({
    firstName: profile?.full_name?.split(' ')[0] || '',
    lastName: profile?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    street: '',
    addressDetails: '',
    postalCode: '',
    city: ''
  })

  const [errors, setErrors] = useState({})

  const formatPrice = (price) =>
    new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0
    }).format(price)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateDeliveryInfo = () => {
    const newErrors = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ime je obavezno'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Prezime je obavezno'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email je obavezan'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email nije validan'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon je obavezan'
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Ulica i broj su obavezni'
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Poštanski broj je obavezan'
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Grad je obavezan'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleDeliverySubmit = (e) => {
    e.preventDefault()
    if (validateDeliveryInfo()) {
      setStep(2)
    }
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    
    if (!paymentMethod) {
      alert('Molimo izaberite način plaćanja')
      return
    }

    try {
      const token = localStorage.getItem('auth_access_token')
      if (!token) {
        throw new Error('Niste autentifikovani')
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deliveryInfo: formData,
          paymentMethod,
          items: items.map(item => ({
            product_id: item.product_id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            size: item.size || null
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška prilikom kreiranja narudžbine')
      }

      const orderData = await response.json()
      console.log('Order created successfully:', orderData)

      // Clear cart after successful order
      try {
        await clearCart()
      } catch (clearError) {
        console.error('Failed to clear cart:', clearError)
        // Don't fail the order if cart clearing fails
      }

      alert('Narudžbina je uspešno kreirana!')
      navigate('/cart')
    } catch (error) {
      console.error('Error creating order:', error)
      alert(error.message || 'Došlo je do greške prilikom kreiranja narudžbine.')
    }
  }

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <Navbar />
        <div className="checkout-container">
          <div className="checkout-empty">
            <p>Korpa je prazna. Dodajte proizvode u korpu pre nastavka.</p>
            <button onClick={() => navigate('/shop')} className="checkout-btn checkout-btn-primary">
              Nastavi kupovinu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <Navbar />

      <div className="checkout-container">
        <div className="checkout-content">
          <div className="checkout-main">
            {step === 1 && (
              <form onSubmit={handleDeliverySubmit} className="checkout-form">
                <h1>Podaci za isporuku</h1>

                {/* Podaci primaoca */}
                <section className="checkout-section">
                  <h2>Podaci primaoca</h2>
                  
                  <div className="checkout-form-row">
                    <div className="checkout-form-group">
                      <label htmlFor="firstName">Ime *</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={errors.firstName ? 'error' : ''}
                      />
                      {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                    </div>

                    <div className="checkout-form-group">
                      <label htmlFor="lastName">Prezime *</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={errors.lastName ? 'error' : ''}
                      />
                      {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                    </div>
                  </div>

                  <div className="checkout-form-row">
                    <div className="checkout-form-group">
                      <label htmlFor="email">Imejl *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={errors.email ? 'error' : ''}
                      />
                      {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    <div className="checkout-form-group">
                      <label htmlFor="phone">Telefon *</label>
                      <div className="phone-input-group">
                        <span className="phone-prefix">+381</span>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Telefon"
                          className={errors.phone ? 'error' : ''}
                        />
                      </div>
                      {errors.phone && <span className="error-message">{errors.phone}</span>}
                    </div>
                  </div>
                </section>

                {/* Adresa za isporuku */}
                <section className="checkout-section">
                  <h2>Adresa za isporuku</h2>

                  <div className="checkout-form-group">
                    <label htmlFor="street">Ulica i broj *</label>
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      className={errors.street ? 'error' : ''}
                    />
                    {errors.street && <span className="error-message">{errors.street}</span>}
                  </div>

                  <div className="checkout-form-group">
                    <label htmlFor="addressDetails">Ulaz, stan... (Nije obavezno)</label>
                    <input
                      type="text"
                      id="addressDetails"
                      name="addressDetails"
                      value={formData.addressDetails}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="checkout-form-row">
                    <div className="checkout-form-group">
                      <label htmlFor="postalCode">Poštanski broj *</label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className={errors.postalCode ? 'error' : ''}
                      />
                      {errors.postalCode && <span className="error-message">{errors.postalCode}</span>}
                    </div>

                    <div className="checkout-form-group">
                      <label htmlFor="city">Grad *</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={errors.city ? 'error' : ''}
                      />
                      {errors.city && <span className="error-message">{errors.city}</span>}
                    </div>
                  </div>
                </section>

                <div className="checkout-form-actions">
                  <button
                    type="button"
                    onClick={() => navigate('/cart')}
                    className="checkout-btn checkout-btn-secondary"
                  >
                    ← Nazad na korpu
                  </button>
                  <button type="submit" className="checkout-btn checkout-btn-primary">
                    NASTAVI
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handlePaymentSubmit} className="checkout-form">
                <h1>Odaberi način plaćanja</h1>

                <div className="payment-info">
                  {<p>
                       { <p>
                   Ovaj podatak se obrađuje isključivo radi eventualne zamene ili povrata i
  čuva se u skladu sa važećim propisima o zaštiti podataka.
                  </p> }
                  </p> }
                </div>

                <div className="payment-methods">
                  <div
                    className={`payment-method-card ${paymentMethod === 'metamask' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('metamask')}
                  >
                    <div className="payment-method-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21.5 2L12 8.5L2.5 2L12 0L21.5 2Z" fill="#F6851B"/>
                        <path d="M2.5 2L12 8.5V24L2.5 18V2Z" fill="#E2761B"/>
                        <path d="M21.5 2L12 8.5V24L21.5 18V2Z" fill="#CD6116"/>
                        <path d="M12 8.5L2.5 2L7.5 6.5L12 8.5Z" fill="#E4751F"/>
                        <path d="M21.5 2L12 8.5L16.5 6.5L21.5 2Z" fill="#F6851B"/>
                        <path d="M2.5 18L12 24V8.5L2.5 18Z" fill="#C9AD63"/>
                        <path d="M21.5 18L12 24V8.5L21.5 18Z" fill="#D7C1B3"/>
                        <path d="M12 8.5L7.5 6.5L12 12.5V8.5Z" fill="#233447"/>
                        <path d="M16.5 6.5L12 8.5V12.5L16.5 6.5Z" fill="#CD6116"/>
                      </svg>
                    </div>
                    <span>Metamask novčanik</span>
                  </div>

                  <div
                    className={`payment-method-card ${paymentMethod === 'giftcard' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('giftcard')}
                  >
                    <div className="payment-method-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M3 9h18M9 5V3h6v2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 13l-2 2 2 2 2-2-2-2z" fill="currentColor"/>
                        <circle cx="12" cy="15" r="1" fill="white"/>
                      </svg>
                    </div>
                    <span>GiftCard</span>
                  </div>

                  <div
                    className={`payment-method-card ${paymentMethod === 'cash' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <div className="payment-method-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M2 8h20M6 12h12M6 16h8" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="8" cy="14" r="1" fill="currentColor"/>
                        <circle cx="16" cy="14" r="1" fill="currentColor"/>
                      </svg>
                    </div>
                    <span>Plaćanje pouzećem</span>
                  </div>
                </div>

                <div className="checkout-form-actions">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="checkout-btn checkout-btn-secondary"
                  >
                    ← Nazad na podatke za isporuku
                  </button>
                  <button type="submit" className="checkout-btn checkout-btn-primary" disabled={!paymentMethod}>
                    Završi narudžbinu
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="checkout-summary">
            <h2>Sažetak narudžbine</h2>
            <div className="checkout-summary-items">
              {items.map((item) => (
                <div key={item.key} className="checkout-summary-item">
                  <div className="checkout-summary-item-info">
                    <span className="checkout-summary-item-name">{item.title}</span>
                    {item.size && <span className="checkout-summary-item-meta">Veličina: {item.size}</span>}
                    <span className="checkout-summary-item-quantity">Količina: {item.quantity}</span>
                  </div>
                  <span className="checkout-summary-item-price">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="checkout-summary-total">
              <span>Ukupno</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default Checkout
