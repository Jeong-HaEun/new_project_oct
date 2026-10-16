// 화면 표시용 함수 모음. null 이면 '-' 를 돌려준다.

export function formatWon(value) {
  if (value === null) return '-'
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

export function formatPercent(value) {
  if (value === null) return '-'
  return `${Math.round(value)}%`
}

// 단계 비율 (소수 둘째 자리)
export function formatRate(value) {
  if (value === null) return '-'
  return `${value.toFixed(2)}%`
}

// 단계 숫자 (쉼표, 단위 없음)
export function formatCount(value) {
  return value.toLocaleString('ko-KR')
}

// 합계 카드 key → 표시 함수 (카드 · WoW 막대가 함께 쓴다)
export const CARD_FORMATTERS = {
  cost: formatWon,
  revenue: formatWon,
  roas: formatPercent,
  cpa: formatWon,
}

// 배지 숫자: 절댓값 반올림 + 단위 ('25%', '4%p'). 계산 불가면 ''
export function formatDelta(delta) {
  if (delta === null) return ''
  return `${Math.round(Math.abs(delta.value))}${delta.unit}`
}

// BEST 소재 조건 글: '광고비 10만 원 이상 · 구매 1건 이상' (이슈 #22 결정 7)
export function formatBestCondition({ minCost, minConversions }) {
  const cost =
    minCost === 0 ? '광고비 제한 없음' : `광고비 ${minCost / 10000}만 원 이상`
  return `${cost} · 구매 ${minConversions}건 이상`
}

// 카드 이름 옆 표시: 7일이면 null, 1~6일 '최근 3일 기준', 0일 '최근 7일 데이터 없음' (이슈 #11)
export function formatCoverage(days) {
  if (days >= 7) return null
  if (days === 0) return '최근 7일 데이터 없음'
  return `최근 ${days}일 기준`
}

// 세로축용 짧은 숫자: 9,999 → '9,999', 15,000 → '1.5만' (이슈 #12 결정 3)
export function formatCompactWon(value) {
  if (value < 10000) return value.toLocaleString('ko-KR')
  // 소수 첫째 자리까지, '.0' 은 뗀다 (Number 가 1.0 → 1 로 바꿔 줌)
  return `${Number((value / 10000).toFixed(1))}만`
}
