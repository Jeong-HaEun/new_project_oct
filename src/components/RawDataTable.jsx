// 원본 줄 표 (design.md 5-7). 칸은 업로드 양식과 같고, 최신 날짜가 위.
import { CSV_COLUMNS } from '../utils/csv.js'
import { formatCount } from '../utils/format.js'

const TEXT_FIELDS = [
  'reportDate',
  'media',
  'campaignName',
  'adGroupName',
  'creativeName',
]

const HEAD_CELL =
  'whitespace-nowrap bg-canvas px-3 py-2 text-xs font-semibold text-muted'
const BODY_CELL = 'whitespace-nowrap border-t border-hairline px-3 py-2'

// 같은 날짜 · 매체 · 캠페인 · 광고그룹 · 소재 줄은 하나뿐이다 (api.md 중복 기준)
function rowKey(row) {
  return [
    row.reportDate,
    row.media,
    row.campaignName,
    row.adGroupName,
    row.creativeName,
  ].join('|')
}

export function RawDataTable({ rows }) {
  const newestFirst = [...rows].reverse()

  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-hairline bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {CSV_COLUMNS.map((column) => (
              <th
                key={column.field}
                scope="col"
                className={`${HEAD_CELL} ${TEXT_FIELDS.includes(column.field) ? 'text-left' : 'text-right'}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-canvas">
              {CSV_COLUMNS.map(({ field }) =>
                TEXT_FIELDS.includes(field) ? (
                  <td key={field} className={BODY_CELL}>
                    {row[field]}
                  </td>
                ) : (
                  <td
                    key={field}
                    className={`${BODY_CELL} text-right tabular-nums`}
                  >
                    {formatCount(row[field])}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
