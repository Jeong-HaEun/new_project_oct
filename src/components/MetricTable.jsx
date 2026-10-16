// 지표 표 (design.md 5-7). 월 누적 표 · 일자별 표가 함께 쓴다. 값 계산은 metrics.js, 여기서는 그리기만 한다.
import {
  formatCount,
  formatPercent,
  formatRate,
  formatWon,
} from '../utils/format.js'
import { NumberText } from './NumberText.jsx'

const HEAD_CELL =
  'whitespace-nowrap bg-canvas px-3 py-2 text-xs font-semibold text-muted'
const BODY_CELL = 'whitespace-nowrap border-t border-hairline px-3 py-2'

// 개수 칸은 단위가 없고, null 이면 '-'
function formatCountOrDash(value) {
  return value === null ? '-' : formatCount(value)
}

// 칸 순서는 summarizeTotals 와 같다. CPB 는 머리글 툴팁 (metrics.md)
const COLUMNS = [
  { key: 'cost', label: '광고비', format: formatWon },
  { key: 'impressions', label: '노출', format: formatCountOrDash },
  { key: 'clicks', label: '클릭', format: formatCountOrDash },
  { key: 'carts', label: '장바구니', format: formatCountOrDash },
  { key: 'conversions', label: '구매', format: formatCountOrDash },
  { key: 'revenue', label: '매출', format: formatWon },
  { key: 'ctr', label: 'CTR', format: formatRate },
  { key: 'cpc', label: 'CPC', format: formatWon },
  { key: 'cpb', label: 'CPB', title: 'Cost Per Basket', format: formatWon },
  { key: 'cpa', label: 'CPA', format: formatWon },
  { key: 'roas', label: 'ROAS', format: formatPercent },
]

// labelHeader: 첫 칸 머리글 ('월' · '날짜') · rows: [{ label, ...11칸 }]
export function MetricTable({ labelHeader, rows }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-hairline bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className={`${HEAD_CELL} text-left`}>
              {labelHeader}
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${HEAD_CELL} text-right`}
              >
                {column.title ? (
                  <abbr title={column.title} className="cursor-help">
                    {column.label}
                  </abbr>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.label} className="hover:bg-canvas">
              <th
                scope="row"
                className={`${BODY_CELL} text-left font-normal tabular-nums`}
              >
                {item.label}
              </th>
              {COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={`${BODY_CELL} text-right tabular-nums`}
                >
                  <NumberText text={column.format(item[column.key])} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
