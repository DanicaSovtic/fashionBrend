import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createOrder, getUserOrders, confirmBlockchainPayment } from '../services/orderService.js'
import { createAdminClient } from '../services/supabaseClient.js'
import {
  getOrCreateAccount,
  getMaxRedeemAmount,
  awardPointsForOrder,
  redeemPoints,
  REDEEM_VALUE_PER_POINT_RSD
} from '../services/loyaltyService.js'

const router = Router()
const adminSupabase = createAdminClient()

// Create new order
router.post('/orders', requireAuth, requireRole(['krajnji_korisnik']), async (req, res, next) => {
  try {
    const { deliveryInfo, paymentMethod, items, walletAddress, acquisitionSource, useLoyaltyPoints } = req.body

    if (!deliveryInfo || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Missing required fields: deliveryInfo, paymentMethod, and items are required' })
      return
    }

    const orderData = {
      ...deliveryInfo,
      paymentMethod,
      walletAddress,
      acquisitionSource: acquisitionSource || null
    }

    if (useLoyaltyPoints != null && Number(useLoyaltyPoints) > 0) {
      const account = await getOrCreateAccount(adminSupabase, req.user.id)
      const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * i.quantity, 0)
      const max = getMaxRedeemAmount(account.points_balance, subtotal)
      const actualPoints = Math.min(Number(useLoyaltyPoints), max.pointsUsed)
      if (actualPoints > 0) {
        const loyaltyDiscountRsd = actualPoints * REDEEM_VALUE_PER_POINT_RSD
        orderData.loyaltyDiscountRsd = loyaltyDiscountRsd
        orderData.loyaltyPointsUsed = actualPoints
      }
    }

    const order = await createOrder(adminSupabase, req.user.id, orderData, items)

    if (orderData.loyaltyPointsUsed > 0) {
      try {
        const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * i.quantity, 0)
        await redeemPoints(adminSupabase, {
          userId: req.user.id,
          orderId: order.id,
          pointsToRedeem: orderData.loyaltyPointsUsed,
          orderTotalRsd: subtotal
        })
      } catch (e) {
        console.error('[OrderRoute] Loyalty redeem failed:', e)
      }
    }

    if (order.status === 'ready_for_shipping' && order.user_id) {
      try {
        await awardPointsForOrder(adminSupabase, {
          orderId: order.id,
          userId: order.user_id,
          totalPrice: order.total_price
        })
      } catch (e) {
        console.error('[OrderRoute] Loyalty award failed:', e)
      }
    }

    res.status(201).json(order)
  } catch (error) {
    console.error('[OrderRoute] Error creating order:', error)
    next(error)
  }
})

// Confirm blockchain payment (MetaMask)
router.patch('/orders/:orderId/confirm-payment', requireAuth, requireRole(['krajnji_korisnik']), async (req, res, next) => {
  try {
    const { orderId } = req.params
    const { txHash, amountWei, blockNumber, contractAddress } = req.body

    const order = await confirmBlockchainPayment(
      adminSupabase,
      orderId,
      req.user.id,
      { txHash, amountWei, blockNumber, contractAddress }
    )

    if (order && order.status === 'ready_for_shipping' && order.user_id) {
      try {
        await awardPointsForOrder(adminSupabase, {
          orderId: order.id,
          userId: order.user_id,
          totalPrice: order.total_price
        })
      } catch (e) {
        console.error('[OrderRoute] Loyalty award on confirm-payment failed:', e)
      }
    }

    res.json(order)
  } catch (error) {
    console.error('[OrderRoute] Error confirming payment:', error)
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
