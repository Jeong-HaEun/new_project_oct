import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWowBars } from './metrics.js'

function bars(previous, current) {
  return [
    { key: 'previous', label: '지난주', value: previous },
    { key: 'current', label: '이번 주', value: current },
  ]
}

test('S1 [정상] 광고비 카드 → 지난주 56,000 · 이번 주 70,000 막대', () => {
  const card = { key: 'cost', current: 70000, previous: 56000 }
  assert.deepEqual(buildWowBars(card), bars(56000, 70000))
})

test('S2 [경계] 지난주 없음 (전주 7일 미만) → null', () => {
  const card = { key: 'cost', current: 70000, previous: null }
  assert.equal(buildWowBars(card), null)
})

test('S3 [경계] 이번 주 ROAS 계산 불가 → 이번 주 값만 null', () => {
  const card = { key: 'roas', current: null, previous: 375 }
  assert.deepEqual(buildWowBars(card), bars(375, null))
})

test('S4 [경계] 두 값 모두 0 → 0 · 0 막대', () => {
  const card = { key: 'cost', current: 0, previous: 0 }
  assert.deepEqual(buildWowBars(card), bars(0, 0))
})

test('S5 [예외] 둘 다 계산 불가 → null', () => {
  const card = { key: 'cpa', current: null, previous: null }
  assert.equal(buildWowBars(card), null)
})
