import { createAuthedClient } from '../services/supabaseClient.js'

const getAccessToken = (req) => {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return null
  }
  return header.slice('Bearer '.length).trim()
}

export const requireAuth = async (req, res, next) => {
  try {
    const accessToken = getAccessToken(req)
    
    if (!accessToken) {
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
        const { data, error } = await req.supabase
          .from('profiles')
          .select('*')
          .eq('user_id', req.user.id)
          .single()

        if (error) {
          res.status(403).json({ error: 'Profile not found', details: error.message })
          return
        }

        req.profile = data
      }

      if (!allowedRoles.includes(req.profile.role)) {
        if (req.profile.role === 'superadmin') {
          next()
          return
        }
        res.status(403).json({ 
          error: 'Forbidden',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}, but user has role: ${req.profile.role}`
        })
        return
      }

      next()
    } catch (error) {
      console.error('[AuthMiddleware] requireRole exception:', error)
      next(error)
    }
  }
}
