import React from 'react'
import { useCart } from '../context/CartContext'
import Navbar from './Navbar'
import './Cart.css'

const CartPage = () => {
  const { items, total, updateQuantity, removeItem } = useCart()

  const formatPrice = (price) =>
    new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0
    }).format(price)

  return (
    <div className="cart-page">
      <Navbar />

      <div className="cart-page-content">
        <div className="cart-page-container">
          <div className="cart-page-main">
            <h1>Moja korpa</h1>

            {items.length === 0 ? (
              <div className="cart-empty">Korpa je prazna.</div>
            ) : (
              <div className="cart-page-items">
                {items.map((item) => (
                  <div key={item.key} className="cart-page-item">
                    <div className="cart-item-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} />
                      ) : (
                        <div className="cart-item-placeholder">Nema slike</div>
                      )}
                    </div>
                    <div className="cart-page-info">
                      <div className="cart-page-info-header">
                        <div>
                          <h3>{item.title}</h3>
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
                        >
                          Ukloni
                        </button>
                      </div>
                      <div className="cart-quantity">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, -1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="cart-summary">
            <h2>Sažetak narudžbine</h2>
            <div className="cart-summary-row">
              <span>Ukupno</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <button
              type="button"
              className="cart-checkout-button"
              disabled={items.length === 0}
            >
              Nastavi na plaćanje
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default CartPage
