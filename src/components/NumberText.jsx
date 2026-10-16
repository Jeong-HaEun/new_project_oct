// 표 숫자 한 칸: 숫자는 그대로, 끝의 단위(원 · %)만 작은 회색 글씨로 뺀다 (issue-14-tests.md 숫자 모양).
// 값이 없으면 회색 '-'. 숫자는 줄이지 않는다 ('6,536,810원').
export function NumberText({ text }) {
  if (text === '-') return <span className="text-muted">-</span>
  const unit = text.match(/[원%]$/)?.[0] ?? ''
  return (
    <>
      {text.slice(0, text.length - unit.length)}
      {unit && <span className="ml-0.5 text-xs text-muted">{unit}</span>}
    </>
  )
}
