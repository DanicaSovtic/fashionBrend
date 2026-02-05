import { supabase, createAdminClient, createAuthedClient } from './supabaseClient.js'
import { sendUserInviteEmail } from './emailService.js'

const ALLOWED_ROLES = new Set([
  'superadmin',
  'modni_dizajner',
  'dobavljac',
  'proizvodjac',
  'tester_kvaliteta',
  'distributer',
  'krajnji_korisnik'
])

const ROLE_LABELS = {
  superadmin: 'Superadmin',
  modni_dizajner: 'Modni dizajner',
  dobavljac: 'Dobavljac',
  proizvodjac: 'Proizvodjac',
  tester_kvaliteta: 'Tester kvaliteta',
  distributer: 'Distributer / logistika',
  krajnji_korisnik: 'Krajnji korisnik'
}

const frontendUrl = process.env.FRONTEND_URL
const tokenValidHours = Number(process.env.RESET_TOKEN_VALID_HOURS || 24)

const assertRole = (role) => {
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Invalid role')
  }
}

export const register = async (email, password, fullName, role) => {
  if (!email || !password || !fullName || !role) {
    throw new Error('Missing required fields')
  }
  assertRole(role)

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    throw error
  }

  const session = data.session
  if (!session?.access_token) {
    throw new Error('Email confirmation required before profile creation')
  }

  const authed = createAuthedClient(session.access_token)
  const { data: profile, error: profileError } = await authed
    .from('profiles')
    .insert({
      user_id: data.user.id,
      full_name: fullName,
      role
    })
    .select('*')
    .single()

  if (profileError) {
    throw profileError
  }

  return { success: true, user: data.user, session, profile }
}

export const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Missing email or password')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw error
  }

  const authed = createAuthedClient(data.session.access_token)
  const { data: profile, error: profileError } = await authed
    .from('profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  return { session: data.session, user: data.user, profile }
}

export const logout = async (accessToken) => {
  const authed = createAuthedClient(accessToken)
  const { error } = await authed.auth.signOut()
  if (error) {
    throw error
  }
  return { success: true }
}

export const getMe = async (accessToken) => {
  const authed = createAuthedClient(accessToken)
  const { data: userData, error } = await authed.auth.getUser()
  if (error) {
    throw error
  }

  const { data: profile, error: profileError } = await authed
    .from('profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  return { user: userData.user, profile }
}

export const createUserByAdmin = async (email, password, fullName, role) => {
  const missing = []
  if (!email) missing.push('email')
  if (!password) missing.push('password')
  if (!fullName) missing.push('fullName')
  if (!role) missing.push('role')
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }
  assertRole(role)

  if (!frontendUrl) {
    throw new Error('Missing FRONTEND_URL environment variable.')
  }

  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (userError) {
    throw userError
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .insert({
      user_id: userData.user.id,
      full_name: fullName,
      role
    })
    .select('*')
    .single()

  if (profileError) {
    throw profileError
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${frontendUrl}/reset-password`
    }
  })

  if (linkError) {
    throw linkError
  }

  const actionLink =
    linkData?.action_link ||
    linkData?.properties?.action_link ||
    linkData?.actionLink ||
    linkData?.data?.action_link ||
    linkData?.data?.properties?.action_link

  if (!actionLink) {
    throw new Error('Missing reset password link from Supabase.')
  }

  const emailInfo = await sendUserInviteEmail({
    to: email,
    fullName,
    roleDisplay: ROLE_LABELS[role] || role,
    setPasswordLink: actionLink,
    tokenValidHours
  })

  return {
    user: userData.user,
    profile,
    email: {
      messageId: emailInfo?.messageId,
      response: emailInfo?.response,
      accepted: emailInfo?.accepted,
      rejected: emailInfo?.rejected
    }
  }
}

export const resetPassword = async (accessToken, newPassword) => {
  if (!accessToken || !newPassword) {
    throw new Error('Missing accessToken or password')
  }

  const authed = createAuthedClient(accessToken)
  const { data, error } = await authed.auth.updateUser({ password: newPassword })
  if (error) {
    throw error
  }
  return { user: data.user }
}

export const exchangeCodeForSession = async (code) => {
  if (!code) {
    throw new Error('Missing code')
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    throw error
  }

  return { session: data.session }
}

export const listUsersByAdmin = async ({ page = 1, perPage = 200 } = {}) => {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
  if (error) {
    throw error
  }

  const users = data?.users || []
  if (users.length === 0) {
    return { users: [] }
  }

  const userIds = users.map((user) => user.id)
  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('user_id, full_name, role, created_at')
    .in('user_id', userIds)

  if (profileError) {
    throw profileError
  }

  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]))
  const merged = users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    profile: profileMap.get(user.id) || null
  }))

  return { users: merged }
}

export const updateUserProfileByAdmin = async (userId, { fullName, role }) => {
  if (!userId) {
    throw new Error('Missing userId')
  }
  if (!fullName && !role) {
    throw new Error('Nothing to update')
  }
  if (role) {
    assertRole(role)
  }

  const admin = createAdminClient()
  const payload = {}
  if (fullName) {
    payload.full_name = fullName
  }
  if (role) {
    payload.role = role
  }

  const { data, error } = await admin
    .from('profiles')
    .update(payload)
    .eq('user_id', userId)
    .select('user_id, full_name, role')
    .single()

  if (error) {
    throw error
  }

  return { profile: data }
}

export const deleteUserByAdmin = async (userId) => {
  if (!userId) {
    throw new Error('Missing userId')
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    throw error
  }
  return { success: true }
}
