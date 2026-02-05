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
      res.status(401).json({ error: 'Invalid session' })
      return
    }

    req.user = data.user
    req.accessToken = accessToken
    req.supabase = supabase
    next()
  } catch (error) {
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
          res.status(403).json({ error: 'Profile not found' })
          return
        }

        req.profile = data
      }

      if (!allowedRoles.includes(req.profile.role)) {
        if (req.profile.role === 'superadmin') {
          next()
          return
        }
        res.status(403).json({ error: 'Forbidden' })
        return
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
