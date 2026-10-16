import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildFunnelInsights, compareFunnelByMedia } from './metrics.js'

const LATEST = '2026-10-07'

// byMedia 값과 lowest 로 comparison 을 만든다
function comparison(rates, lowest) {
  return {
    byMedia: ['NAVER', 'META', 'GOOGLE'].map((media) => ({
      media,
      rates: { ctr: 5, cartRate: 5, purchaseRate: 50, ...rates[media] },
    })),
    lowest: { ctr: [], cartRate: [], purchaseRate: [], ...lowest },
  }
}

test('S1 [정상] 한 단계만 최저 → META 담기율 문장 1개', () => {
  const input = comparison(
    {
      NAVER: { cartRate: 5 },
      META: { cartRate: 2.1 },
      GOOGLE: { cartRate: 4 },
    },
    { cartRate: ['META'] },
  )
  assert.deepEqual(buildFunnelInsights(input), [
    {
      key: 'cartRate',
      text: 'META의 담기율이 가장 낮아요 (2.10%)',
      action: '상품 상세 페이지를 점검해 보세요',
    },
  ])
})

test('S2 [정상] 세 단계 모두 → 퍼널 순서대로 3개, 할 일 3가지', () => {
  const input = comparison(
    {
      NAVER: { ctr: 1.2 },
      META: { cartRate: 2.1 },
      GOOGLE: { purchaseRate: 38.2 },
    },
    { ctr: ['NAVER'], cartRate: ['META'], purchaseRate: ['GOOGLE'] },
  )
  const result = buildFunnelInsights(input)
  assert.deepEqual(
    result.map((item) => item.key),
    ['ctr', 'cartRate', 'purchaseRate'],
  )
  assert.deepEqual(
    result.map((item) => item.action),
    [
      '소재 · 문구를 점검해 보세요',
      '상품 상세 페이지를 점검해 보세요',
      '결제 과정을 점검해 보세요',
    ],
  )
})

test('S3 [경계] 동점 2매체 → NAVER · META 함께', () => {
  const input = comparison(
    {
      NAVER: { cartRate: 2.1 },
      META: { cartRate: 2.1 },
      GOOGLE: { cartRate: 4 },
    },
    { cartRate: ['NAVER', 'META'] },
  )
  assert.equal(
    buildFunnelInsights(input)[0].text,
    'NAVER · META의 담기율이 가장 낮아요 (2.10%)',
  )
})

test('S4 [경계] 최저 없음 → []', () => {
  assert.deepEqual(buildFunnelInsights(comparison({}, {})), [])
})

test('S5 [정상] 실제 계산과 연결 → GOOGLE 장바구니→구매율 25.00%', () => {
  const rows = [
    ['NAVER', 10],
    ['META', 10],
    ['GOOGLE', 5],
  ].map(([media, conversions]) => ({
    reportDate: LATEST,
    media,
    campaignName: '캠페인1',
    adGroupName: '그룹1',
    creativeName: 'A',
    cost: 0,
    impressions: 1000,
    clicks: 100,
    carts: 20,
    conversions,
    revenue: 0,
  }))
  const result = buildFunnelInsights(compareFunnelByMedia(rows, LATEST))
  assert.deepEqual(
    result.map((item) => item.text),
    ['GOOGLE의 장바구니→구매율이 가장 낮아요 (25.00%)'],
  )
})
