import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const FavoritesContext = createContext(null)
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

export const FavoritesProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const isKrajnjiKorisnik = profile?.role === 'krajnji_korisnik'

  // Load favorites from API when user logs in
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user || !isKrajnjiKorisnik) {
        setItems([])
        return
      }

      setLoading(true)
      try {
        const data = await apiFetch('/api/favorites')
        setItems(data || [])
      } catch (error) {
        console.error('Failed to load favorites', error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [user, isKrajnjiKorisnik])

  const addFavorite = async (product) => {
    if (!product?.id) {
      return
    }

    if (!user || !isKrajnjiKorisnik) {
      console.warn('User must be logged in as krajnji_korisnik to add favorites')
      return
    }

    try {
      await apiFetch('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id })
      })

      // Refresh favorites
      const favoritesData = await apiFetch('/api/favorites')
      setItems(favoritesData || [])
    } catch (error) {
      console.error('Failed to add favorite', error)
      throw error
    }
  }

  const removeFavorite = async (id) => {
    if (!user || !isKrajnjiKorisnik) {
      return
    }

    try {
      await apiFetch(`/api/favorites/${id}`, {
        method: 'DELETE'
      })

      // Refresh favorites
      const favoritesData = await apiFetch('/api/favorites')
      setItems(favoritesData || [])
    } catch (error) {
      console.error('Failed to remove favorite', error)
      throw error
    }
  }

  const isFavorite = (id) => items.some((item) => item.id === id)

  const value = useMemo(
    () => ({
      items,
      loading,
      addFavorite,
      removeFavorite,
      isFavorite
    }),
    [items, loading]
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
