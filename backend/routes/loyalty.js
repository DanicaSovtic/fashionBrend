/**
 * Loyalty API za krajnjeg kupca (krajnji_korisnik)
 * GET /api/loyalty/me - moj nivo i poeni
 * GET /api/loyalty/redeem-preview?orderTotal= - koliko mogu da iskoristim
 */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createAdminClient } from '../services/supabaseClient.js'
import {
  getOrCreateAccount,
  getMaxRedeemAmount,
  getTierConfig,
  MIN_POINTS_TO_REDEEM,
  MAX_REDEEM_PERCENT,
  REDEEM_VALUE_PER_POINT_RSD
} from '../services/loyaltyService.js'

const router = Router()
const adminSupabase = createAdminClient()

router.get('/me', requireAuth, requireRole(['krajnji_korisnik']), async (req, res, next) => {
  try {
    const account = await getOrCreateAccount(adminSupabase, req.user.id)
    const config = await getTierConfig(adminSupabase)
    const nextTier = config.find(c => c.min_points_12m > (account.points_earned_12m || 0))
    res.json({
      tier: account.tier,
      points_balance: account.points_balance,
      points_earned_12m: account.points_earned_12m ?? 0,
      next_tier: nextTier ? { tier: nextTier.tier, min_points_12m: nextTier.min_points_12m } : null,
      config: config.map(c => ({ tier: c.tier, min_points_12m: c.min_points_12m, multiplier: c.multiplier }))
    })
  } catch (error) {
    console.error('[Loyalty] Error GET /me:', error)
    next(error)
  }
})

router.get('/redeem-preview', requireAuth, requireRole(['krajnji_korisnik']), async (req, res, next) => {
  try {
    const orderTotal = Number(req.query.orderTotal) || 0
    const account = await getOrCreateAccount(adminSupabase, req.user.id)
    const max = getMaxRedeemAmount(account.points_balance, orderTotal)
    res.json({
      points_balance: account.points_balance,
      min_points_to_redeem: MIN_POINTS_TO_REDEEM,
      max_redeem_percent: MAX_REDEEM_PERCENT,
      value_per_point_rsd: REDEEM_VALUE_PER_POINT_RSD,
      max_discount_rsd: max.discountRsd,
      max_points_usable: max.pointsUsed
    })
  } catch (error) {
    console.error('[Loyalty] Error GET redeem-preview:', error)
    next(error)
  }
})

export default router
