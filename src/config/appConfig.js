const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const appMode = import.meta.env.VITE_APP_MODE || (supabaseUrl && supabaseAnonKey ? 'supabase' : 'mock')

export const appConfig = {
  appName: 'Guru Fitness OS',
  gymName: 'Guru Fitness Health Club',
  location: 'Dhule, Maharashtra, India',
  defaultCurrency: 'INR',
  defaultTimezone: 'Asia/Kolkata',
  mode: appMode,
  environment: import.meta.env.MODE || 'development',
  isMockMode: appMode === 'mock',
  isSupabaseMode: appMode === 'supabase',
  supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')),
  realFeatures: {
    authentication: true,
    supabase: Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')),
    payments: true,
    whatsapp: false,
    qrCamera: false,
  },
}

export const isMockMode = appConfig.mode === 'mock'
