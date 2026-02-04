import React from 'react'
import { Link } from 'react-router-dom'
import './Cart.css'

const FavoritesFloatingButton = () => {
  return (
    <Link to="/favorites" className="favorites-fab" aria-label="Favoriti">
      ❤
    </Link>
  )
}

export default FavoritesFloatingButton
