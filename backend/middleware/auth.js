import { createAuthedClient, createAdminClient } from '../services/supabaseClient.js'

const getAccessToken = (req) => {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return null
  }
  return header.slice('Bearer '.length).trim()
}

export const requireAuth = async (req, res, next) => {
  try {
    console.log('[AuthMiddleware] requireAuth called for:', req.method, req.path, req.originalUrl)
    const accessToken = getAccessToken(req)
    
    if (!accessToken) {
      console.log('[AuthMiddleware] No access token found, returning 401')
      res.status(401).json({ error: 'Missing or invalid access token' })
      return
    }

    const supabase = createAuthedClient(accessToken)
    const { data, error } = await supabase.auth.getUser()
    
    if (error || !data?.user) {
      console.error('[AuthMiddleware] Invalid session:', error?.message)
      res.status(401).json({ error: 'Invalid session', details: error?.message })
      return
    }

    req.user = data.user
    req.accessToken = accessToken
    req.supabase = supabase
    next()
  } catch (error) {
    console.error('[AuthMiddleware] Exception:', error)
    next(error)
  }
}

export const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.supabase) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      if (!req.profile) {
        // Admin client za profil – zaobilazi RLS, osigurava tačan role check
        const adminSupabase = createAdminClient()
        console.log('[AuthMiddleware] requireRole - Fetching profile for user_id:', req.user.id)
        const { data, error } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('user_id', req.user.id)
          .single()

        if (error) {
          console.error('[AuthMiddleware] requireRole - Profile fetch error:', error)
          res.status(403).json({ error: 'Profile not found', details: error.message, user_id: req.user.id })
          return
        }

        console.log('[AuthMiddleware] requireRole - Profile found:', { user_id: data.user_id, full_name: data.full_name, role: data.role })
        req.profile = data
      }

      const userRole = req.profile?.role ?? null
      // Normalizuj ulogu - trim i lowercase za poređenje
      const normalizedUserRole = userRole ? userRole.trim().toLowerCase() : null
      const normalizedAllowedRoles = allowedRoles.map(r => r.trim().toLowerCase())
      
      console.log('[AuthMiddleware] requireRole - Checking role:', { 
        userRole, 
        normalizedUserRole,
        allowedRoles, 
        normalizedAllowedRoles,
        match: normalizedAllowedRoles.includes(normalizedUserRole)
      })
      
      if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
        if (userRole === 'superadmin') {
          console.log('[AuthMiddleware] requireRole - Superadmin access granted')
          next()
          return
        }
        console.log('[AuthMiddleware] requireRole - Access denied:', { userRole, allowedRoles })
        res.status(403).json({ 
          error: 'Forbidden',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}, but user has role: ${userRole === null ? '(null)' : userRole}`,
          userRole,
          normalizedUserRole,
          allowedRoles,
          normalizedAllowedRoles
        })
        return
      }
      
      console.log('[AuthMiddleware] requireRole - Access granted')

      next()
    } catch (error) {
      console.error('[AuthMiddleware] requireRole exception:', error)
      next(error)
    }
  }
}
