import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createOrder, getUserOrders } from '../services/orderService.js'
import { createAdminClient } from '../services/supabaseClient.js'

const router = Router()

// Use admin client to bypass RLS
const adminSupabase = createAdminClient()

// Create new order
router.post('/orders', requireAuth, requireRole(['krajnji_korisnik']), async (req, res, next) => {
  try {
    const { deliveryInfo, paymentMethod, items } = req.body

    if (!deliveryInfo || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Missing required fields: deliveryInfo, paymentMethod, and items are required' })
      return
    }

    const order = await createOrder(
      adminSupabase,
      req.user.id,
      {
        ...deliveryInfo,
        paymentMethod
      },
      items
    )

    res.status(201).json(order)
  } catch (error) {
    console.error('[OrderRoute] Error creating order:', error)
    next(error)
  }
})

// Get user orders
router.get('/orders', requireAuth, requireRole(['krajnji_korisnik']), async (req, res, next) => {
  try {
    const orders = await getUserOrders(adminSupabase, req.user.id)
    res.json(orders)
  } catch (error) {
    console.error('[OrderRoute] Error fetching orders:', error)
    next(error)
  }
})

export default router
