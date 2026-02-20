import { Router } from 'express'
import {
  createUserByAdmin,
  exchangeCodeForSession,
  getMe,
  login,
  logout,
  register,
  resetPassword,
  listUsersByAdmin,
  updateUserProfileByAdmin,
  deleteUserByAdmin
} from '../services/authService.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Logging middleware za debug
router.use('*', (req, res, next) => {
  if (req.path.startsWith('/blog')) {
    console.log('[AuthRouter] Request intercepted:', req.method, req.path)
  }
  next()
})

router.post('/auth/register', requireAuth, requireRole(['superadmin']), async (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body
    const result = await register(email, password, fullName, role)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post(
  '/auth/admin/create-user',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { email, password, fullName, full_name, role } = req.body
      const normalizedFullName = fullName || full_name
      const result = await createUserByAdmin(email, password, normalizedFullName, role)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/auth/admin/users',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const result = await listUsersByAdmin()
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
)

router.patch(
  '/auth/admin/users/:id',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { fullName, role } = req.body
      const result = await updateUserProfileByAdmin(id, { fullName, role })
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  '/auth/admin/users/:id',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const result = await deleteUserByAdmin(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
)

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await login(email, password)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { accessToken, password } = req.body
    const result = await resetPassword(accessToken, password)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/auth/exchange-code', async (req, res, next) => {
  try {
    const { code } = req.body
    const result = await exchangeCodeForSession(code)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/auth/logout', requireAuth, async (req, res, next) => {
  try {
    const result = await logout(req.accessToken)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const result = await getMe(req.accessToken)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/designs', requireAuth, requireRole(['modni_dizajner']), (req, res) => {
  res.json({ ok: true, area: 'designs' })
})

router.get('/supplies', requireAuth, requireRole(['dobavljac_materijala']), (req, res) => {
  res.json({ ok: true, area: 'supplies' })
})

router.get('/production', requireAuth, requireRole(['proizvodjac']), (req, res) => {
  res.json({ ok: true, area: 'production' })
})

router.get('/quality', requireAuth, requireRole(['tester_kvaliteta']), (req, res) => {
  res.json({ ok: true, area: 'quality' })
})

router.get('/logistics', requireAuth, requireRole(['distributer']), (req, res) => {
  res.json({ ok: true, area: 'logistics' })
})

export default router
