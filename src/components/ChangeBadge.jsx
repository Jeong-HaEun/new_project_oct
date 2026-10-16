// 전주 · 전월 대비 배지 (design.md 5-5). 화살표 = 값의 방향, 색 = 좋고 나쁨, 글자를 꼭 붙인다.
// delta 가 있으면 화살표 뒤에 숫자를 붙인다: '▲ 4%p 개선'
const ARROWS = { up: '▲', down: '▼', same: '–' }

const TONE_CLASSES = {
  good: 'bg-good-tint text-good',
  bad: 'bg-bad-tint text-bad',
  neutral: 'bg-canvas text-muted',
}

export function ChangeBadge({ change, delta = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${TONE_CLASSES[change.tone]}`}
    >
      <span aria-hidden="true">{ARROWS[change.direction]}</span>
      {delta && <span>{delta}</span>}
      {change.label}
    </span>
  )
}
