// BEST 소재 순위 기준 · 조건 버튼 (design.md 5-4 알약). 고른 것은 aria-pressed
import {
  BEST_MIN_CONVERSION_OPTIONS,
  BEST_MIN_COST_OPTIONS,
  BEST_SORT_OPTIONS,
} from '../utils/metrics.js'
import { PILL_CLASSES } from './MediaFilter.jsx'

const ROWS = [
  { key: 'sortBy', label: '순위 기준', options: BEST_SORT_OPTIONS },
  { key: 'minCost', label: '최소 광고비', options: BEST_MIN_COST_OPTIONS },
  {
    key: 'minConversions',
    label: '최소 구매',
    options: BEST_MIN_CONVERSION_OPTIONS,
  },
]

// options: { sortBy, minCost, minConversions } · onChange(key, value)
export function BestOptions({ options, onChange }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {ROWS.map((row) => (
        <div
          key={row.key}
          role="group"
          aria-label={row.label}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="w-20 shrink-0 text-xs text-muted">{row.label}</span>
          {row.options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={options[row.key] === option.value}
              onClick={() => onChange(row.key, option.value)}
              className={PILL_CLASSES}
            >
              {option.label}
            </button>
          ))}
        </div>
      ))}
      <p className="text-xs text-muted">
        ROAS = 매출 ÷ 광고비 (효율) · 구매수 = 구매 많은 순, 같으면 ROAS 순
        (규모) · 같은 캠페인에서는 1위 소재 1개만 · 노출 · CTR 은 참고용
      </p>
    </div>
  )
}
