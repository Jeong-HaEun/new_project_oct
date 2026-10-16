// 최근 4주 같은 요일 표 (design.md 5-7). 최신 주가 위, 데이터 없는 주는 '-'.
// 값 계산은 metrics.js 의 summarizeSameWeekday, 여기서는 그리기만 한다.
import { formatWeekdayDate } from '../utils/dates.js'
import { CARD_FORMATTERS } from '../utils/format.js'
import { NumberText } from './NumberText.jsx'

const HEAD_CELL =
  'whitespace-nowrap bg-canvas px-3 py-2 text-xs font-semibold text-muted'
const BODY_CELL = 'whitespace-nowrap border-t border-hairline px-3 py-2'

const COLUMNS = [
  { key: 'cost', label: '광고비' },
  { key: 'revenue', label: '매출' },
  { key: 'roas', label: 'ROAS' },
  { key: 'cpa', label: 'CPA' },
]

// trend: [{ date, cost, revenue, roas, cpa }] (최신 먼저)
export function WeekdayTrendTable({ trend }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-hairline bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className={`${HEAD_CELL} text-left`}>
              날짜
            </th>
            {COLUMNS.map((column) => (
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
          {trend.map((day) => (
            <tr key={day.date} className="hover:bg-canvas">
              <th
                scope="row"
                className={`${BODY_CELL} text-left font-normal tabular-nums`}
              >
                {formatWeekdayDate(day.date)}
              </th>
              {COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={`${BODY_CELL} text-right tabular-nums`}
                >
                  <NumberText
                    text={CARD_FORMATTERS[column.key](day[column.key])}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
