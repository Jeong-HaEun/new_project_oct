// 한클래스 보고서 페이지(report.html) 안에 끼워 넣어 열렸는지
// 끼워 넣은 화면에서는 로그인·로그아웃을 한클래스가 맡는다 (카카오 로그인 화면은 iframe 안에서 열리지 않음)
export function isEmbedded(search, inFrame) {
  return inFrame || new URLSearchParams(search).get('embed') === '1'
}
