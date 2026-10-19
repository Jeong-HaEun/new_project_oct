import { format, parseISO, subDays } from 'date-fns'
import { summarizeTotals } from './metrics.js'

function summarize(rows) {
  if (!rows.length) return null
  const totals = summarizeTotals(rows)
  return {
    ...totals,
    conversionRate: totals.clicks
      ? (totals.conversions / totals.clicks) * 100
      : null,
    averageOrderValue: totals.conversions
      ? totals.revenue / totals.conversions
      : null,
  }
}

// 캠페인 이름과 소재명은 외부로 보내지 않는다. 매체+캠페인 묶음에 임시 번호를 부여한다.
export function buildAiReport(rows, date) {
  const dates = [0, 1, 7].map((days) =>
    format(subDays(parseISO(date), days), 'yyyy-MM-dd'),
  )
  const selected = rows.filter((row) => dates.includes(row.reportDate))
  const groups = new Map()
  for (const row of selected) {
    const key = JSON.stringify([row.media, row.campaignName])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const periods = (group) =>
    dates.map((day) => ({
      date: day,
      metrics: summarize(group.filter((row) => row.reportDate === day)),
    }))
  return {
    periods: periods(selected),
    media: ['NAVER', 'META', 'GOOGLE']
      .filter((media) => selected.some((row) => row.media === media))
      .map((media) => ({
        media,
        periods: periods(selected.filter((row) => row.media === media)),
      })),
    campaigns: [...groups.values()]
      .sort(
        (a, b) =>
          b.reduce((sum, row) => sum + row.cost, 0) -
            a.reduce((sum, row) => sum + row.cost, 0) ||
          JSON.stringify([a[0].media, a[0].campaignName]).localeCompare(
            JSON.stringify([b[0].media, b[0].campaignName]),
            'en',
          ),
      )
      .slice(0, 12)
      .map((group, index) => ({
        label: `캠페인 ${index + 1}`,
        media: group[0].media,
        periods: periods(group),
      })),
    campaignScope:
      '세 비교일의 광고비 합계 기준 상위 최대 12개. 전체 캠페인을 대표하지 않을 수 있음.',
  }
}
