import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getMarketingAnalytics } from '../services/analyticsService.js'

const router = Router()

router.get(
  '/analytics/dashboard',
  requireAuth,
  requireRole(['marketing_asistent', 'superadmin']),
  async (req, res, next) => {
    try {
      const { date_from, date_to } = req.query
      const result = await getMarketingAnalytics({ date_from, date_to })
      res.json(result)
    } catch (error) {
      console.error('[AnalyticsRoute] Error:', error)
      next(error)
    }
  }
)

export default router
