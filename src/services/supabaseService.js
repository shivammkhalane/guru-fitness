import { createClient } from '@supabase/supabase-js'

const createSupabaseClient = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('your-project') || url.includes('replace')) {
    return null
  }

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
  city = 'Dhule',
  state = 'Maharashtra',
  country = 'India',
  currency = 'INR',
  timezone = 'Asia/Kolkata',
} = {}) => {
  assertSupabase()

  const slug = 'guru-fitness-health-club'

  const { data: existingGym, error: selectError } = await supabase
    .from('gyms')
    .select('id, slug, name, city, state, country, currency, timezone')
    .eq('slug', slug)
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') throw selectError
  if (existingGym) return existingGym

  const { data, error } = await supabase
    .from('gyms')
    .insert({
      name,
      slug,
      city,
      state,
      country,
      currency,
      timezone,
    })
    .select('id, slug, name, city, state, country, currency, timezone')
    .single()

  if (error) throw error
  return data
}

export const ensureCurrentUserProfile = async ({
  fullName,
  role = 'owner',
  phone = null,
  avatarUrl = null,
} = {}) => {
  assertSupabase()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData?.user) throw new Error('No active authenticated user was found.')

  const user = userData.user
  const gym = await ensureGymSetup({
    name: 'Guru Fitness Health Club',
    city: 'Dhule',
    state: 'Maharashtra',
    country: 'India',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  })

  const profilePayload = {
    id: user.id,
    gym_id: gym.id,
    full_name: fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Gym Owner',
    role,
    phone: phone || user.user_metadata?.phone || null,
    avatar_url: avatarUrl || user.user_metadata?.avatar_url || null,
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') throw selectError

  let profile
  if (existingProfile) {
    // Never overwrite an existing role on sign-in. The `role` field is only
    // applied when a profile is first created — otherwise every login would
    // re-assert `role: 'owner'` and escalate staff/member accounts.
    const updatePayload = {
      id: profilePayload.id,
      gym_id: profilePayload.gym_id,
      full_name: profilePayload.full_name,
      phone: profilePayload.phone,
      avatar_url: profilePayload.avatar_url,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) throw error
    profile = data
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profilePayload)
      .select('*')
      .single()

    if (error) throw error
    profile = data
  }

  const { data: staffRow, error: staffSelectError } = await supabase
    .from('staff')
    .select('*')
    .eq('gym_id', gym.id)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (staffSelectError && staffSelectError.code !== 'PGRST116') throw staffSelectError

  if (!staffRow) {
    const { data: newStaff, error: staffError } = await supabase
      .from('staff')
      .insert({
        gym_id: gym.id,
        profile_id: user.id,
        is_active: true,
        hire_date: new Date().toISOString().slice(0, 10),
      })
      .select('*')
      .single()

    if (staffError) throw staffError
    return { gym, profile, staff: newStaff }
  }

  return { gym, profile, staff: staffRow }
}

export const createAuditLog = async (action, entityName, entityId = null, metadata = {}) => {
  if (!supabase) return null

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id ?? null
  const { data: profile, error: profileError } = userId
    ? await supabase.from('profiles').select('gym_id').eq('id', userId).maybeSingle()
    : { data: null, error: null }

  if (profileError) throw profileError
  const gym = profile?.gym_id ? null : await ensureGymSetup()

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      gym_id: profile?.gym_id || gym.id,
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
  assertSupabase()

  // Validate claim token
  const { data: memberRow, error: memberError } = await supabase
    .from('members')
    .select('id, full_name, phone, photo_url, gym_id, member_code, claimed_at')
    .eq('claim_token', claimToken)
    .maybeSingle()

  if (memberError) throw memberError
  if (!memberRow) throw new Error('Invalid claim token. Please contact gym staff.')
  if (memberRow.claimed_at) throw new Error('This claim token has already been used. Please contact gym staff.')

  // Check if member already has auth account
  if (memberRow.auth_user_id) {
    throw new Error('This member already has an account. Please sign in with your existing credentials.')
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'member', memberCode: memberRow.member_code } },
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('Failed to create account')

  const gym = await ensureGymSetup()

  // Create member profile
  const profilePayload = {
    id: authData.user.id,
    gym_id: gym.id,
    full_name: memberRow.full_name,
    role: 'member',
    phone: memberRow.phone,
    avatar_url: memberRow.photo_url,
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert(profilePayload)
    .select('*')
    .single()

  if (profileError) throw profileError

  // Link auth user to member record
  const { error: updateError } = await supabase
    .from('members')
    .update({
      auth_user_id: authData.user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', memberRow.id)

  if (updateError) throw updateError

  // Log audit entry
  try {
    await createAuditLog('member_account_created', 'members', memberRow.id, {
      email,
      claimToken,
    })
  } catch {
    // Non-critical
  }

  return { session: authData.session, member: memberRow, profile }
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
  assertSupabase()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error('No authenticated user found')

  // Validate claim token
  const { data: memberRow, error: memberError } = await supabase
    .from('members')
    .select('id, full_name, phone, photo_url, gym_id, member_code, claimed_at, auth_user_id')
    .eq('claim_token', claimToken)
    .maybeSingle()

  if (memberError) throw memberError
  if (!memberRow) throw new Error('Invalid claim token. Please contact gym staff.')
  if (memberRow.claimed_at) throw new Error('This claim token has already been used.')
  if (memberRow.auth_user_id) throw new Error('This member already has an account.')

  const gym = await ensureGymSetup()

  // Create member profile
  const profilePayload = {
    id: userData.user.id,
    gym_id: gym.id,
    full_name: memberRow.full_name,
    role: 'member',
    phone: memberRow.phone,
    avatar_url: memberRow.photo_url,
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert(profilePayload)
    .select('*')
    .single()

  if (profileError) throw profileError

  // Link auth user to member record
  const { error: updateError } = await supabase
    .from('members')
    .update({
      auth_user_id: userData.user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', memberRow.id)

  if (updateError) throw updateError

  // Log audit entry
  try {
    await createAuditLog('member_google_linked', 'members', memberRow.id, {
      email: userData.user.email,
      claimToken,
    })
  } catch {
    // Non-critical
  }

  return { member: memberRow, profile }
}
