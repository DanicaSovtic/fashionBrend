import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const CartContext = createContext(null)
const AUTH_STORAGE_KEY = 'auth_access_token'

const getStoredToken = () => localStorage.getItem(AUTH_STORAGE_KEY)

const apiFetch = async (path, options = {}) => {
  const token = getStoredToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  }

  const response = await fetch(path, {
    ...options,
    headers
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error || 'Request failed'
    throw new Error(message)
  }

  return data
}

const buildItemKey = (id, size) => `${id}::${size || 'na'}`

export const CartProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isKrajnjiKorisnik = profile?.role === 'krajnji_korisnik'

  // Load cart items from API when user logs in
  useEffect(() => {
    const loadCartItems = async () => {
      if (!user || !isKrajnjiKorisnik) {
        setItems([])
        return
      }

      setLoading(true)
      try {
        const data = await apiFetch('/api/cart')
        setItems(data || [])
      } catch (error) {
        console.error('Failed to load cart items', error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    loadCartItems()
  }, [user, isKrajnjiKorisnik])

  const addItem = async (product, size) => {
    if (!product?.id) {
      return
    }

    if (!user || !isKrajnjiKorisnik) {
      // If not logged in as krajnji_korisnik, show error or redirect to login
      console.warn('User must be logged in as krajnji_korisnik to add items to cart')
      return
    }

    try {
      const data = await apiFetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
          size: size || null
        })
      })

      // Refresh cart items
      const cartData = await apiFetch('/api/cart')
      setItems(cartData || [])
    } catch (error) {
      console.error('Failed to add item to cart', error)
      throw error
    }
  }

  const removeItem = async (key) => {
    if (!user || !isKrajnjiKorisnik) {
      return
    }

    const item = items.find((i) => i.key === key)
    if (!item || !item.id) {
      return
    }

    try {
      await apiFetch(`/api/cart/${item.id}`, {
        method: 'DELETE'
      })

      // Refresh cart items
      const cartData = await apiFetch('/api/cart')
      setItems(cartData || [])
    } catch (error) {
      console.error('Failed to remove item from cart', error)
      throw error
    }
  }

  const updateQuantity = async (key, delta) => {
    if (!user || !isKrajnjiKorisnik) {
      return
    }

    const item = items.find((i) => i.key === key)
    if (!item || !item.id) {
      return
    }

    const newQuantity = Math.max(1, item.quantity + delta)

    try {
      await apiFetch(`/api/cart/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: newQuantity })
      })

      // Refresh cart items
      const cartData = await apiFetch('/api/cart')
      setItems(cartData || [])
    } catch (error) {
      console.error('Failed to update cart item quantity', error)
      throw error
    }
  }

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
        0
      ),
    [items]
  )

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const clearCart = async () => {
    if (!user || !isKrajnjiKorisnik) {
      return
    }

    try {
      await apiFetch('/api/cart', {
        method: 'DELETE'
      })

      // Refresh cart items (should be empty now)
      const cartData = await apiFetch('/api/cart')
      setItems(cartData || [])
    } catch (error) {
      console.error('Failed to clear cart', error)
      throw error
    }
  }

  const value = useMemo(
    () => ({
      items,
      total,
      totalItems,
      isCartOpen,
      loading,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      toggleCart: () => setIsCartOpen((prev) => !prev)
    }),
    [items, total, totalItems, isCartOpen, loading]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
