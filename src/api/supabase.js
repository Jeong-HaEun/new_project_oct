import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// publishable/anon 키만 사용한다. service_role·secret 키는 브라우저에 넣지 않는다.
export const supabase = url && key ? createClient(url, key) : null
