import React, { useState, useEffect } from 'react'
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
  const [metamaskAccount, setMetamaskAccount] = useState(null)
  const [isConnectingMetamask, setIsConnectingMetamask] = useState(false)
  const [metamaskError, setMetamaskError] = useState('')
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

  // Provera da li je Metamask instaliran
  const isMetamaskInstalled = () => {
    if (typeof window === 'undefined') return false
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask
  }

  // Povezivanje sa Metamask novčanikom
  const connectMetamask = async () => {
    // Provera da li je Metamask instaliran pre nego što počnemo
    if (!isMetamaskInstalled()) {
      const shouldInstall = window.confirm(
        'Metamask nije instaliran. Da li želite da otvorite stranicu za preuzimanje Metamask ekstenzije?'
      )
      if (shouldInstall) {
        window.open('https://metamask.io/download/', '_blank')
      }
      return
    }

    setIsConnectingMetamask(true)
    setMetamaskError('')

    try {

      // Zahtev za povezivanje sa Metamask-om
      // Ovo će otvoriti Metamask prozor u pretraživaču (gore desno)
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        setMetamaskAccount(accounts[0])
        setPaymentMethod('metamask')
        setMetamaskError('')
      } else {
        setMetamaskError('Nije moguće povezati se sa Metamask novčanikom.')
      }
    } catch (error) {
      console.error('Metamask connection error:', error)
      
      // Različite greške za različite scenarije
      if (error.code === 4001) {
        setMetamaskError('Korisnik je odbio zahtev za povezivanje.')
      } else if (error.code === -32002) {
        setMetamaskError('Zahtev za povezivanje je već u toku. Proverite Metamask prozor.')
      } else {
        setMetamaskError('Greška prilikom povezivanja sa Metamask-om: ' + error.message)
      }
    } finally {
      setIsConnectingMetamask(false)
    }
  }

  // Provera trenutnog stanja Metamask konekcije
  const checkMetamaskConnection = async () => {
    if (!isMetamaskInstalled()) {
      return
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      })

      if (accounts && accounts.length > 0) {
        setMetamaskAccount(accounts[0])
        if (paymentMethod === 'metamask') {
          // Ako je već izabran Metamask, automatski ga postavi
        }
      }
    } catch (error) {
      console.error('Error checking Metamask connection:', error)
    }
  }

  // Listener za promene Metamask naloga
  useEffect(() => {
    if (isMetamaskInstalled()) {
      // Proveri konekciju kada se komponenta učita
      checkMetamaskConnection()

      // Dodaj listener za promene naloga
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setMetamaskAccount(null)
          if (paymentMethod === 'metamask') {
            setPaymentMethod('')
          }
        } else {
          setMetamaskAccount(accounts[0])
          // Ako je Metamask već izabran, zadrži ga
          if (paymentMethod === 'metamask') {
            // Payment method je već postavljen
          }
        }
      }

      // Dodaj listener za promene naloga
      if (window.ethereum.on) {
        window.ethereum.on('accountsChanged', handleAccountsChanged)
      }

      // Cleanup
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [])

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

    // Za Metamask, proveri da li je povezan
    if (paymentMethod === 'metamask' && !metamaskAccount) {
      alert('Molimo povežite Metamask novčanik pre nastavka.')
      await connectMetamask()
      return
    }

    try {
      const token = localStorage.getItem('auth_access_token')
      if (!token) {
        throw new Error('Niste autentifikovani')
      }

      // Za Metamask, možemo dodati wallet adresu u order data
      const requestData = {
        deliveryInfo: formData,
        paymentMethod,
        items: items.map(item => ({
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          size: item.size || null
        }))
      }

      // Dodaj Metamask adresu ako je plaćanje preko Metamask-a
      if (paymentMethod === 'metamask' && metamaskAccount) {
        requestData.walletAddress = metamaskAccount
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška prilikom kreiranja narudžbine')
      }

      const orderResponse = await response.json()
      console.log('Order created successfully:', orderResponse)

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
                  <p>
                    Prikupljanje broja Lične karte/Pasoša je novi zahtev od Poreske Uprave, te se eventualno obrađuje jedino u svrhu moguće zamene, i/ili povrata.
                  </p>
                </div>

                {metamaskError && (
                  <div className="metamask-error">
                    <p>{metamaskError}</p>
                    {!isMetamaskInstalled() && (
                      <a 
                        href="https://metamask.io/download/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="metamask-install-link"
                      >
                        Preuzmi Metamask
                      </a>
                    )}
                  </div>
                )}

                <div className="payment-methods">
                  <div
                    className={`payment-method-card ${paymentMethod === 'metamask' ? 'selected' : ''} ${isConnectingMetamask ? 'connecting' : ''}`}
                    onClick={connectMetamask}
                  >
                    <div className="payment-method-icon">
                      {isConnectingMetamask ? (
                        <div className="metamask-spinner"></div>
                      ) : (
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
                      )}
                    </div>
                    <span>
                      {isConnectingMetamask 
                        ? 'Povezivanje...' 
                        : metamaskAccount 
                          ? `Povezan: ${metamaskAccount.slice(0, 6)}...${metamaskAccount.slice(-4)}`
                          : 'Metamask novčanik'
                      }
                    </span>
                    {!isMetamaskInstalled() && !isConnectingMetamask && (
                      <span className="metamask-install-hint">Klikni da instaliraš Metamask</span>
                    )}
                    {metamaskAccount && (
                      <span className="metamask-connected-badge">✓ Povezan</span>
                    )}
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
