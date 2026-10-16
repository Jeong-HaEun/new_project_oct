// 퍼널 한 줄 인사이트 (design.md 5-2 카드). 최저가 있는 단계마다 한 줄, 없으면 그리지 않는다.
// 문장은 metrics.js 의 buildFunnelInsights 가 만든다. 경고색은 쓰지 않는다 (악화 · 오류와 헷갈림).
export function FunnelInsight({ insights }) {
  if (insights.length === 0) return null
  return (
    <section
      aria-label="퍼널 인사이트"
      className="mt-3 rounded-lg border border-hairline bg-surface p-4 md:p-5"
    >
      <h3 className="text-sm font-semibold text-muted">한 줄 인사이트</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {insights.map((insight) => (
          <li key={insight.key} className="text-sm text-ink">
            {insight.text}
            <span className="text-muted"> · {insight.action}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
