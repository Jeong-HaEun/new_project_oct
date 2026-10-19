import { format, parseISO, subDays } from 'date-fns'
import { summarizeTotals } from './metrics.js'
import { formatCount, formatPercent, formatWon } from './format.js'

function summarizeDay(rows, date) {
  const dailyRows = rows.filter((row) => row.reportDate === date)
  return dailyRows.length ? summarizeTotals(dailyRows) : null
}

function changeText(current, previous) {
  if (current === previous) return '동일'
  if (previous === 0) return '기존 0에서 발생'
  const rate = (Math.abs(current - previous) / previous) * 100
  const amount = rate < 0.1 ? '0.1% 미만' : `${Number(rate.toFixed(1))}%`
  return `${amount} ${current > previous ? '증가' : '감소'}`
}

function compareDay(label, date, current, previous) {
  if (!previous)
    return {
      key: label,
      text: `${label} (${date}): 비교 날짜의 데이터가 없어 분석을 생략했습니다.`,
    }
  const scale = `광고비 ${changeText(current.cost, previous.cost)}, 구매 ${changeText(current.conversions, previous.conversions)}.`
  const efficiency =
    current.cpa === null || previous.cpa === null
      ? '구매가 0건인 날짜가 있어 CPA 비교는 생략했습니다.'
      : current.cpa === previous.cpa
        ? 'CPA는 동일하게 유지됐습니다.'
        : `CPA는 ${changeText(current.cpa, previous.cpa)}해 구매 효율이 ${current.cpa < previous.cpa ? '개선' : '하락'}됐습니다.`
  const roas =
    current.roas === null || previous.roas === null
      ? '광고비가 0원인 날짜가 있어 ROAS 비교는 생략했습니다.'
      : `ROAS는 ${formatPercent(current.roas)}로, ${previous.roas === current.roas ? '동일하게 유지됐습니다' : `${Number(Math.abs(current.roas - previous.roas).toFixed(1))}%p ${current.roas > previous.roas ? '상승' : '하락'}했습니다`}.`
  return {
    key: label,
    text: `${label} (${date}): ${scale} ${efficiency} ${roas}`,
  }
}

export function buildReportComment(rows, latestDate) {
  if (!latestDate) return null
  const current = summarizeDay(rows, latestDate)
  if (!current) return null
  const previousDate = format(subDays(parseISO(latestDate), 1), 'yyyy-MM-dd')
  const weekDate = format(subDays(parseISO(latestDate), 7), 'yyyy-MM-dd')
  return {
    date: latestDate,
    overview: `광고비 ${formatWon(current.cost)}, 구매 ${formatCount(current.conversions)}건, 매출 ${formatWon(current.revenue)}을 기록했습니다.`,
    comparisons: [
      compareDay(
        '전일 대비',
        previousDate,
        current,
        summarizeDay(rows, previousDate),
      ),
      compareDay(
        '전주 동요일 대비',
        weekDate,
        current,
        summarizeDay(rows, weekDate),
      ),
    ],
  }
}
