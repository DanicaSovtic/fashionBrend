import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getLogisticsDashboard } from '../services/logisticsService.js'

const router = Router()

router.get('/logistics/dashboard', requireAuth, requireRole(['distributer']), async (req, res, next) => {
  try {
    const payload = await getLogisticsDashboard(req.supabase)
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

export default router
