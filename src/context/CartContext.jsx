import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'piccola_cart'

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item) => {
            if (item.key) {
              return item
            }
            const sizeValue = item.size || ''
            return {
              ...item,
              size: sizeValue,
              key: buildItemKey(item.id, sizeValue)
            }
          })
          setItems(normalized)
        }
      } catch (error) {
        console.error('Failed to parse cart storage', error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const buildItemKey = (id, size) => `${id}::${size || 'na'}`

  const addItem = (product, size) => {
    if (!product?.id) {
      return
    }
    const itemKey = buildItemKey(product.id, size)
    setItems((prev) => {
      const existing = prev.find((item) => item.key === itemKey)
      if (existing) {
        return prev.map((item) =>
          item.key === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          key: itemKey,
          id: product.id,
          title: product.title,
          price: Number(product.price) || 0,
          image_url: product.image_url || '',
          size: size || '',
          quantity: 1
        }
      ]
    })
  }

  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  const updateQuantity = (key, delta) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) {
          return item
        }
        const nextQuantity = Math.max(1, item.quantity + delta)
        return { ...item, quantity: nextQuantity }
      })
    )
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

  const value = useMemo(
    () => ({
      items,
      total,
      totalItems,
      isCartOpen,
      addItem,
      removeItem,
      updateQuantity,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      toggleCart: () => setIsCartOpen((prev) => !prev)
    }),
    [items, total, totalItems, isCartOpen]
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
