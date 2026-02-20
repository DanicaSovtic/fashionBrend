import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getAccountantTransactions } from '../services/accountantService.js'

const router = Router()

router.get('/accountant/transactions', requireAuth, requireRole(['racunovodja']), async (req, res, next) => {
  try {
    const { status, payment_method, date_from, date_to } = req.query
    const filters = {
      status,
      payment_method,
      date_from,
      date_to
    }
    const result = await getAccountantTransactions(filters)
    res.json(result)
  } catch (error) {
    console.error('[AccountantRoute] Error fetching transactions:', error)
    next(error)
  }
})

export default router
