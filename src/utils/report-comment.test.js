import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReportComment } from './report-comment.js'

function row(reportDate, cost, conversions, revenue) {
  return {
    reportDate,
    cost,
    conversions,
    revenue,
    impressions: 1000,
    clicks: 100,
    carts: 10,
  }
}

test('전일과 정확히 7일 전을 비교하고 합계로 CPA를 계산한다', () => {
  const result = buildReportComment(
    [
      row('2026-10-19', 100, 1, 200),
      row('2026-10-19', 300, 9, 600),
      row('2026-10-18', 200, 10, 400),
      row('2026-10-12', 400, 5, 400),
    ],
    '2026-10-19',
  )
  assert.match(result.comparisons[0].text, /광고비 100% 증가, 구매 동일/)
  assert.match(result.comparisons[0].text, /CPA는 100% 증가/)
  assert.match(result.comparisons[1].text, /2026-10-12/)
  assert.match(result.comparisons[1].text, /CPA는 50% 감소/)
  assert.match(result.comparisons[1].text, /100%p 상승/)
})

test('빈 날짜는 0으로 대체하거나 가장 가까운 날짜로 비교하지 않는다', () => {
  const result = buildReportComment(
    [row('2026-10-19', 100, 1, 200), row('2026-10-17', 100, 1, 200)],
    '2026-10-19',
  )
  assert.ok(
    result.comparisons.every((item) => item.text.includes('데이터가 없어')),
  )
  assert.equal(buildReportComment([], '2026-10-19'), null)
  assert.equal(buildReportComment([], null), null)
})

test('0원·0건은 나눗셈 오류 없이 처리하고 0 기준 증감률을 만들지 않는다', () => {
  const result = buildReportComment(
    [row('2026-10-19', 100, 2, 300), row('2026-10-18', 0, 0, 0)],
    '2026-10-19',
  )
  assert.match(result.comparisons[0].text, /기존 0에서 발생/)
  assert.match(result.comparisons[0].text, /CPA 비교는 생략/)
  assert.match(result.comparisons[0].text, /ROAS 비교는 생략/)
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/)
})
