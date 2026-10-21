import { createClient } from '@supabase/supabase-js'
import { createBrowserAuthStorage } from './authStorage.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// publishable/anon 키만 사용한다. service_role·secret 키는 브라우저에 넣지 않는다.
// pkce: 카카오 로그인 결과를 # 이 아니라 ?code= 로 받는다 (# 은 HashRouter 가 화면 이동에 씀)
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { flowType: 'pkce', persistSession: true, storage: createBrowserAuthStorage(url), storageKey: createBrowserAuthStorage(url).storageKey },
      })
    : null
