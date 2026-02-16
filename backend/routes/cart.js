import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createAdminClient } from '../services/supabaseClient.js'
import {
  getCartItems,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart
} from '../services/cartService.js'

const router = Router()

// All routes require authentication and krajnji_korisnik role
router.use((req, res, next) => {
  // Ne presreći blog, tester, designer rute – one imaju svoje rute
  if (req.path.startsWith('/blog') || req.path.startsWith('/tester') || req.path.startsWith('/designer')) {
    return next()
  }
  next()
})
router.use((req, res, next) => {
  if (req.path.startsWith('/blog') || req.path.startsWith('/tester') || req.path.startsWith('/designer')) {
    return next()
  }
  requireAuth(req, res, next)
})
router.use((req, res, next) => {
  if (req.path.startsWith('/blog') || req.path.startsWith('/tester') || req.path.startsWith('/designer')) {
    return next()
  }
  requireRole(['krajnji_korisnik'])(req, res, next)
})

// Use admin client to bypass RLS (we already check auth/role in middleware)
const adminSupabase = createAdminClient()

// GET /api/cart - Get all cart items for authenticated user
router.get('/cart', async (req, res, next) => {
  try {
    const items = await getCartItems(adminSupabase, req.user.id)
    res.json(items)
  } catch (error) {
    next(error)
  }
})

// POST /api/cart - Add item to cart
router.post('/cart', async (req, res, next) => {
  try {
    const { product_id, quantity = 1, size = null } = req.body

    if (!product_id) {
      res.status(400).json({ error: 'product_id is required' })
      return
    }

    const item = await addCartItem(
      adminSupabase,
      req.user.id,
      product_id,
      quantity,
      size
    )
    res.status(201).json(item)
  } catch (error) {
    next(error)
  }
})

// PUT /api/cart/:itemId - Update cart item quantity
router.put('/cart/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params
    const { quantity } = req.body

    if (typeof quantity !== 'number' || quantity < 1) {
      res.status(400).json({ error: 'quantity must be a number >= 1' })
      return
    }

    const item = await updateCartItemQuantity(
      adminSupabase,
      req.user.id,
      itemId,
      quantity
    )
    res.json(item)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/cart/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params
    await removeCartItem(adminSupabase, req.user.id, itemId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// DELETE /api/cart - Clear entire cart
router.delete('/cart', async (req, res, next) => {
  try {
    await clearCart(adminSupabase, req.user.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
