import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterByMedia } from './media.js'
import {
  buildDailyTable,
  buildMonthTable,
  calcCostPer,
  summarizeTotals,
} from './metrics.js'

const LATEST = '2026-10-07'

const METRIC_KEYS = [
  'cost',
  'impressions',
  'clicks',
  'carts',
  'conversions',
  'revenue',
  'ctr',
  'cpc',
  'cpb',
  'cpa',
  'roas',
]

// 시나리오 문서의 기본값: META, 나머지 숫자는 0
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
    conversions: 0,
    revenue: 0,
    ...overrides,
  }
}

function assertAllNull(item) {
  for (const key of METRIC_KEYS) assert.equal(item[key], null, key)
}

// ---- summarizeTotals · calcCostPer ----

test('S1 [정상] 11칸 → CTR 2.5 · CPC 400 · CPB 2,000 · CPA 5,000 · ROAS 350', () => {
  const rows = [
    row(LATEST, {
      cost: 100000,
      impressions: 10000,
      clicks: 250,
      carts: 50,
      conversions: 20,
      revenue: 350000,
    }),
  ]
  assert.deepEqual(summarizeTotals(rows), {
    cost: 100000,
    impressions: 10000,
    clicks: 250,
    carts: 50,
    conversions: 20,
    revenue: 350000,
    ctr: 2.5,
    cpc: 400,
    cpb: 2000,
    cpa: 5000,
    roas: 350,
  })
})

test('S2 [정상] 합계끼리 → ROAS 180 (평균 300 아님)', () => {
  const rows = [
    row(LATEST, { cost: 20000, revenue: 100000 }),
    row(LATEST, { cost: 80000, revenue: 80000 }),
  ]
  assert.equal(summarizeTotals(rows).roas, 180)
})

test('S3 [경계] 분모 0 → 비율 5칸 null, 개수 6칸 0', () => {
  const result = summarizeTotals([row(LATEST)])
  for (const key of ['ctr', 'cpc', 'cpb', 'cpa', 'roas']) {
    assert.equal(result[key], null, key)
  }
  for (const key of METRIC_KEYS.slice(0, 6)) assert.equal(result[key], 0, key)
})

test('S4 [경계] 분모 1 → calcCostPer(1000, 1) = 1000', () => {
  assert.equal(calcCostPer(1000, 1), 1000)
})

test('S5 [예외] 줄 없음 → 11칸 모두 null', () => {
  assertAllNull(summarizeTotals([]))
})

// ---- buildMonthTable ----

test("S6 [정상] 최신 월이 위 → ['10월 (1~7일)', '9월', '8월']", () => {
  const rows = ['2026-08-10', '2026-09-10', '2026-10-05'].map((date) =>
    row(date, { cost: 100000 }),
  )
  assert.deepEqual(
    buildMonthTable(rows, LATEST).map((item) => item.label),
    ['10월 (1~7일)', '9월', '8월'],
  )
})

test('S7 [경계] 데이터 없는 달 → 8월 11칸 모두 null', () => {
  const rows = ['2026-09-10', '2026-10-05'].map((date) =>
    row(date, { cost: 100000 }),
  )
  assertAllNull(buildMonthTable(rows, LATEST)[2])
})

test('S8 [경계] 범위 끝 → 07/31 빠지고 8월 광고비 100,000', () => {
  const rows = [
    row('2026-07-31', { cost: 50000 }),
    row('2026-08-01', { cost: 100000 }),
    row('2026-10-05', { cost: 100000 }),
  ]
  assert.equal(buildMonthTable(rows, LATEST)[2].cost, 100000)
})

test('S9 [예외] 데이터 없음 → []', () => {
  assert.deepEqual(buildMonthTable([], null), [])
})

// ---- buildDailyTable ----

test("S10 [정상] 최신 날짜가 위 → 14줄, '10/7(수)' … '9/24(목)'", () => {
  const result = buildDailyTable([row(LATEST, { cost: 100000 })], LATEST)
  assert.equal(result.length, 14)
  assert.equal(result[0].label, '10/7(수)')
  assert.equal(result[13].label, '9/24(목)')
})

test('S11 [경계] 14일 경계 → 9/24 는 [13], 9/23 은 없음', () => {
  const rows = [
    row('2026-09-23', { cost: 50000 }),
    row('2026-09-24', { cost: 100000 }),
    row(LATEST, { cost: 100000 }),
  ]
  const result = buildDailyTable(rows, LATEST)
  assert.equal(result[13].cost, 100000)
  assert.ok(!result.some((item) => item.label.startsWith('9/23')))
})

test('S12 [경계] 빈 날 → 10/6 11칸 모두 null', () => {
  const result = buildDailyTable([row(LATEST, { cost: 100000 })], LATEST)
  assert.equal(result[1].label, '10/6(화)')
  assertAllNull(result[1])
})

test('S13 [정상] 매체 필터 → NAVER 광고비만', () => {
  const rows = [
    row(LATEST, { media: 'NAVER', cost: 100000 }),
    row(LATEST, { media: 'META', cost: 50000 }),
  ]
  assert.equal(
    buildDailyTable(filterByMedia(rows, 'NAVER'), LATEST)[0].cost,
    100000,
  )
})

test('S14 [예외] 데이터 없음 → []', () => {
  assert.deepEqual(buildDailyTable([], null), [])
})
