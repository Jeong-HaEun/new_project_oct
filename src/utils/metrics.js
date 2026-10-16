// 지표 계산 함수 모음. 계산할 수 없으면 null 을 돌려준다 ('-' 표시는 format.js).
import {
  countDays,
  filterByDateRange,
  formatMonthLabel,
  formatShortDate,
  formatWeekdayDate,
  getLast14Days,
  getMonthToDateRanges,
  getRangeLength,
  getRecentMonthRanges,
  getSameWeekdayDates,
  getWeekRanges,
} from './dates.js'
import { formatRate } from './format.js'
import { filterByMedia, MEDIA_LIST } from './media.js'

const NUMBER_FIELDS = [
  'cost',
  'impressions',
  'clicks',
  'carts',
  'conversions',
  'revenue',
]

// 카드 순서와 "어느 쪽이 좋은지" (none = 판단하지 않음)
const CARDS = [
  { key: 'cost', title: '총 광고비', goodWhen: 'none' },
  { key: 'revenue', title: '총 매출', goodWhen: 'up' },
  { key: 'roas', title: '전체 ROAS', goodWhen: 'up' },
  { key: 'cpa', title: '전체 CPA', goodWhen: 'down' },
]

export function sumTotals(rows) {
  const totals = Object.fromEntries(NUMBER_FIELDS.map((field) => [field, 0]))
  for (const row of rows) {
    for (const field of NUMBER_FIELDS) totals[field] += row[field]
  }
  return totals
}

// 퍼센트 숫자로 돌려준다 (3.5 가 아니라 350)
export function calcRoas(revenue, cost) {
  if (cost === 0) return null
  return (revenue / cost) * 100
}

export function calcCpa(cost, conversions) {
  if (conversions === 0) return null
  return cost / conversions
}

export function compareChange(current, previous, goodWhen) {
  if (current === null || previous === null) return null
  if (current === previous) {
    return { direction: 'same', label: '변화 없음', tone: 'neutral' }
  }
  const direction = current > previous ? 'up' : 'down'
  if (goodWhen === 'none') return { direction, label: '변화', tone: 'neutral' }
  const isGood = direction === goodWhen
  return {
    direction,
    label: isGood ? '개선' : '악화',
    tone: isGood ? 'good' : 'bad',
  }
}

// 합계끼리 나눈다 (행별 지표의 평균 아님)
function cardValues(rows, range) {
  const totals = sumTotals(filterByDateRange(rows, range.start, range.end))
  return {
    cost: totals.cost,
    revenue: totals.revenue,
    roas: calcRoas(totals.revenue, totals.cost),
    cpa: calcCpa(totals.cost, totals.conversions),
  }
}

// 전주는 7일이 모두 있을 때만 비교한다
export function summarizeCards(rows, latestDate) {
  const { current, previous } = getWeekRanges(latestDate)
  const now = cardValues(rows, current)
  const hasFullPrevious = countDays(rows, previous.start, previous.end) === 7
  const before = hasFullPrevious ? cardValues(rows, previous) : null

  return CARDS.map(({ key, title, goodWhen }) => {
    const previousValue = before ? before[key] : null
    return {
      key,
      title,
      current: now[key],
      previous: previousValue,
      change: compareChange(now[key], previousValue, goodWhen),
    }
  })
}

// ---- 퍼널 (이슈 #3) ----

// 뒤 단계 ÷ 앞 단계 × 100. 앞 단계가 0 이면 null
// × 100 을 먼저 해서 소수 오차를 줄인다
export function calcRate(numerator, denominator) {
  if (denominator === 0) return null
  return (numerator * 100) / denominator
}

const FUNNEL_STAGES = [
  { key: 'impressions', label: '노출' },
  { key: 'clicks', label: '클릭' },
  { key: 'carts', label: '장바구니' },
  { key: 'conversions', label: '구매' },
]

// 비율 = 뒤 단계(to) ÷ 앞 단계(from) (metrics.md 퍼널 지표). 비교 표 열 순서·이름으로도 쓴다
export const FUNNEL_RATES = [
  { key: 'ctr', label: 'CTR', from: 'impressions', to: 'clicks' },
  { key: 'cartRate', label: '담기율', from: 'clicks', to: 'carts' },
  {
    key: 'purchaseRate',
    label: '장바구니→구매율',
    from: 'carts',
    to: 'conversions',
  },
]

// 최근 7일 합계
function sumCurrentWeek(rows, latestDate) {
  const { current } = getWeekRanges(latestDate)
  return sumTotals(filterByDateRange(rows, current.start, current.end))
}

// 최근 7일 단계 흐름 { stages, rates }. 매체 필터를 거친 줄을 받는다
export function summarizeFunnel(rows, latestDate) {
  const totals = sumCurrentWeek(rows, latestDate)
  return {
    stages: FUNNEL_STAGES.map(({ key, label }) => ({
      key,
      label,
      count: totals[key],
    })),
    rates: FUNNEL_RATES.map(({ key, label, from, to }) => ({
      key,
      label,
      value: calcRate(totals[to], totals[from]),
    })),
  }
}

// 값이 가장 낮은 매체들. 비교할 값이 2개 미만이거나 모두 같으면 [] (issue-3 결정 2~4)
function findLowest(byMedia, rateKey) {
  const compared = byMedia.filter((item) => item.rates[rateKey] !== null)
  if (compared.length < 2) return []
  const min = Math.min(...compared.map((item) => item.rates[rateKey]))
  const lowest = compared.filter((item) => item.rates[rateKey] === min)
  if (lowest.length === compared.length) return []
  return lowest.map((item) => item.media)
}

// 3개 매체 단계 비율과 단계별 최저 { byMedia, lowest }. 필터와 무관하게 전체 줄을 받는다
export function compareFunnelByMedia(rows, latestDate) {
  const byMedia = MEDIA_LIST.map((media) => {
    const { rates } = summarizeFunnel(filterByMedia(rows, media), latestDate)
    return {
      media,
      rates: Object.fromEntries(rates.map(({ key, value }) => [key, value])),
    }
  })
  const lowest = Object.fromEntries(
    FUNNEL_RATES.map(({ key }) => [key, findLowest(byMedia, key)]),
  )
  return { byMedia, lowest }
}

// ---- WoW 막대 (이슈 #20) ----

// 카드 하나 → 막대 2개 [지난주, 이번 주]. 지난주가 없으면 null (비교 불가)
export function buildWowBars(card) {
  return buildPeriodBars(card, '지난주', '이번 주')
}

// ---- MoM 막대 (이슈 #13) ----

// ROAS 는 차이(%p), 나머지는 증감률(%). 부호 있는 값, 반올림 안 함
export function calcMomDelta(key, current, previous) {
  if (current === null || previous === null) return null
  if (key === 'roas') return { value: current - previous, unit: '%p' }
  if (previous === 0) return null
  return { value: ((current - previous) * 100) / previous, unit: '%' }
}

// 이번 달 1일~기준일 vs 지난달 같은 기간, 카드처럼 4지표
// 지난달 같은 기간에 빠진 날이 있으면 비교하지 않는다 (issue-13-tests.md 결정 2)
export function summarizeMom(rows, latestDate) {
  const { current, previous } = getMonthToDateRanges(latestDate)
  const now = cardValues(rows, current)
  const hasFullPrevious =
    countDays(rows, previous.start, previous.end) === getRangeLength(previous)
  const before = hasFullPrevious ? cardValues(rows, previous) : null

  return CARDS.map(({ key, title, goodWhen }) => {
    const previousValue = before ? before[key] : null
    return {
      key,
      title,
      current: now[key],
      previous: previousValue,
      change: compareChange(now[key], previousValue, goodWhen),
      delta: calcMomDelta(key, now[key], previousValue),
    }
  })
}

// WoW · MoM 공통 막대 2개 [지난 기간, 이번 기간]. 지난 값이 없으면 null
export function buildPeriodBars(item, previousLabel, currentLabel) {
  if (item.previous === null) return null
  return [
    { key: 'previous', label: previousLabel, value: item.previous },
    { key: 'current', label: currentLabel, value: item.current },
  ]
}

// ---- 매체별 BEST 소재 5 (이슈 #22) ----

// 기본값: ROAS 순, 광고비 10만 원 이상 + 구매 1건 이상 (metrics.md 인사이트 규칙: 작은 표본의 우연 배제)
export const BEST_DEFAULT_OPTIONS = {
  sortBy: 'roas',
  minCost: 100000,
  minConversions: 1,
}

// 버튼 목록 (결정 6 · 7)
export const BEST_SORT_OPTIONS = [
  { value: 'roas', label: 'ROAS' },
  { value: 'conversions', label: '구매수' },
]
export const BEST_MIN_COST_OPTIONS = [
  { value: 0, label: '제한 없음' },
  { value: 50000, label: '5만' },
  { value: 100000, label: '10만' },
  { value: 300000, label: '30만' },
  { value: 1000000, label: '100만' },
]
export const BEST_MIN_CONVERSION_OPTIONS = [
  { value: 1, label: '1건' },
  { value: 5, label: '5건' },
  { value: 10, label: '10건' },
  { value: 30, label: '30건' },
]

const BEST_LIMIT = 5

// ROAS 높은 순 (계산 불가 null 은 맨 뒤), 같으면 매출 큰 쪽 먼저 (결정 2)
function compareByRoas(a, b) {
  return (b.roas ?? -Infinity) - (a.roas ?? -Infinity) || b.revenue - a.revenue
}

// 구매 많은 순, 같으면 ROAS 순 (결정 6)
function compareByConversions(a, b) {
  return b.conversions - a.conversions || compareByRoas(a, b)
}

const BEST_COMPARE = { roas: compareByRoas, conversions: compareByConversions }

// 최근 7일을 소재별로 합친 뒤, 조건에 맞는 소재 중 캠페인마다 1위만 기준 순으로 5개
export function rankBestCreatives(rows, latestDate, options = {}) {
  const { sortBy, minCost, minConversions } = {
    ...BEST_DEFAULT_OPTIONS,
    ...options,
  }
  if (latestDate === null) return []
  const { current } = getWeekRanges(latestDate)

  // 캠페인 + 광고그룹 + 소재 이름이 모두 같아야 같은 소재 (결정 1)
  const groups = new Map()
  for (const row of filterByDateRange(rows, current.start, current.end)) {
    const key = [row.campaignName, row.adGroupName, row.creativeName].join(
      '\u0000',
    )
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  // 합계끼리 나눈 뒤, 합계로 조건을 본다 (날짜별 ROAS 의 평균 아님)
  const creatives = []
  for (const group of groups.values()) {
    const totals = sumTotals(group)
    if (totals.cost < minCost) continue
    if (totals.conversions < minConversions) continue
    const { campaignName, adGroupName, creativeName } = group[0]
    creatives.push({
      campaignName,
      adGroupName,
      creativeName,
      impressions: totals.impressions,
      clicks: totals.clicks,
      conversions: totals.conversions,
      cost: totals.cost,
      revenue: totals.revenue,
      ctr: calcRate(totals.clicks, totals.impressions),
      roas: calcRoas(totals.revenue, totals.cost),
      cpa: calcCpa(totals.cost, totals.conversions),
    })
  }

  // 정렬한 뒤 캠페인마다 처음 나온 것 = 고른 기준의 캠페인 1위 (결정 5)
  creatives.sort(BEST_COMPARE[sortBy])
  const seenCampaigns = new Set()
  const best = []
  for (const item of creatives) {
    if (seenCampaigns.has(item.campaignName)) continue
    seenCampaigns.add(item.campaignName)
    best.push(item)
    if (best.length === BEST_LIMIT) break
  }
  return best
}

// [전체] 용: NAVER · META · GOOGLE 순서로 매체마다 BEST 5 (결정 4)
export function rankBestCreativesByMedia(rows, latestDate, options = {}) {
  return MEDIA_LIST.map((media) => ({
    media,
    items: rankBestCreatives(filterByMedia(rows, media), latestDate, options),
  }))
}

// ---- 동요일 비교 (이슈 #18) ----

// 기준일 vs 지난주 같은 요일 (MoM 과 같은 모양) + 최근 4주 같은 요일 흐름. 데이터 없는 날은 null
export function summarizeSameWeekday(rows, latestDate) {
  if (latestDate === null) return null

  // 하루치 4지표. 그날 줄이 하나도 없으면 0 이 아니라 null (결정 1)
  function dayValues(date) {
    const hasRows = rows.some((row) => row.reportDate === date)
    if (!hasRows) return { cost: null, revenue: null, roas: null, cpa: null }
    return cardValues(rows, { start: date, end: date })
  }

  const trend = getSameWeekdayDates(latestDate).map((date) => ({
    date,
    ...dayValues(date),
  }))
  const [now, before] = trend

  return {
    cards: CARDS.map(({ key, title, goodWhen }) => ({
      key,
      title,
      current: now[key],
      previous: before[key],
      change: compareChange(now[key], before[key], goodWhen),
      delta: calcMomDelta(key, now[key], before[key]),
    })),
    trend,
  }
}

// ---- 월 누적 선 그래프 (이슈 #24) ----

// 최근 3개월 달마다 합계끼리 나눈 ROAS · CPA. 계산할 수 없으면 null (그래프 선이 끊김)
export function summarizeMonthTrend(rows, latestDate) {
  if (latestDate === null) return []
  return getRecentMonthRanges(latestDate).map((range) => {
    const { roas, cpa } = cardValues(rows, range)
    return { label: formatMonthLabel(range), roas, cpa }
  })
}

// ---- 일자별 추이 (이슈 #12) ----

// 최근 14일 하루마다 ROAS · CPA. 값이 없으면 null 과 그 이유(툴팁에 보여 줌)
export function summarizeDailyTrend(rows, latestDate) {
  if (latestDate === null) return []
  return getLast14Days(latestDate).map((date) => {
    const label = formatShortDate(date)
    // 그날 줄이 하나도 없으면 0 이 아니라 '데이터 없음' (결정 1)
    if (!rows.some((row) => row.reportDate === date)) {
      const note = '데이터 없음'
      return {
        date,
        label,
        roas: null,
        cpa: null,
        roasNote: note,
        cpaNote: note,
      }
    }
    const { roas, cpa } = cardValues(rows, { start: date, end: date })
    return {
      date,
      label,
      roas,
      cpa,
      roasNote: roas === null ? '광고비 0원이라 계산 불가' : null,
      cpaNote: cpa === null ? '구매 0건이라 계산 불가' : null,
    }
  })
}

// ---- 월 누적 표 · 일자별 표 (이슈 #14) ----

// 광고비 ÷ 개수 (CPC · CPB). 개수 0 이면 null
export function calcCostPer(cost, count) {
  if (count === 0) return null
  return cost / count
}

// 표 칸 순서 (MetricTable 과 같은 순서)
const TABLE_KEYS = [...NUMBER_FIELDS, 'ctr', 'cpc', 'cpb', 'cpa', 'roas']

// 표 한 줄 11칸. 합계끼리 나누고, 줄이 없으면 모두 null (issue-14-tests.md 결정 1)
export function summarizeTotals(rows) {
  if (rows.length === 0) {
    return Object.fromEntries(TABLE_KEYS.map((key) => [key, null]))
  }
  const totals = sumTotals(rows)
  return {
    ...totals,
    ctr: calcRate(totals.clicks, totals.impressions),
    cpc: calcCostPer(totals.cost, totals.clicks),
    cpb: calcCostPer(totals.cost, totals.carts),
    cpa: calcCpa(totals.cost, totals.conversions),
    roas: calcRoas(totals.revenue, totals.cost),
  }
}

// 최근 3개월 (최신 월이 위, metrics.md 기간 규칙)
export function buildMonthTable(rows, latestDate) {
  if (latestDate === null) return []
  return getRecentMonthRanges(latestDate)
    .map((range) => ({
      label: formatMonthLabel(range),
      ...summarizeTotals(filterByDateRange(rows, range.start, range.end)),
    }))
    .reverse()
}

// 최근 14일 (최신 날짜가 위, 그래프와 같은 기간)
export function buildDailyTable(rows, latestDate) {
  if (latestDate === null) return []
  return getLast14Days(latestDate)
    .map((date) => ({
      label: formatWeekdayDate(date),
      ...summarizeTotals(filterByDateRange(rows, date, date)),
    }))
    .reverse()
}

// ---- 퍼널 한 줄 인사이트 (이슈 #7) ----

// 최저가 있는 단계마다 { key, text, action }. 하나도 없으면 []
// 단계마다 다음 할 일 (issue-7-tests.md 결정 3)
const FUNNEL_ACTIONS = {
  ctr: '소재 · 문구를 점검해 보세요',
  cartRate: '상품 상세 페이지를 점검해 보세요',
  purchaseRate: '결제 과정을 점검해 보세요',
}

// 퍼널 순서대로, 최저가 있는 단계만 (결정 1). 동점이면 매체를 함께 (결정 2)
export function buildFunnelInsights(comparison) {
  return FUNNEL_RATES.filter(
    ({ key }) => comparison.lowest[key].length > 0,
  ).map(({ key, label }) => {
    const medias = comparison.lowest[key]
    // 최저끼리는 값이 같아서 첫 매체 값을 쓴다
    const value = comparison.byMedia.find((item) => item.media === medias[0])
      .rates[key]
    return {
      key,
      text: `${medias.join(' · ')}의 ${label}이 가장 낮아요 (${formatRate(value)})`,
      action: FUNNEL_ACTIONS[key],
    }
  })
}
