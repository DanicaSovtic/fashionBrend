import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const FavoritesContext = createContext(null)
const STORAGE_KEY = 'piccola_favorites'

export const FavoritesProvider = ({ children }) => {
  const [items, setItems] = useState([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      } catch (error) {
        console.error('Failed to parse favorites storage', error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addFavorite = (product) => {
    if (!product?.id) {
      return
    }
    setItems((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        return prev
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: Number(product.price) || 0,
          image_url: product.image_url || ''
        }
      ]
    })
  }

  const removeFavorite = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const isFavorite = (id) => items.some((item) => item.id === id)

  const value = useMemo(
    () => ({
      items,
      addFavorite,
      removeFavorite,
      isFavorite
    }),
    [items]
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider')
  }
  return context
}
