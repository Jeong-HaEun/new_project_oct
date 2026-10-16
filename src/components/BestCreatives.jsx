// 매체별 BEST 소재 5 표 (design.md 5-7 표, 5-2 카드). 순위 계산은 metrics.js 의 rankBestCreatives.
import {
  formatCount,
  formatPercent,
  formatRate,
  formatWon,
} from '../utils/format.js'

const HEAD_CELL =
  'whitespace-nowrap bg-canvas px-3 py-2 text-xs font-semibold text-muted'
const BODY_CELL = 'whitespace-nowrap border-t border-hairline px-3 py-2'

const NAME_COLUMNS = [
  { key: 'creativeName', label: '소재' },
  { key: 'adGroupName', label: '광고그룹' },
  { key: 'campaignName', label: '캠페인' },
]

// 노출 · CTR 은 순위 기준이 아니라 참고 칸 (issue-22-tests.md 결정 6)
const NUMBER_COLUMNS = [
  { key: 'impressions', label: '노출', format: formatCount },
  { key: 'ctr', label: 'CTR', format: formatRate },
  { key: 'conversions', label: '구매', format: formatCount },
  { key: 'cost', label: '광고비', format: formatWon },
  { key: 'revenue', label: '매출', format: formatWon },
  { key: 'roas', label: 'ROAS', format: formatPercent },
  { key: 'cpa', label: 'CPA', format: formatWon },
]

// groups: [{ media, items }]. [전체] 면 3개(매체 이름 표시), 매체를 고르면 1개
// sortBy: 순위 기준 칸 머리글을 진하게 · conditionText: 빈 목록 문구의 조건 글
export function BestCreatives({
  groups,
  showMediaName,
  sortBy,
  conditionText,
}) {
  return groups.map(({ media, items }) => (
    <div key={media} className="mt-3">
      {showMediaName && <h3 className="mb-2 text-sm font-semibold">{media}</h3>}
      <CreativeTable
        items={items}
        sortBy={sortBy}
        conditionText={conditionText}
      />
    </div>
  ))
}

function CreativeTable({ items, sortBy, conditionText }) {
  if (items.length === 0) {
    return <Notice>조건에 맞는 소재가 없어요 ({conditionText})</Notice>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className={`${HEAD_CELL} text-right`}>
              순위
            </th>
            {NAME_COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${HEAD_CELL} text-left`}
              >
                {column.label}
              </th>
            ))}
            {NUMBER_COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.key === sortBy ? 'descending' : undefined}
                className={`${HEAD_CELL} text-right aria-[sort=descending]:text-ink`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={[
                item.campaignName,
                item.adGroupName,
                item.creativeName,
              ].join('|')}
              className="hover:bg-canvas"
            >
              <td className={`${BODY_CELL} text-right tabular-nums`}>
                {index + 1}
              </td>
              {NAME_COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={`${BODY_CELL} ${column.key === 'creativeName' ? 'font-semibold' : ''}`}
                >
                  {item[column.key]}
                </td>
              ))}
              {NUMBER_COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={`${BODY_CELL} text-right tabular-nums ${item[column.key] === null ? 'text-muted' : ''}`}
                >
                  {column.format(item[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Notice({ children }) {
  return (
    <p className="rounded-lg border border-hairline bg-surface p-4 text-sm text-muted md:p-5">
      {children}
    </p>
  )
}
