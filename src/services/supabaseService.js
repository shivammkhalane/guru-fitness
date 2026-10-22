import { createClient } from '@supabase/supabase-js'

const normalizeSupabaseProjectUrl = (value) => {
  const url = new URL(value)
  url.pathname = url.pathname.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

const createSupabaseClient = () => {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!configuredUrl || !key || configuredUrl.includes('your-project') || configuredUrl.includes('replace')) {
    return null
  }

  const url = normalizeSupabaseProjectUrl(configuredUrl)
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createSupabaseClient()
export const isSupabaseReady = Boolean(supabase)

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
}

export const signInWithEmail = async (email, password) => {
  assertSupabase()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signUpWithEmail = async (email, password, metadata = {}) => {
  assertSupabase()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentSession = async () => {
  if (!supabase) return { data: { session: null }, error: null }
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

export const getCurrentUser = async () => {
  if (!supabase) return { data: { user: null }, error: null }
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

export const ensureGymSetup = async ({
  name = 'Guru Fitness Health Club',
} = {}) => {
  assertSupabase()

  const slug = 'guru-fitness-health-club'

  const { data: existingGym, error: selectError } = await supabase
    .from('gyms')
    .select('id, slug, name, city, state, country, currency, timezone')
    .eq('slug', slug)
    .maybeSingle()

  if (selectError) throw selectError
  if (existingGym) return existingGym
  throw new Error(`Gym "${name}" is not provisioned. Ask a Supabase administrator to create and authorize the gym before using the app.`)
}

export const createAuditLog = async (action, entityName, entityId = null, metadata = {}) => {
  if (!supabase) return null

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData?.user?.id ?? null
  const { data: profile, error: profileError } = userId
    ? await supabase.from('profiles').select('gym_id').eq('id', userId).maybeSingle()
    : { data: null, error: null }

  if (profileError) throw profileError
  if (!userId || !profile?.gym_id) {
    throw new Error('An authenticated gym profile is required before creating an audit log.')
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      gym_id: profile.gym_id,
      action,
      entity_name: entityName,
      entity_id: entityId,
      actor_id: userId,
      metadata,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export const signInWithGoogle = async () => {
  assertSupabase()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
  if (error) throw error
  return data
}

export const signUpMember = async (email, password, claimToken) => {
  void email
  void password
  void claimToken
  throw new Error('Member account claiming is unavailable until a secure server-side claim flow is implemented.')
}

export const validateMemberAccess = async () => {
  if (!supabase) return null

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData?.user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, members(*)')
    .eq('id', userData.user.id)
    .single()

  if (profileError) throw profileError
  if (!profile || profile.role !== 'member') return null

  return profile
}

export const linkGoogleAccountToMember = async (claimToken) => {
  void claimToken
  throw new Error('Member account claiming is unavailable until a secure server-side claim flow is implemented.')
}
