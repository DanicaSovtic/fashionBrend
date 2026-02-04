import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './Cart.css'

const CartDrawer = () => {
  const {
    items,
    total,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem
  } = useCart()

  useEffect(() => {
    if (!isCartOpen) {
      return undefined
    }
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isCartOpen])

  const formatPrice = (price) =>
    new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0
    }).format(price)

  if (!isCartOpen) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className="cart-overlay"
        onClick={closeCart}
        aria-label="Zatvori korpu"
      />
      <aside className="cart-drawer" aria-label="Korpa">
        <div className="cart-header">
          <h3>Korpa</h3>
          <button
            type="button"
            className="cart-close"
            onClick={closeCart}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Korpa je prazna.</p>
          </div>
        ) : (
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.key} className="cart-item">
                <div className="cart-item-image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} />
                  ) : (
                    <div className="cart-item-placeholder">Nema slike</div>
                  )}
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-header">
                    <div>
                      <h4>{item.title}</h4>
                      <p className="cart-item-price">
                        {formatPrice(item.price)}
                      </p>
                      {item.size ? (
                        <p className="cart-item-meta">Veličina: {item.size}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removeItem(item.key)}
                      aria-label="Ukloni proizvod"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="cart-quantity">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, -1)}
                      aria-label="Smanji količinu"
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, 1)}
                      aria-label="Povećaj količinu"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cart-footer">
          <div className="cart-total">
            <span>Ukupno</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <Link
            to="/cart"
            onClick={closeCart}
            className={`cart-checkout ${items.length === 0 ? 'disabled' : ''}`}
            aria-disabled={items.length === 0}
          >
            Nastavi na plaćanje
          </Link>
        </div>
      </aside>
    </>
  )
}

export default CartDrawer
