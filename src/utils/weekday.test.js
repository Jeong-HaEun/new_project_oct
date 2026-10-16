import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatWeekdayDate, getSameWeekdayDates } from './dates.js'
import { filterByMedia } from './media.js'
import { summarizeSameWeekday } from './metrics.js'

const LATEST = '2026-10-07'

// 시나리오 문서의 기본값: META · 구매 1, 나머지 숫자는 0
function row(reportDate, overrides = {}) {
  return {
    reportDate,
    media: 'META',
    campaignName: '캠페인1',
    adGroupName: '그룹1',
    creativeName: 'A',
    cost: 0,
    impressions: 0,
    clicks: 0,
    carts: 0,
    conversions: 1,
    revenue: 0,
    ...overrides,
  }
}

function card(result, key) {
  return result.cards.find((item) => item.key === key)
}

// ---- getSameWeekdayDates · formatWeekdayDate ----

test('S1 [정상] 4주 날짜 → 10/07 · 09/30 · 09/23 · 09/16 (09/09 는 5주째라 없음)', () => {
  assert.deepEqual(getSameWeekdayDates(LATEST), [
    '2026-10-07',
    '2026-09-30',
    '2026-09-23',
    '2026-09-16',
  ])
})

test('S2 [경계] 해 넘김 → 2026-01-06 의 지난주는 2025-12-30', () => {
  assert.equal(getSameWeekdayDates('2026-01-06')[1], '2025-12-30')
})

test("S3 [정상] 요일 붙이기 → '10/7(수)'", () => {
  assert.equal(formatWeekdayDate('2026-10-07'), '10/7(수)')
})

test("S4 [경계] 일요일 (요일 번호 0) → '10/4(일)'", () => {
  assert.equal(formatWeekdayDate('2026-10-04'), '10/4(일)')
})

test("S5 [경계] 토요일 (요일 번호 6) → '10/10(토)'", () => {
  assert.equal(formatWeekdayDate('2026-10-10'), '10/10(토)')
})

// ---- summarizeSameWeekday ----

test('S6 [정상] 비교 → 광고비 변화 · 매출 개선 · ROAS +100%p 개선 · CPA +25% 악화', () => {
  const rows = [
    row('2026-10-07', { cost: 100000, revenue: 400000, conversions: 4 }),
    row('2026-09-30', { cost: 80000, revenue: 240000, conversions: 4 }),
  ]
  const result = summarizeSameWeekday(rows, LATEST)

  const cost = card(result, 'cost')
  assert.equal(cost.current, 100000)
  assert.equal(cost.previous, 80000)
  assert.equal(cost.change.tone, 'neutral')
  assert.deepEqual(cost.delta, { value: 25, unit: '%' })

  const revenue = card(result, 'revenue')
  assert.equal(revenue.current, 400000)
  assert.equal(revenue.previous, 240000)
  assert.equal(revenue.change.label, '개선')

  const roas = card(result, 'roas')
  assert.equal(roas.current, 400)
  assert.equal(roas.previous, 300)
  assert.equal(roas.change.label, '개선')
  assert.deepEqual(roas.delta, { value: 100, unit: '%p' })

  const cpa = card(result, 'cpa')
  assert.equal(cpa.current, 25000)
  assert.equal(cpa.previous, 20000)
  assert.equal(cpa.change.label, '악화')
  assert.deepEqual(cpa.delta, { value: 25, unit: '%' })
})

test('S7 [정상] 하루 여러 줄은 합계끼리 → ROAS 180 (평균 300 아님)', () => {
  const rows = [
    row(LATEST, { cost: 20000, revenue: 100000 }),
    row(LATEST, { creativeName: 'B', cost: 80000, revenue: 80000 }),
  ]
  assert.equal(card(summarizeSameWeekday(rows, LATEST), 'roas').current, 180)
})

test('S8 [경계] 지난주 같은 요일 없음 → previous · change · delta 모두 null', () => {
  const rows = [row(LATEST, { cost: 100000, revenue: 300000 })]
  for (const item of summarizeSameWeekday(rows, LATEST).cards) {
    assert.equal(item.previous, null)
    assert.equal(item.change, null)
    assert.equal(item.delta, null)
  }
})

test('S9 [경계] 기준일 값 없음 → current · change · delta 모두 null', () => {
  const rows = [row('2026-09-30', { cost: 100000, revenue: 300000 })]
  for (const item of summarizeSameWeekday(rows, LATEST).cards) {
    assert.equal(item.current, null)
    assert.equal(item.change, null)
    assert.equal(item.delta, null)
  }
})

test('S10 [정상] 4주 흐름 → 데이터 없는 주는 0 이 아니라 null', () => {
  const day = { cost: 100000, revenue: 300000 }
  const rows = [row('2026-10-07', day), row('2026-09-23', day)]
  const { trend } = summarizeSameWeekday(rows, LATEST)
  assert.equal(trend.length, 4)
  assert.equal(trend[0].date, '2026-10-07')
  assert.equal(trend[0].cost, 100000)
  assert.deepEqual(trend[1], {
    date: '2026-09-30',
    cost: null,
    revenue: null,
    roas: null,
    cpa: null,
  })
  assert.equal(trend[2].cost, 100000)
})

test('S11 [경계] 다른 요일은 안 섞임 → 10/06(화) 줄은 빠짐', () => {
  const rows = [
    row('2026-10-07', { cost: 100000 }),
    row('2026-10-06', { cost: 50000 }),
  ]
  assert.equal(summarizeSameWeekday(rows, LATEST).trend[0].cost, 100000)
})

test('S12 [경계] 4주 경계 → 09/16 은 trend[3], 09/09 는 없음', () => {
  const rows = [
    row('2026-09-16', { cost: 100000 }),
    row('2026-09-09', { cost: 50000 }),
  ]
  const { trend } = summarizeSameWeekday(rows, LATEST)
  assert.equal(trend[3].date, '2026-09-16')
  assert.equal(trend[3].cost, 100000)
  assert.ok(!trend.some((item) => item.date === '2026-09-09'))
})

test('S13 [예외] 그날 광고비 0 → 광고비 · 매출 0, ROAS · CPA null', () => {
  const rows = [row(LATEST, { cost: 0, revenue: 0, conversions: 0 })]
  assert.deepEqual(summarizeSameWeekday(rows, LATEST).trend[0], {
    date: LATEST,
    cost: 0,
    revenue: 0,
    roas: null,
    cpa: null,
  })
})

test('S14 [정상] 매체 필터 → NAVER 값만', () => {
  const rows = [
    row(LATEST, { media: 'NAVER', cost: 100000 }),
    row(LATEST, { media: 'META', cost: 50000 }),
  ]
  const result = summarizeSameWeekday(filterByMedia(rows, 'NAVER'), LATEST)
  assert.equal(card(result, 'cost').current, 100000)
})

test('S15 [예외] 데이터 없음 → null', () => {
  assert.equal(summarizeSameWeekday([], null), null)
})
