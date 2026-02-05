import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  addLogisticsIssueComment,
  getLogisticsDashboard,
  getLogisticsIssues,
  updateLogisticsIssue
} from '../services/logisticsService.js'

const router = Router()

router.get('/logistics/dashboard', requireAuth, requireRole(['distributer']), async (req, res, next) => {
  try {
    const payload = await getLogisticsDashboard(req.supabase)
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.get('/logistics/issues', requireAuth, requireRole(['distributer']), async (req, res, next) => {
  try {
    const { type, status, from, to } = req.query
    const issues = await getLogisticsIssues(req.supabase, {
      issue_type: type,
      status,
      from,
      to
    })
    res.json({ issues })
  } catch (error) {
    next(error)
  }
})

router.patch('/logistics/issues/:id', requireAuth, requireRole(['distributer']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, resolutionAction, resolvedAt, note } = req.body
    const payload = {
      ...(status ? { status } : {}),
      ...(resolutionAction ? { resolution_action: resolutionAction } : {}),
      ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
      ...(note ? { note } : {}),
      last_updated_by: req.profile?.full_name || req.user?.email || 'system'
    }
    const updated = await updateLogisticsIssue(req.supabase, id, payload)
    res.json({ issue: updated })
  } catch (error) {
    next(error)
  }
})

router.post(
  '/logistics/issues/:id/comments',
  requireAuth,
  requireRole(['distributer']),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { body } = req.body
      if (!body || !body.trim()) {
        res.status(400).json({ error: 'Comment body is required.' })
        return
      }
      const comment = await addLogisticsIssueComment(req.supabase, id, {
        body: body.trim(),
        author: req.profile?.full_name || req.user?.email || 'distributer'
      })
      res.json({ comment })
    } catch (error) {
      next(error)
    }
  }
)

export default router
