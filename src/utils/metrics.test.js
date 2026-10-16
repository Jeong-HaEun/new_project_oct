import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sumTotals,
  calcRoas,
  calcCpa,
  compareChange,
  summarizeCards,
} from './metrics.js'

// 숫자 칸만 바꿔 쓰는 줄 하나
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

const CURRENT_DATES = [
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
]
const PREVIOUS_DATES = [
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-09-27',
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
]

// 공통 예시 데이터: 이번 주 하루 10,000·35,000·2 / 전주 하루 8,000·30,000·1
function sampleRows({ current = {}, previousDates = PREVIOUS_DATES } = {}) {
  return [
    ...CURRENT_DATES.map((date) =>
      row(date, { cost: 10000, revenue: 35000, conversions: 2, ...current }),
    ),
    ...previousDates.map((date) =>
      row(date, { cost: 8000, revenue: 30000, conversions: 1 }),
    ),
  ]
}

const SAMPLE_CARDS = [
  {
    key: 'cost',
    title: '총 광고비',
    current: 70000,
    previous: 56000,
    change: { direction: 'up', label: '변화', tone: 'neutral' },
  },
  {
    key: 'revenue',
    title: '총 매출',
    current: 245000,
    previous: 210000,
    change: { direction: 'up', label: '개선', tone: 'good' },
  },
  {
    key: 'roas',
    title: '전체 ROAS',
    current: 350,
    previous: 375,
    change: { direction: 'down', label: '악화', tone: 'bad' },
  },
  {
    key: 'cpa',
    title: '전체 CPA',
    current: 5000,
    previous: 8000,
    change: { direction: 'down', label: '개선', tone: 'good' },
  },
]

function cardOf(cards, key) {
  return cards.find((card) => card.key === key)
}

// sumTotals

test('S24 [정상] 2줄의 숫자 칸 합계', () => {
  const rows = [
    row('2026-10-01', {
      cost: 100000,
      impressions: 25000,
      clicks: 600,
      carts: 80,
      conversions: 20,
      revenue: 350000,
    }),
    row('2026-10-01', {
      cost: 50000,
      impressions: 10000,
      clicks: 300,
      carts: 40,
      conversions: 5,
      revenue: 100000,
    }),
  ]
  assert.deepEqual(sumTotals(rows), {
    cost: 150000,
    impressions: 35000,
    clicks: 900,
    carts: 120,
    conversions: 25,
    revenue: 450000,
  })
})

test('S25 [예외] 데이터가 없으면 모두 0', () => {
  assert.deepEqual(sumTotals([]), {
    cost: 0,
    impressions: 0,
    clicks: 0,
    carts: 0,
    conversions: 0,
    revenue: 0,
  })
})

// calcRoas

test('S26 [정상] 매출 350,000 ÷ 광고비 100,000 → 350', () => {
  assert.equal(calcRoas(350000, 100000), 350)
})

test('S27 [경계] 광고비 0 → null', () => {
  assert.equal(calcRoas(350000, 0), null)
})

test('S28 [경계] 광고비 1 → 300', () => {
  assert.equal(calcRoas(3, 1), 300)
})

test('S29 [경계] 매출 0 → 0 (0%는 계산 가능)', () => {
  assert.equal(calcRoas(0, 100000), 0)
})

// calcCpa

test('S30 [정상] 광고비 100,000 ÷ 구매 20 → 5000', () => {
  assert.equal(calcCpa(100000, 20), 5000)
})

test('S31 [경계] 구매 0 → null', () => {
  assert.equal(calcCpa(100000, 0), null)
})

test('S32 [경계] 구매 1 → 100000', () => {
  assert.equal(calcCpa(100000, 1), 100000)
})

test('S33 [정상] 나누어떨어지지 않으면 반올림하지 않는다', () => {
  const result = calcCpa(100000, 3)
  assert.ok(Math.abs(result - 33333.33) < 0.01, `받은 값: ${result}`)
})

// compareChange

test('S34 [정상] 매출 오름 → 개선', () => {
  assert.deepEqual(compareChange(245000, 210000, 'up'), {
    direction: 'up',
    label: '개선',
    tone: 'good',
  })
})

test('S35 [정상] 매출 내림 → 악화', () => {
  assert.deepEqual(compareChange(200000, 210000, 'up'), {
    direction: 'down',
    label: '악화',
    tone: 'bad',
  })
})

test('S36 [정상] CPA 오름 → 악화', () => {
  assert.deepEqual(compareChange(6000, 5000, 'down'), {
    direction: 'up',
    label: '악화',
    tone: 'bad',
  })
})

test('S37 [정상] CPA 내림 → 개선', () => {
  assert.deepEqual(compareChange(4000, 5000, 'down'), {
    direction: 'down',
    label: '개선',
    tone: 'good',
  })
})

test('S38 [정상] 광고비 오름 → 회색 변화', () => {
  assert.deepEqual(compareChange(70000, 56000, 'none'), {
    direction: 'up',
    label: '변화',
    tone: 'neutral',
  })
})

test('S39 [정상] 광고비 내림 → 회색 변화', () => {
  assert.deepEqual(compareChange(50000, 56000, 'none'), {
    direction: 'down',
    label: '변화',
    tone: 'neutral',
  })
})

test('S40 [경계] 전주보다 1 낮음 → 악화', () => {
  assert.deepEqual(compareChange(99, 100, 'up'), {
    direction: 'down',
    label: '악화',
    tone: 'bad',
  })
})

test('S41 [경계] 전주와 같음 → 회색 변화 없음', () => {
  assert.deepEqual(compareChange(100, 100, 'up'), {
    direction: 'same',
    label: '변화 없음',
    tone: 'neutral',
  })
})

test('S42 [경계] 전주보다 1 높음 → 개선', () => {
  assert.deepEqual(compareChange(101, 100, 'up'), {
    direction: 'up',
    label: '개선',
    tone: 'good',
  })
})

test('S43 [예외] 이번 주 값이 계산 불가면 null', () => {
  assert.equal(compareChange(null, 375, 'up'), null)
})

test('S44 [예외] 전주 값이 계산 불가면 null', () => {
  assert.equal(compareChange(350, null, 'up'), null)
})

// summarizeCards

test('S45 [정상] 공통 예시 데이터로 카드 4개', () => {
  assert.deepEqual(summarizeCards(sampleRows(), '2026-10-07'), SAMPLE_CARDS)
})

test('S46 [경계] 이번 주 구매 0 → CPA 만 계산 불가', () => {
  const cards = summarizeCards(
    sampleRows({ current: { conversions: 0 } }),
    '2026-10-07',
  )
  assert.deepEqual(cardOf(cards, 'cpa'), {
    key: 'cpa',
    title: '전체 CPA',
    current: null,
    previous: 8000,
    change: null,
  })
  assert.deepEqual(
    cards.filter((card) => card.key !== 'cpa'),
    SAMPLE_CARDS.filter((card) => card.key !== 'cpa'),
  )
})

test('S47 [경계] 이번 주 광고비·매출·구매 모두 0 → ROAS·CPA 계산 불가', () => {
  const cards = summarizeCards(
    sampleRows({ current: { cost: 0, revenue: 0, conversions: 0 } }),
    '2026-10-07',
  )
  assert.equal(cardOf(cards, 'cost').current, 0)
  assert.equal(cardOf(cards, 'roas').current, null)
  assert.equal(cardOf(cards, 'roas').change, null)
  assert.equal(cardOf(cards, 'cpa').current, null)
  assert.equal(cardOf(cards, 'cpa').change, null)
})

test('S48 [경계] 전주 6일치 → 전주 값·비교 모두 null', () => {
  const cards = summarizeCards(
    sampleRows({ previousDates: PREVIOUS_DATES.slice(1) }),
    '2026-10-07',
  )
  assert.deepEqual(
    cards,
    SAMPLE_CARDS.map((card) => ({ ...card, previous: null, change: null })),
  )
})

test('S49 [경계] 전주 7일치 + 범위 밖 9/23 → 9/23 은 안 들어감', () => {
  const rows = [...sampleRows(), row('2026-09-23', { cost: 999999 })]
  assert.deepEqual(summarizeCards(rows, '2026-10-07'), SAMPLE_CARDS)
})
