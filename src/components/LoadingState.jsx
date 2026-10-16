// 불러오는 중 (design.md 6절): 카드 자리에 회색 막대 + 안내 문구
import { CARD_GRID } from './SummaryCard.jsx'

export function LoadingState() {
  return (
    <div className="mt-6 md:mt-8">
      <p role="status" className="text-sm text-muted">
        광고 데이터를 불러오는 중이에요.
      </p>
      <div className={`mt-3 ${CARD_GRID}`}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded bg-hairline" />
        ))}
      </div>
    </div>
  )
}
