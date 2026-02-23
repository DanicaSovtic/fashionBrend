/**
 * Loyalty dashboard za Marketing asistenta
 * GET /api/marketing/loyalty/members - članovi iz loyalty_accounts + loyalty_events, imena iz profiles
 * GET /api/marketing/loyalty/config - konfig nivoa (za prikaz)
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createAdminClient } from '../services/supabaseClient.js'
import { getTierConfig } from '../services/loyaltyService.js'

const router = Router()
const adminSupabase = createAdminClient()

/** Dozvoli pristup ako je uloga marketing (bilo koji zapis) ili superadmin. Ne oslanja se na requireRole. */
async function requireMarketingOrSuperadmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, role')
      .eq('user_id', req.user.id)
      .single()

    if (error) {
      console.error('[MarketingLoyalty] Profile fetch error:', error.message, 'user_id=', req.user.id)
      return res.status(403).json({
        error: 'Profile not found',
        details: error.message,
        hint: 'Proverite da korisnik ima red u tabeli profiles (user_id iz auth.users).'
      })
    }

    const rawRole = profile?.role ?? ''
    const normalized = rawRole.trim().toLowerCase().replace(/\s+/g, '_')
    const isSuperadmin = normalized === 'superadmin'
    const isMarketing = normalized === 'marketing_asistent' || normalized.includes('marketing')

    if (isSuperadmin || isMarketing) {
      req.profile = profile
      console.log('[MarketingLoyalty] Access granted for user_id=', req.user.id, 'role=', rawRole)
      return next()
    }

    console.error('[MarketingLoyalty] Access denied. role=', rawRole, 'normalized=', normalized)
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Pristup samo za Marketing asistenta ili superadmin.',
      role: rawRole
    })
  } catch (err) {
    console.error('[MarketingLoyalty] requireMarketingOrSuperadmin error:', err)
    next(err)
  }
}

router.get('/members', requireAuth, requireMarketingOrSuperadmin, async (req, res, next) => {
  try {
    const { tier, limit = 500 } = req.query
    const since = new Date()
    since.setMonth(since.getMonth() - 12)
    const sinceIso = since.toISOString()
    const maxLimit = Math.min(Number(limit) || 500, 2000)

    // 1. Povuci sve iz loyalty tabela (izvor istine = baza loyalty podataka)
    const [accountsRes, eventsRes] = await Promise.all([
      adminSupabase.from('loyalty_accounts').select('user_id, tier, points_balance, updated_at'),
      adminSupabase.from('loyalty_events').select('user_id, points, created_at').eq('event_type', 'purchase').gte('created_at', sinceIso)
    ])

    if (accountsRes.error) {
      console.error('[MarketingLoyalty] loyalty_accounts error:', accountsRes.error)
      throw accountsRes.error
    }
    if (eventsRes.error) {
      console.error('[MarketingLoyalty] loyalty_events error:', eventsRes.error)
      throw eventsRes.error
    }

    const accounts = accountsRes.data || []
    const events = eventsRes.data || []
    console.log('[MarketingLoyalty] From DB: loyalty_accounts=', accounts.length, 'loyalty_events=', events.length)
    if (accounts.length > 0) {
      console.log('[MarketingLoyalty] First account sample:', JSON.stringify(accounts[0]))
    }

    const accountUserIds = accounts.map((a) => a.user_id)
    const eventUserIds = events.map((e) => e.user_id)
    let memberUserIds = [...new Set([...accountUserIds, ...eventUserIds])]

    // 2. Ako nema nijednog user_id iz loyalty tabela, povuci sve profile sa ulogom krajnji_korisnik
    if (memberUserIds.length === 0) {
      const roleRes = await adminSupabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'krajnji_korisnik')
        .limit(maxLimit)
      if (roleRes.error) {
        console.error('[MarketingLoyalty] profiles (by role) error:', roleRes.error)
      } else if (roleRes.data?.length) {
        memberUserIds = roleRes.data.map((p) => p.user_id)
      }
    }

    if (memberUserIds.length === 0) {
      const config = await getTierConfig(adminSupabase)
      return res.json({ members: [], config })
    }

    // 3. Dohvati imena iz profiles samo za te user_id (bez filtera po role)
    const profilesRes = await adminSupabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', memberUserIds)

    const nameByUser = new Map()
    if (!profilesRes.error && profilesRes.data?.length) {
      profilesRes.data.forEach((p) => nameByUser.set(p.user_id, p.full_name || '—'))
    }

    const accountsByUser = new Map(accounts.map((a) => [a.user_id, a]))
    const points12mByUser = new Map()
    events.forEach((e) => {
      const uid = e.user_id
      points12mByUser.set(uid, (points12mByUser.get(uid) || 0) + (e.points || 0))
    })

    const config = await getTierConfig(adminSupabase)
    const tierFromPoints12m = (points12m) => {
      let t = 'silver'
      for (const c of config) {
        if (points12m >= c.min_points_12m) t = c.tier
      }
      return t
    }

    let members = memberUserIds.map((uid) => {
      const acc = accountsByUser.get(uid)
      const points12m = points12mByUser.get(uid) ?? 0
      const computedTier = tierFromPoints12m(points12m)
      const nextTier = config.find((c) => c.min_points_12m > points12m)
      return {
        user_id: uid,
        full_name: nameByUser.get(uid) || '—',
        tier: acc?.tier ?? computedTier,
        points_balance: acc?.points_balance ?? 0,
        points_earned_12m: points12m,
        next_tier: nextTier ? nextTier.tier : null,
        points_to_next: nextTier ? nextTier.min_points_12m - points12m : 0,
        updated_at: acc?.updated_at ?? null
      }
    })

    if (tier && ['silver', 'gold', 'platinum'].includes(tier)) {
      members = members.filter((m) => m.tier === tier)
    }

    res.json({ members, config })
  } catch (error) {
    console.error('[MarketingLoyalty] Error GET members:', error)
    next(error)
  }
})

router.get('/config', requireAuth, requireMarketingOrSuperadmin, async (req, res, next) => {
  try {
    const config = await getTierConfig(adminSupabase)
    res.json(config)
  } catch (error) {
    console.error('[MarketingLoyalty] Error GET config:', error)
    next(error)
  }
})

export default router
