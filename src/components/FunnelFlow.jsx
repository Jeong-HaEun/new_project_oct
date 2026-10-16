// 퍼널 단계 흐름 (design.md 5-2 카드, 5-11 퍼널 띠). 위 → 아래로 좁아지는 깔때기.
// stages 4개 사이에 rates 3개를 끼워 그린다: 노출 → CTR → 클릭 → 담기율 → …
// 띠 폭은 데이터와 상관없이 고정 (모양만 보여 주고, 크기 비교는 숫자 · 비율로 한다)
import { formatCount, formatRate } from '../utils/format.js'

// 노출 → 클릭 → 장바구니 → 구매 (design.md 5-11)
const BAND_WIDTHS = ['w-full', 'w-5/6', 'w-2/3', 'w-1/2']

export function FunnelFlow({ funnel, scopeLabel }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4 md:p-5">
      <p className="text-xs text-muted">{scopeLabel} · 최근 7일</p>
      <ol className="mx-auto mt-3 flex max-w-xl flex-col items-center gap-1">
        {funnel.stages.map((stage, index) => {
          const rate = index > 0 ? funnel.rates[index - 1] : null
          return (
            <li
              key={stage.key}
              className="flex w-full flex-col items-center gap-1"
            >
              {rate && <FunnelRate rate={rate} />}
              <div
                className={`rounded bg-primary-tint px-3 py-2 text-center ${BAND_WIDTHS[index]}`}
              >
                <p className="text-xs font-semibold text-ink">{stage.label}</p>
                <p className="font-display text-xl font-extrabold tabular-nums text-ink md:text-3xl">
                  {formatCount(stage.count)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// 앞 단계 → 뒤 단계 비율. 계산할 수 없으면 '-' (design.md 5-7 값이 없음)
function FunnelRate({ rate }) {
  const isEmpty = rate.value === null
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden="true">↓</span>
      {rate.label}
      <span
        className={`text-sm font-semibold tabular-nums ${isEmpty ? 'text-muted' : 'text-ink'}`}
      >
        {formatRate(rate.value)}
      </span>
    </p>
  )
}
