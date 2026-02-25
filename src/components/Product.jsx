import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import Navbar from './Navbar'
import './Product.css'

const Product = () => {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isShippingOpen, setIsShippingOpen] = useState(false)
  const [isLifecycleOpen, setIsLifecycleOpen] = useState(false)
  const [lifecycleData, setLifecycleData] = useState(null)
  const [lifecycleLoading, setLifecycleLoading] = useState(false)
  const [lifecycleError, setLifecycleError] = useState('')
  const [addedMessage, setAddedMessage] = useState('')
  const [sizeMessage, setSizeMessage] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const addMessageTimeoutRef = useRef(null)
  const { addItem, openCart } = useCart()
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()

  const resolvedId = useMemo(() => {
    if (!productId) {
      return ''
    }
    return productId.split('--')[0]
  }, [productId])

  useEffect(() => {
    const fetchProduct = async () => {
      if (!resolvedId) {
        setErrorMessage('Neispravan link za proizvod.')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setErrorMessage('')
        const response = await fetch(`/api/products/${resolvedId}`)
        if (response.status === 404) {
          throw new Error('Proizvod nije pronađen.')
        }
        if (!response.ok) {
          throw new Error('Greška prilikom učitavanja proizvoda.')
        }
        const data = await response.json()
        setProduct(data)
      } catch (error) {
        setErrorMessage(error.message || 'Došlo je do greške.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [resolvedId])

  const formatPrice = (price) =>
    new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0
    }).format(price)

  const sastavText =
    typeof product?.sastav === 'string' ? product.sastav.trim() : ''
  const odrzavanjeText =
    typeof product?.odrzavanje === 'string' ? product.odrzavanje.trim() : ''
  const porekloText =
    typeof product?.poreklo === 'string' ? product.poreklo.trim() : ''

  const parseListItems = (value) => {
    if (!value) {
      return []
    }
    const items = value
      .split(/[\n,;]+/)
      .map((item) =>
        item.replace(/^[\s•\-\u2022]+/, '').trim()
      )
      .filter(Boolean)
    return items.length > 1 ? items : []
  }

  const sastavItems = useMemo(() => parseListItems(sastavText), [sastavText])
  const odrzavanjeItems = useMemo(
    () => parseListItems(odrzavanjeText),
    [odrzavanjeText]
  )

  const handleAddToCart = () => {
    if (!product) {
      return
    }
    if (!selectedSize) {
      setSizeMessage('Izaberite veličinu pre dodavanja u korpu.')
      return
    }
    setSizeMessage('')
    addItem(product, selectedSize)
    openCart()
    setAddedMessage('Proizvod je dodat u korpu.')
    if (addMessageTimeoutRef.current) {
      clearTimeout(addMessageTimeoutRef.current)
    }
    addMessageTimeoutRef.current = setTimeout(() => {
      setAddedMessage('')
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (addMessageTimeoutRef.current) {
        clearTimeout(addMessageTimeoutRef.current)
      }
    }
  }, [])

  const sizes = ['XS', 'S', 'M', 'L', 'XL']

  useEffect(() => {
    setSelectedSize('')
    setSizeMessage('')
  }, [product?.id])

  const openLifecycleModal = async () => {
    if (!resolvedId) return
    setIsLifecycleOpen(true)
    setLifecycleError('')
    setLifecycleData(null)
    setLifecycleLoading(true)
    try {
      const response = await fetch(`/api/products/${resolvedId}/lifecycle`)
      if (!response.ok) {
        if (response.status === 404) throw new Error('Proizvod nije pronađen.')
        throw new Error('Greška prilikom učitavanja životnog ciklusa.')
      }
      const data = await response.json()
      setLifecycleData(data)
    } catch (err) {
      setLifecycleError(err.message || 'Došlo je do greške.')
    } finally {
      setLifecycleLoading(false)
    }
  }

  const formatLifecycleDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr))
  }

  const detailLabels = {
    modelSku: 'Šifra modela',
    modelName: 'Naziv modela',
    version: 'Verzija',
    changeSummary: 'Opis izmene',
    approvalItem: 'Stavka odobrenja',
    note: 'Napomena',
    material: 'Materijal',
    color: 'Boja',
    quantityKg: 'Količina (kg)',
    supplier: 'Dobavljač',
    manufacturerReceiver: 'Proizvođač (primalac)',
    manufacturer: 'Proizvođač',
    quantityPieces: 'Broj komada',
    notes: 'Napomena',
    materialName: 'Materijal (test)',
    percentage: 'Procenat',
    labName: 'Laboratorija',
    laborant: 'Laborant',
    productSku: 'Šifra proizvoda',
    productTitle: 'Naziv proizvoda'
  }

  const renderEventDetails = (details) => {
    if (!details || typeof details !== 'object') return null
    const entries = Object.entries(details).filter(([, v]) => v != null && v !== '')
    if (entries.length === 0) return null
    return (
      <dl className="product-lifecycle-details-list">
        {entries.map(([key, value]) => (
          <React.Fragment key={key}>
            <dt>{detailLabels[key] || key}</dt>
            <dd>{String(value)}</dd>
          </React.Fragment>
        ))}
      </dl>
    )
  }

  return (
    <div className="product-page">
      <Navbar activePath="/shop" />

      <div className="product-content">
        <div className="product-container">
          {isLoading ? (
            <div className="product-state">
              <p className="product-state-text">Učitavanje proizvoda...</p>
            </div>
          ) : errorMessage ? (
            <div className="product-state">
              <p className="product-state-text">{errorMessage}</p>
            </div>
          ) : product ? (
            <div className="product-details">
              <div className="product-gallery">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="product-image"
                  />
                ) : (
                  <div className="product-image-placeholder">Nema slike</div>
                )}
              </div>
              <div className="product-summary">
                <h1 className="product-title">{product.title}</h1>
                <p className="product-price">{formatPrice(product.price)}</p>
                <div className="product-size">
                  <p className="product-size-label">Veličina</p>
                  <div className="product-size-options">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`product-size-button ${
                          selectedSize === size ? 'active' : ''
                        }`}
                        onClick={() => {
                          setSelectedSize(size)
                          setSizeMessage('')
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {sizeMessage && (
                    <span className="product-size-message">{sizeMessage}</span>
                  )}
                </div>
                <div className="product-cart-actions">
                  <button
                    type="button"
                    className="product-cart-button"
                    onClick={handleAddToCart}
                  >
                    Dodaj u korpu
                  </button>
                  <Link
                    to="/favorites"
                    className="product-favorites-link"
                    aria-label="Otvori favorite"
                  >
                    ❤
                  </Link>
                </div>
                {addedMessage && (
                  <span className="product-cart-message">{addedMessage}</span>
                )}
                <button
                  type="button"
                  className={`product-favorite-toggle ${
                    isFavorite(product.id) ? 'active' : ''
                  }`}
                  onClick={() =>
                    isFavorite(product.id)
                      ? removeFavorite(product.id)
                      : addFavorite(product)
                  }
                >
                  {isFavorite(product.id) ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
                </button>
                <p className="product-description">
                  {product.description || 'Opis nije dostupan.'}
                </p>

                <button
                  type="button"
                  className="product-info-button"
                  onClick={() => setIsShippingOpen(true)}
                >
                  Dostava, zamena i povraćaj
                </button>

                <button
                  type="button"
                  className="product-lifecycle-button"
                  onClick={openLifecycleModal}
                >
                  Pregled životnog ciklusa proizvoda
                </button>

                <div className="product-section">
                  <h2 className="product-section-title">Sastav</h2>
                  {sastavItems.length > 0 ? (
                    <ul className="product-composition-list">
                      {sastavItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="product-section-text">
                      {sastavText || 'Nema unetog sastava.'}
                    </p>
                  )}
                </div>

                <div className="product-section">
                  <h2 className="product-section-title">Održavanje</h2>
                  {odrzavanjeItems.length > 0 ? (
                    <ul className="product-composition-list">
                      {odrzavanjeItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="product-section-text">
                      {odrzavanjeText || 'Nema unetih informacija o održavanju.'}
                    </p>
                  )}
                </div>

                <div className="product-section">
                  <h2 className="product-section-title">Poreklo</h2>
                  <p className="product-section-text">
                    {porekloText || 'Nema unetih informacija o poreklu.'}
                  </p>
                </div>

                <Link to="/shop" className="product-back-link">
                  Nazad na prodavnicu
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal životnog ciklusa */}
      {isLifecycleOpen && (
        <>
          <button
            type="button"
            className="product-lifecycle-overlay"
            onClick={() => setIsLifecycleOpen(false)}
            aria-label="Zatvori pregled životnog ciklusa"
          />
          <div className="product-lifecycle-modal" role="dialog" aria-labelledby="lifecycle-title">
            <div className="product-lifecycle-header">
              <h2 id="lifecycle-title">Životni ciklus i poreklo proizvoda</h2>
              <button
                type="button"
                className="product-lifecycle-close"
                onClick={() => setIsLifecycleOpen(false)}
                aria-label="Zatvori"
              >
                ×
              </button>
            </div>
            <div className="product-lifecycle-body">
              {lifecycleLoading && (
                <p className="product-lifecycle-state">Učitavanje...</p>
              )}
              {lifecycleError && (
                <p className="product-lifecycle-error">{lifecycleError}</p>
              )}
              {!lifecycleLoading && !lifecycleError && lifecycleData && (
                <>
                  <section className="product-lifecycle-identity">
                    <h3>Digitalni identitet proizvoda</h3>
                    <dl className="product-lifecycle-identity-list">
                      <dt>Jedinstveni ID</dt>
                      <dd>{lifecycleData.digitalIdentity?.digitalId || '—'}</dd>
                      <dt>Model</dt>
                      <dd>{lifecycleData.digitalIdentity?.modelName || '—'}</dd>
                      <dt>Šifra modela</dt>
                      <dd>{lifecycleData.digitalIdentity?.modelSku || '—'}</dd>
                      <dt>Status autentičnosti</dt>
                      <dd>
                        <span className={`product-lifecycle-status product-lifecycle-status--${lifecycleData.digitalIdentity?.authenticityStatus || 'verified'}`}>
                          {lifecycleData.digitalIdentity?.authenticityStatus === 'verified' && 'Verifikovano'}
                          {lifecycleData.digitalIdentity?.authenticityStatus === 'pending' && 'U obradi'}
                          {lifecycleData.digitalIdentity?.authenticityStatus === 'unavailable' && 'Nije dostupno'}
                          {!['verified', 'pending', 'unavailable'].includes(lifecycleData.digitalIdentity?.authenticityStatus) && (lifecycleData.digitalIdentity?.authenticityStatus || 'Verifikovano')}
                        </span>
                      </dd>
                    </dl>
                    <p className="product-lifecycle-identity-note">
                      Proizvod je prošao sve interne faze pre nego što je ponuđen kupcu.
                    </p>
                  </section>
                  <section className="product-lifecycle-timeline-section">
                    <h3>Put proizvoda — od ideje do prodaje</h3>
                    {lifecycleData.events?.length > 0 ? (
                      <ol className="product-lifecycle-timeline">
                        {lifecycleData.events.map((event) => (
                          <li key={event.id} className="product-lifecycle-timeline-item">
                            <div className="product-lifecycle-timeline-marker" />
                            <div className="product-lifecycle-timeline-content">
                              <time dateTime={event.occurredAt} className="product-lifecycle-timeline-date">
                                {formatLifecycleDate(event.occurredAt)}
                              </time>
                              <p className="product-lifecycle-timeline-actor">
                                <span className="product-lifecycle-actor-label">Odgovoran: </span>
                                {event.actorRole || event.actorName ? (
                                  <>
                                    {event.actorRole && <span className="product-lifecycle-actor-role">{event.actorRole}</span>}
                                    {event.actorName && <span className="product-lifecycle-actor-name">{event.actorRole ? ` — ${event.actorName}` : event.actorName}</span>}
                                  </>
                                ) : (
                                  <span className="product-lifecycle-actor-empty">—</span>
                                )}
                              </p>
                              <strong className="product-lifecycle-timeline-label">{event.label}</strong>
                              {event.description && (
                                <p className="product-lifecycle-timeline-desc">{event.description}</p>
                              )}
                              {event.extraDetail && (
                                <p className="product-lifecycle-timeline-extra">{event.extraDetail}</p>
                              )}
                              {renderEventDetails(event.details)}
                              {event.verifiedOnBlockchain && (
                                <span className="product-lifecycle-badge">Verifikovano na blockchain-u</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="product-lifecycle-no-events">
                        Nema dostupne istorije životnog ciklusa za ovaj proizvod.
                      </p>
                    )}
                  </section>

                  {/* Linija života — horizontalni timeline sa skrolovanjem */}
                  {lifecycleData.events?.length > 0 && (
                    <section className="product-lifecycle-lifeline">
                      <h3>Linija života proizvoda</h3>
                      <p className="product-lifecycle-lifeline-hint">Pomerite u stranu da vidite sve korake</p>
                      <div className="product-lifecycle-lifeline-track">
                        <div className="product-lifecycle-lifeline-track-inner">
                          <div className="product-lifecycle-lifeline-line" aria-hidden="true" />
                          {lifecycleData.events.map((event) => (
                            <div key={`lifeline-${event.id}`} className="product-lifecycle-lifeline-dot-wrap">
                              <div className="product-lifecycle-lifeline-dot" title={event.label} />
                              <span className="product-lifecycle-lifeline-label">{event.label}</span>
                              <span className="product-lifecycle-lifeline-date">{formatLifecycleDate(event.occurredAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {isShippingOpen && (
        <>
          <button
            type="button"
            className="product-side-overlay"
            onClick={() => setIsShippingOpen(false)}
            aria-label="Zatvori informacije"
          />
          <aside className="product-side-panel" aria-label="Dostava i povraćaj">
            <div className="product-side-header">
              <h3>Dostava, zamena i povraćaj</h3>
              <button
                type="button"
                className="product-side-close"
                onClick={() => setIsShippingOpen(false)}
                aria-label="Zatvori"
              >
                ×
              </button>
            </div>

            <div className="product-side-section">
              <h4>Isporuka</h4>
              <p>Porudžbine se dostavljaju isključivo online.</p>
              <ul>
                <li>Dostava na kućnu adresu: 3-6 radnih dana.</li>
                <li>Kurirska služba kontaktira pre isporuke.</li>
                <li>Trošak dostave se obračunava na checkout-u.</li>
              </ul>
            </div>

            <div className="product-side-section">
              <h4>Zamene i povraćaji</h4>
              <p>Zamena ili povraćaj su mogući u roku od 14 dana.</p>
              <ul>
                <li>Proizvod mora biti nekorišćen i u originalnom pakovanju.</li>
                <li>Povraćaj novca ide na isti način plaćanja.</li>
                <li>Troškove povraćaja snosi kupac.</li>
              </ul>
            </div>

            <p className="product-side-note">
              Za dodatne informacije, kontaktirajte korisničku podršku.
            </p>
          </aside>
        </>
      )}
    </div>
  )
}

export default Product
