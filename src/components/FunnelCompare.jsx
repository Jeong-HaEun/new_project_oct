// 매체별 퍼널 비교 표 (design.md 5-7 표, 5-6 "최저"). 매체 필터와 관계없이 3개 매체를 보여준다.
import { formatRate } from '../utils/format.js'
import { FUNNEL_RATES } from '../utils/metrics.js'

const HEAD_CELL =
  'whitespace-nowrap bg-canvas px-3 py-2 text-xs font-semibold text-muted'
const BODY_CELL = 'whitespace-nowrap border-t border-hairline px-3 py-2'

export function FunnelCompare({ comparison }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-muted">
        매체별 비교 · 필터와 관계없이 3개 매체 · 최근 7일
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th scope="col" className={`${HEAD_CELL} text-left`}>
                매체
              </th>
              {FUNNEL_RATES.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${HEAD_CELL} text-right`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.byMedia.map((item) => (
              <tr key={item.media} className="hover:bg-canvas">
                <th
                  scope="row"
                  className={`${BODY_CELL} text-left font-semibold`}
                >
                  {item.media}
                </th>
                {FUNNEL_RATES.map((column) => (
                  <RateCell
                    key={column.key}
                    value={item.rates[column.key]}
                    isLowest={comparison.lowest[column.key].includes(
                      item.media,
                    )}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RateCell({ value, isLowest }) {
  return (
    <td
      className={`${BODY_CELL} text-right tabular-nums ${value === null ? 'text-muted' : ''}`}
    >
      {isLowest && (
        <span className="mr-1.5 rounded bg-primary-strong px-1.5 py-0.5 text-xs font-bold text-white">
          최저
        </span>
      )}
      {formatRate(value)}
    </td>
  )
}
