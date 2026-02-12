import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createAdminClient } from '../services/supabaseClient.js'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite
} from '../services/favoritesService.js'

const router = Router()

// All routes require authentication and krajnji_korisnik role
router.use((req, res, next) => {
  console.log('[FavoritesRouter] Middleware called for:', req.method, req.path)
  // Ne presreći blog rute
  if (req.path.startsWith('/blog')) {
    console.log('[FavoritesRouter] Skipping blog route, passing to next router')
    return next()
  }
  next()
})
router.use((req, res, next) => {
  // Ne presreći blog rute
  if (req.path.startsWith('/blog')) {
    return next()
  }
  requireAuth(req, res, next)
})
router.use((req, res, next) => {
  // Ne presreći blog rute
  if (req.path.startsWith('/blog')) {
    return next()
  }
  requireRole(['krajnji_korisnik'])(req, res, next)
})

// Use admin client to bypass RLS (we already check auth/role in middleware)
const adminSupabase = createAdminClient()

// GET /api/favorites - Get all favorites for authenticated user
router.get('/favorites', async (req, res, next) => {
  try {
    const favorites = await getFavorites(adminSupabase, req.user.id)
    res.json(favorites)
  } catch (error) {
    next(error)
  }
})

// POST /api/favorites - Add product to favorites
router.post('/favorites', async (req, res, next) => {
  try {
    const { product_id } = req.body

    if (!product_id) {
      res.status(400).json({ error: 'product_id is required' })
      return
    }

    const favorite = await addFavorite(adminSupabase, req.user.id, product_id)
    res.status(201).json(favorite)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/favorites/:productId - Remove product from favorites
router.delete('/favorites/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    await removeFavorite(adminSupabase, req.user.id, productId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// GET /api/favorites/check/:productId - Check if product is in favorites
router.get('/favorites/check/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    const favorite = await isFavorite(adminSupabase, req.user.id, productId)
    res.json({ isFavorite: favorite })
  } catch (error) {
    next(error)
  }
})

export default router
