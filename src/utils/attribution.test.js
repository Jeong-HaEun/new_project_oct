import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAiReport } from './ai-report.js'
import {
  buildMediaAttribution,
  refineReportComment,
} from '../../supabase/functions/report-comment/handler.js'

function sample(current = [180, 110, 110], previous = [100, 100, 100]) {
  const rows = ['NAVER', 'META', 'GOOGLE'].flatMap((media, index) => [
    {
      reportDate: '2026-10-20',
      media,
      campaignName: '테스트',
      cost: 100,
      impressions: 1000,
      clicks: 10,
      carts: 5,
      conversions: 2,
      revenue: current[index],
    },
    {
      reportDate: '2026-10-19',
      media,
      campaignName: '테스트',
      cost: 100,
      impressions: 1000,
      clicks: 10,
      carts: 5,
      conversions: 2,
      revenue: previous[index],
    },
  ])
  return buildAiReport(rows, '2026-10-20')
}

test('전체 매체 합계로 매출 증가액과 증가 매체 기준 비중을 검증한다', () => {
  const evidence = buildMediaAttribution(sample())
  assert.equal(evidence[0].media, 'NAVER')
  assert.equal(evidence[0].delta, 80)
  assert.equal(evidence[0].share, 80)
})

test('기여가 분산·동률이거나 합계 불일치·데이터 누락이면 주도 매체를 정하지 않는다', () => {
  assert.deepEqual(buildMediaAttribution(sample([140, 135, 125])), [])
  assert.deepEqual(buildMediaAttribution(sample([150, 150, 100])), [])
  assert.deepEqual(buildMediaAttribution(sample([90, 80, 70])), [])
  const inconsistent = sample()
  inconsistent.periods[0].metrics.revenue++
  assert.deepEqual(buildMediaAttribution(inconsistent), [])
  const missing = sample()
  missing.media[0].periods[1].metrics = null
  assert.deepEqual(buildMediaAttribution(missing), [])
})

test('다른 매체가 감소한 경우 순증가액을 분모로 과장하지 않는다', () => {
  const evidence = buildMediaAttribution(sample([180, 90, 120]))
  assert.equal(evidence[0].share, 80)
})

test('과장 표현과 근거 없는 매체 기여 문장을 제거하고 소수점은 보존한다', () => {
  const text = refineReportComment(
    'CPA가 유의미하게 개선됐습니다. ROAS는 58.19%p 상승했습니다. 네이버와 구글이 매출 확대를 주도했습니다.',
    sample([140, 135, 125]),
  )
  assert.doesNotMatch(text, /유의미|주도|네이버|구글/)
  assert.match(text, /58\.19%p/)
  const verified = refineReportComment(
    '구매 효율이 개선됐습니다. 구글이 성과를 주도했습니다.',
    sample(),
  )
  assert.doesNotMatch(verified, /구글.*주도/)
  assert.match(verified, /네이버 매출은 80원 증가/)
  assert.match(verified, /80\.0%/)
})

test('지표 띄어쓰기와 비교 기준을 교정하고 우회적인 기여 표현도 제거한다', () => {
  const text = refineReportComment(
    '전주 대비 구매전환율이 개선됐고 전환당비용은 9,058원입니다. 네이버와 구글이 매출 확대를 뒷받침했습니다.',
    sample([140, 135, 125]),
  )
  assert.match(text, /전주 동요일 대비 구매 전환율/)
  assert.match(text, /전환당 비용은 9,058원/)
  assert.doesNotMatch(text, /뒷받침/)
})
