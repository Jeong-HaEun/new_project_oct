import { supabase } from './supabase.js'
import { getOAuthRedirectUrl } from './auth-url.js'

// 카카오 로그인 화면으로 이동 → 끝나면 Supabase 를 거쳐 이 페이지로 돌아온다
// 한클래스와 같은 Supabase 프로젝트·카카오 앱을 쓴다 (같은 계정)
export async function signInWithKakao() {
  if (!supabase) throw new Error('Supabase 연결 설정이 필요해요.')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: getOAuthRedirectUrl(window.location) },
  })
  if (error)
    throw new Error(
      '카카오 로그인을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    )
}
