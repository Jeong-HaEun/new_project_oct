import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatMonthRange, getMonthToDateRanges } from './dates.js'
import { buildPeriodBars, calcMomDelta, summarizeMom } from './metrics.js'
import { formatDelta } from './format.js'

function row(reportDate, numbers) {
  return {
    reportDate,
    media: 'NAVER',
    campaignName: '가을 세일',
    adGroupName: '검색_브랜드',
    creativeName: '소재A',
    cost: 0,
    impressions: 0,
    clicks: 0,
    carts: 0,
    conversions: 0,
    revenue: 0,
    ...numbers,
  }
}

// days('09', 1, 7) → ['2026-09-01', …, '2026-09-07']
function days(month, from, to) {
  const list = []
  for (let day = from; day <= to; day++) {
    list.push(`2026-${month}-${String(day).padStart(2, '0')}`)
  }
  return list
}

// 예시: 9/1~9/7 매일 8,000 · 30,000 · 1 / 10/1~10/7 매일 10,000 · 35,000 · 2
function sampleRows({ septemberDays = days('09', 1, 7) } = {}) {
  return [
    ...septemberDays.map((date) =>
      row(date, { cost: 8000, revenue: 30000, conversions: 1 }),
    ),
    ...days('10', 1, 7).map((date) =>
      row(date, { cost: 10000, revenue: 35000, conversions: 2 }),
    ),
  ]
}

function itemOf(items, key) {
  return items.find((item) => item.key === key)
}

function comparisonOf(item) {
  return { previous: item.previous, change: item.change, delta: item.delta }
}

const NO_PREVIOUS = { previous: null, change: null, delta: null }

// getMonthToDateRanges

test('S1 [정상] 10/7 → 10/1~10/7 vs 9/1~9/7', () => {
  assert.deepEqual(getMonthToDateRanges('2026-10-07'), {
    current: { start: '2026-10-01', end: '2026-10-07' },
    previous: { start: '2026-09-01', end: '2026-09-07' },
  })
})

test('S2 [경계] 달의 첫날 10/1 → 10/1~10/1 vs 9/1~9/1', () => {
  assert.deepEqual(getMonthToDateRanges('2026-10-01'), {
    current: { start: '2026-10-01', end: '2026-10-01' },
    previous: { start: '2026-09-01', end: '2026-09-01' },
  })
})

test('S3 [경계] 3/28 → 지난 2/1~2/28', () => {
  assert.deepEqual(getMonthToDateRanges('2026-03-28').previous, {
    start: '2026-02-01',
    end: '2026-02-28',
  })
})

test('S4 [경계] 3/29 (2월에 29일 없음) → 지난 2/1~2/28', () => {
  assert.deepEqual(getMonthToDateRanges('2026-03-29'), {
    current: { start: '2026-03-01', end: '2026-03-29' },
    previous: { start: '2026-02-01', end: '2026-02-28' },
  })
})

test('S5 [경계] 3/31 → 지난 2/1~2/28', () => {
  assert.deepEqual(getMonthToDateRanges('2026-03-31').previous, {
    start: '2026-02-01',
    end: '2026-02-28',
  })
})

test('S6 [경계] 1/15 (해가 바뀜) → 지난 2025-12-01~2025-12-15', () => {
  assert.deepEqual(getMonthToDateRanges('2026-01-15').previous, {
    start: '2025-12-01',
    end: '2025-12-15',
  })
})

// calcMomDelta · formatDelta

test('S7 [정상] CPA 11,000 ← 10,000 → 10%', () => {
  const delta = calcMomDelta('cpa', 11000, 10000)
  assert.deepEqual(delta, { value: 10, unit: '%' })
  assert.equal(formatDelta(delta), '10%')
})

test('S8 [정상] ROAS 431 ← 427 → 4%p', () => {
  const delta = calcMomDelta('roas', 431, 427)
  assert.deepEqual(delta, { value: 4, unit: '%p' })
  assert.equal(formatDelta(delta), '4%p')
})

test('S9 [경계] 광고비 0 ← 0 → null (빈 글자)', () => {
  const delta = calcMomDelta('cost', 0, 0)
  assert.equal(delta, null)
  assert.equal(formatDelta(delta), '')
})

test('S10 [경계] 12.5% → 13% (반올림)', () => {
  assert.equal(formatDelta({ value: 12.5, unit: '%' }), '13%')
})

test('S11 [예외] 이번 ROAS 계산 불가 → null', () => {
  assert.equal(calcMomDelta('roas', null, 375), null)
})

// summarizeMom

test('S12 [정상] 예시 → 4지표 이번 · 지난 · 변화 · 차이', () => {
  const items = summarizeMom(sampleRows(), '2026-10-07')
  assert.deepEqual(
    items.map((item) => item.key),
    ['cost', 'revenue', 'roas', 'cpa'],
  )

  const cost = itemOf(items, 'cost')
  assert.equal(cost.current, 70000)
  assert.equal(cost.previous, 56000)
  assert.equal(cost.change.label, '변화')
  assert.deepEqual(cost.delta, { value: 25, unit: '%' })

  const revenue = itemOf(items, 'revenue')
  assert.equal(revenue.change.label, '개선')
  assert.equal(formatDelta(revenue.delta), '17%')

  const roas = itemOf(items, 'roas')
  assert.equal(roas.current, 350)
  assert.equal(roas.previous, 375)
  assert.equal(roas.change.label, '악화')
  assert.deepEqual(roas.delta, { value: -25, unit: '%p' })

  const cpa = itemOf(items, 'cpa')
  assert.equal(cpa.current, 5000)
  assert.equal(cpa.previous, 8000)
  assert.equal(cpa.change.label, '개선')
  assert.deepEqual(cpa.delta, { value: -37.5, unit: '%' })
})

test('S13 [경계] 지난달 같은 기간 7일 중 6일만 → 비교 안 함', () => {
  const rows = sampleRows({ septemberDays: days('09', 1, 6) })
  const items = summarizeMom(rows, '2026-10-07')
  for (const item of items) {
    assert.deepEqual(comparisonOf(item), NO_PREVIOUS)
  }
  assert.equal(itemOf(items, 'cost').current, 70000)
})

test('S14 [경계] 범위 밖 9/8 줄은 빠짐 → S12 와 같음', () => {
  const rows = [
    ...sampleRows(),
    row('2026-09-08', { cost: 99999, revenue: 1, conversions: 9 }),
  ]
  assert.deepEqual(
    summarizeMom(rows, '2026-10-07'),
    summarizeMom(sampleRows(), '2026-10-07'),
  )
})

test('S15 [예외] 지난달 데이터 없음 → 비교 안 함', () => {
  const rows = sampleRows({ septemberDays: [] })
  for (const item of summarizeMom(rows, '2026-10-07')) {
    assert.deepEqual(comparisonOf(item), NO_PREVIOUS)
  }
})

// formatMonthRange · buildPeriodBars

test('S16 [정상] 10/1~10/7 → 10월 1~7일', () => {
  assert.equal(
    formatMonthRange({ start: '2026-10-01', end: '2026-10-07' }),
    '10월 1~7일',
  )
})

test('S17 [경계] 하루 10/1 → 10월 1일', () => {
  assert.equal(
    formatMonthRange({ start: '2026-10-01', end: '2026-10-01' }),
    '10월 1일',
  )
})

test('S18 [정상] 막대 이름을 넘겨받은 막대 2개', () => {
  assert.deepEqual(
    buildPeriodBars({ current: 350, previous: 375 }, '9월 1~7일', '10월 1~7일'),
    [
      { key: 'previous', label: '9월 1~7일', value: 375 },
      { key: 'current', label: '10월 1~7일', value: 350 },
    ],
  )
})
