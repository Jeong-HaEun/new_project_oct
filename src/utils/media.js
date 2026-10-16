// 매체 필터 함수 모음. 매체 값은 대문자, "전체"는 null 이다.

// 필터 버튼 순서
export const MEDIA_LIST = ['NAVER', 'META', 'GOOGLE']

// 주소의 ?media= 값 → 'NAVER'·'META'·'GOOGLE' 또는 null(전체)
export function parseMedia(value) {
  const upper = (value ?? '').toUpperCase()
  return MEDIA_LIST.includes(upper) ? upper : null
}

export function filterByMedia(rows, media) {
  if (media === null) return rows
  return rows.filter((row) => row.media === media)
}
