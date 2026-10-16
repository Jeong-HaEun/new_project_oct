import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatMonthLabel, getRecentMonthRanges } from './dates.js'
import { filterByMedia } from './media.js'
import { summarizeMonthTrend } from './metrics.js'

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

function month(result, label) {
  return result.find((item) => item.label === label)
}

// ---- getRecentMonthRanges ----

test('S1 [정상] 보통 → 8월 · 9월 · 10월 1~7일', () => {
  assert.deepEqual(getRecentMonthRanges('2026-10-07'), [
    { start: '2026-08-01', end: '2026-08-31' },
    { start: '2026-09-01', end: '2026-09-30' },
    { start: '2026-10-01', end: '2026-10-07' },
  ])
})

test('S2 [경계] 해 넘김 → 2025-11 · 2025-12 · 2026-01', () => {
  assert.deepEqual(getRecentMonthRanges('2026-01-15'), [
    { start: '2025-11-01', end: '2025-11-30' },
    { start: '2025-12-01', end: '2025-12-31' },
    { start: '2026-01-01', end: '2026-01-15' },
  ])
})

test('S3 [경계] 2월 말일 → 2/1~2/28', () => {
  assert.deepEqual(getRecentMonthRanges('2026-03-10'), [
    { start: '2026-01-01', end: '2026-01-31' },
    { start: '2026-02-01', end: '2026-02-28' },
    { start: '2026-03-01', end: '2026-03-10' },
  ])
})

test('S4 [경계] 기준일이 1일 → 이번 달 10/1~10/1', () => {
  assert.deepEqual(getRecentMonthRanges('2026-10-01')[2], {
    start: '2026-10-01',
    end: '2026-10-01',
  })
})

// ---- formatMonthLabel ----

test("S5 [정상] 진행 중인 달 → '10월 (1~7일)'", () => {
  assert.equal(
    formatMonthLabel({ start: '2026-10-01', end: '2026-10-07' }),
    '10월 (1~7일)',
  )
})

test("S6 [경계] 말일 -1 → '10월 (1~30일)'", () => {
  assert.equal(
    formatMonthLabel({ start: '2026-10-01', end: '2026-10-30' }),
    '10월 (1~30일)',
  )
})

test("S7 [경계] 말일 → '10월'", () => {
  assert.equal(
    formatMonthLabel({ start: '2026-10-01', end: '2026-10-31' }),
    '10월',
  )
})

test("S8 [경계] 하루 → '11월 (1일)'", () => {
  assert.equal(
    formatMonthLabel({ start: '2026-11-01', end: '2026-11-01' }),
    '11월 (1일)',
  )
})

test("S9 [정상] 다 찬 지난달 → '9월'", () => {
  assert.equal(
    formatMonthLabel({ start: '2026-09-01', end: '2026-09-30' }),
    '9월',
  )
})

// ---- summarizeMonthTrend ----

test('S10 [정상] 3개월 값 → 오래된 달 먼저, 달마다 ROAS · CPA', () => {
  const rows = [
    row('2026-08-10', { cost: 100000, revenue: 300000, conversions: 10 }),
    row('2026-09-10', { cost: 200000, revenue: 800000, conversions: 10 }),
    row('2026-10-05', { cost: 100000, revenue: 500000, conversions: 4 }),
  ]
  assert.deepEqual(summarizeMonthTrend(rows, LATEST), [
    { label: '8월', roas: 300, cpa: 10000 },
    { label: '9월', roas: 400, cpa: 20000 },
    { label: '10월 (1~7일)', roas: 500, cpa: 25000 },
  ])
})

test('S11 [정상] 합계끼리 → 9월 ROAS 250 (평균 200 아님)', () => {
  const rows = [
    row('2026-09-10', { cost: 100000, revenue: 100000 }),
    row('2026-09-11', { cost: 300000, revenue: 900000 }),
    row(LATEST, { cost: 100000, revenue: 100000 }),
  ]
  assert.equal(month(summarizeMonthTrend(rows, LATEST), '9월').roas, 250)
})

test('S12 [경계] 데이터 없는 달 → 8월 ROAS · CPA null', () => {
  const rows = [
    row('2026-09-10', { cost: 100000, revenue: 300000 }),
    row(LATEST, { cost: 100000, revenue: 300000 }),
  ]
  const august = month(summarizeMonthTrend(rows, LATEST), '8월')
  assert.equal(august.roas, null)
  assert.equal(august.cpa, null)
})

test('S13 [경계] 구매 0 인 달 → ROAS 200, CPA null', () => {
  const rows = [
    row('2026-09-10', { cost: 100000, revenue: 200000, conversions: 0 }),
    row(LATEST, { cost: 100000, revenue: 300000 }),
  ]
  const september = month(summarizeMonthTrend(rows, LATEST), '9월')
  assert.equal(september.roas, 200)
  assert.equal(september.cpa, null)
})

test('S14 [경계] 범위 끝 → 07/31 은 빠지고 08/01 만 8월', () => {
  const rows = [
    row('2026-07-31', { cost: 100000, revenue: 900000 }),
    row('2026-08-01', { cost: 100000, revenue: 200000 }),
    row(LATEST, { cost: 100000, revenue: 300000 }),
  ]
  assert.equal(month(summarizeMonthTrend(rows, LATEST), '8월').roas, 200)
})

test('S15 [정상] 매체 필터 → NAVER 값만 (10월 ROAS 300)', () => {
  const rows = [
    row(LATEST, { media: 'NAVER', cost: 100000, revenue: 300000 }),
    row(LATEST, { media: 'META', cost: 100000, revenue: 100000 }),
  ]
  const result = summarizeMonthTrend(filterByMedia(rows, 'NAVER'), LATEST)
  assert.equal(month(result, '10월 (1~7일)').roas, 300)
})

test('S16 [예외] 데이터 없음 → []', () => {
  assert.deepEqual(summarizeMonthTrend([], null), [])
})
