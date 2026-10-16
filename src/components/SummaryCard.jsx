// 합계 카드 하나 (design.md 5-2). 큰 숫자 = 최근 7일, 작은 글씨 = 전주 값 + 전주 대비.
import { CARD_FORMATTERS } from '../utils/format.js'
import { ChangeBadge } from './ChangeBadge.jsx'

// ROAS·CPA 큰 숫자만 토마토 (design.md 2절)
const NUMBER_COLORS = {
  cost: 'text-ink',
  revenue: 'text-ink',
  roas: 'text-primary',
  cpa: 'text-primary',
}

// 카드 4개 배치: 모바일 2×2, 넓은 화면 한 줄 (design.md 7절). 불러오는 중 막대도 같이 쓴다
export const CARD_GRID = 'grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'

// '1,234원' → ['1,234', '원']. 단위는 작은 글씨로 따로 그린다 (design.md 3절 보조 글)
function splitUnit(text) {
  const unit = text.match(/[원%]$/)?.[0] ?? ''
  return [text.slice(0, text.length - unit.length), unit]
}

// coverageLabel: 최근 7일이 다 안 찼을 때 "최근 3일 기준" (design.md 6절), 아니면 null
export function SummaryCard({ card, coverageLabel }) {
  const format = CARD_FORMATTERS[card.key]
  const [number, unit] = splitUnit(format(card.current))

  return (
    <article className="rounded-lg border border-hairline bg-surface p-3 md:p-5">
      <h2 className="text-sm font-semibold text-muted">
        {card.title}
        {coverageLabel && (
          <span className="ml-1.5 text-xs font-normal">{coverageLabel}</span>
        )}
      </h2>
      <p className="mt-1 whitespace-nowrap">
        <span
          className={`font-display text-xl font-extrabold tabular-nums md:text-3xl ${NUMBER_COLORS[card.key]}`}
        >
          {number}
        </span>
        {unit && <span className="ml-0.5 text-xs text-muted">{unit}</span>}
      </p>
      <p className="mt-2 text-xs text-muted tabular-nums">
        전주 {format(card.previous)}
      </p>
      {/* 전주 7일이 다 없으면 비교하지 않는다 (design.md 5-5 비교 불가) */}
      {card.previous === null ? (
        <p className="mt-1 text-xs text-muted">- 비교할 지난주 데이터 없음</p>
      ) : (
        card.change && (
          <div className="mt-1">
            <ChangeBadge change={card.change} />
          </div>
        )
      )}
    </article>
  )
}
