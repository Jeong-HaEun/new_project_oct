// 카카오 로그인 후 돌아올 주소 — 화면 이동용 # 과 ? 를 뺀 페이지 주소
// (HashRouter 가 # 을 쓰므로 Supabase 결과가 # 과 섞이지 않게 한다. Supabase Redirect URLs 에 이 주소를 등록한다)
export function getOAuthRedirectUrl(location) {
  return `${location.origin}${location.pathname}`
}
