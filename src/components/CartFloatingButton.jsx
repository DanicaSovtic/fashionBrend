import React from 'react'
import { useCart } from '../context/CartContext'
import './Cart.css'

const CartFloatingButton = () => {
  const { totalItems, openCart } = useCart()

  return (
    <button
      type="button"
      className="cart-fab"
      onClick={openCart}
      aria-label="Otvori korpu"
    >
      <span>Korpa</span>
      <span className="cart-fab-count">{totalItems}</span>
    </button>
  )
}

export default CartFloatingButton
