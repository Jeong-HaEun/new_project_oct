import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getReportWeather,
  normalizeWeatherContext,
} from '../../supabase/functions/report-comment/weather.js'

const context = normalizeWeatherContext({
  industry: '가전 관리',
  product: '에어컨 청소',
  regionId: 'seoul',
})
const dates = ['2026-10-18', '2026-10-17', '2026-10-11']
const now = new Date('2026-10-19T02:00:00Z')
const response = () =>
  Response.json({
    daily: {
      time: dates,
      temperature_2m_mean: [23, 18, 22],
      precipitation_sum: [0, 10, 0],
    },
  })

test('날씨 비활성·잘못된 지역·빈 업종을 구분한다', async () => {
  assert.throws(() =>
    normalizeWeatherContext({
      industry: '',
      product: '상품',
      regionId: 'seoul',
    }),
  )
  assert.throws(() =>
    normalizeWeatherContext({
      industry: '교육',
      product: '취업',
      regionId: 'unknown',
    }),
  )
  const disabled = normalizeWeatherContext({
    industry: '교육',
    product: '취업 교육',
    weatherEnabled: false,
    demandSeason: '상하반기 채용 시즌',
  })
  assert.equal(
    (
      await getReportWeather(
        disabled,
        dates,
        {},
        () => {
          throw new Error('호출 금지')
        },
        now,
      )
    ).status,
    'disabled',
  )
})

test('한국 시간의 세 날짜를 정확히 선택하고 유의한 변화만 후보로 제공한다', async () => {
  const weather = await getReportWeather(
    context,
    dates,
    {},
    async (url) => {
      const request = new URL(url)
      assert.equal(request.searchParams.get('timezone'), 'Asia/Seoul')
      assert.equal(request.searchParams.get('start_date'), '2026-10-11')
      assert.equal(request.searchParams.get('end_date'), '2026-10-18')
      return response()
    },
    now,
  )
  assert.equal(weather.status, 'available')
  assert.equal(weather.changes.length, 1)
  assert.equal(weather.changes[0].temperatureDelta, 5)
  assert.equal(weather.changes[0].precipitationDelta, -10)
})

test('미래·당일의 예보를 완료된 실제 날씨로 사용하지 않는다', async () => {
  const future = ['2026-10-20', '2026-10-19', '2026-10-13']
  const weather = await getReportWeather(
    context,
    future,
    {},
    async () =>
      Response.json({
        daily: {
          time: future,
          temperature_2m_mean: [40, 30, 20],
          precipitation_sum: [0, 0, 0],
        },
      }),
    now,
  )
  assert.equal(weather.days[0].status, 'incomplete')
  assert.equal(weather.days[1].status, 'incomplete')
  assert.deepEqual(weather.changes, [])
})

test('오래된 날짜는 과거 API를 쓰고 null·API 실패는 0으로 치환하지 않는다', async () => {
  const past = ['2026-08-20', '2026-08-19', '2026-08-13']
  const partial = await getReportWeather(
    context,
    past,
    {},
    async (url) => {
      assert.match(url, /archive-api.open-meteo.com/)
      return Response.json({
        daily: {
          time: past,
          temperature_2m_mean: [null, 20, 20],
          precipitation_sum: [0, 0, 0],
        },
      })
    },
    now,
  )
  assert.equal(partial.days[0].status, 'missing')
  assert.deepEqual(partial.changes, [])
  const failed = await getReportWeather(
    context,
    dates,
    {},
    async () => {
      throw new Error('timeout')
    },
    now,
  )
  assert.equal(failed.status, 'unavailable')
  assert.deepEqual(failed.changes, [])
})
