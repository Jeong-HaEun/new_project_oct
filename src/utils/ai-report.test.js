import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAiReport } from './ai-report.js'
import { handleRequest } from '../../supabase/functions/report-comment/handler.js'

const row = (reportDate, cost = 100, conversions = 2) => ({
  reportDate,
  media: 'META',
  campaignName: '비공개 고객 캠페인',
  creativeName: '비공개 소재',
  cost,
  conversions,
  revenue: 300,
  impressions: 1000,
  clicks: 10,
  carts: 4,
})
const report = buildAiReport(
  [row('2026-10-20'), row('2026-10-19')],
  '2026-10-20',
)
const env = {
  ADPORTER_AI_ENABLED: 'true',
  ADPORTER_GEMINI_API_KEY: 'test-key',
  ADPORTER_GEMINI_MODEL: 'test-model',
  ADPORTER_AI_ALLOWED_USER_IDS: 'user-1',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'server-test-key',
}
const request = (body = { report, note: '' }) =>
  new Request('http://localhost', {
    method: 'POST',
    headers: { Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  })

test('토큰 한도로 잘린 응답도 완성 문장이 있으면 부분 분석으로 반환하고 저장하지 않는다', async () => {
  let saved = false
  const response = await handleRequest(request(), env, async (url, options) => {
    if (url.includes('/auth/')) return Response.json({ id: 'user-1' })
    if (url.includes('/rpc/')) return Response.json({ id: 1, cached: false })
    if (options.method === 'PATCH') {
      saved = true
      return new Response(null, { status: 204 })
    }
    return Response.json({
      candidates: [
        {
          finishReason: 'MAX_TOKENS',
          content: {
            parts: [{ text: '구매 효율이 개선됐습니다. 다음으로 광고비는' }],
          },
        },
      ],
    })
  })
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.equal(result.partial, true)
  assert.equal(result.comment, '구매 효율이 개선됐습니다.')
  assert.equal(saved, false)
})

test('완성된 코멘트는 서버 저장에 실패해도 반환한다', async () => {
  const response = await handleRequest(request(), env, async (url, options) => {
    if (url.includes('/auth/')) return Response.json({ id: 'user-1' })
    if (url.includes('/rpc/')) return Response.json({ id: 1, cached: false })
    if (options.method === 'PATCH') throw new Error('저장 통신 실패')
    return Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: '구매 효율이 개선됐습니다.' }] },
        },
      ],
    })
  })
  const output = await response.json()
  assert.equal(response.status, 200)
  assert.equal(output.comment, '구매 효율이 개선됐습니다.')
  assert.equal(output.cacheSaved, false)
})

test('생성 통신 오류에는 실패 단계만 표시하고 비밀값은 노출하지 않는다', async () => {
  const response = await handleRequest(request(), env, async (url) => {
    if (url.includes('/auth/')) return Response.json({ id: 'user-1' })
    if (url.includes('/rpc/')) return Response.json({ id: 1, cached: false })
    throw new Error('test-key 비밀 오류')
  })
  const output = await response.json()
  assert.match(output.error, /Gemini 답변 생성 단계/)
  assert.doesNotMatch(output.error, /test-key/)
})

test('업종·수요 시기·날씨 근거를 함께 전달하고 날씨 API에는 광고 수치를 보내지 않는다', async () => {
  const context = {
    industry: '교육',
    product: '취업 교육',
    demandSeason: '상하반기 채용 시즌',
    weatherEnabled: true,
    regionId: 'seoul',
  }
  let weatherCalls = 0
  let savedWeather
  const response = await handleRequest(
    request({ report, note: '', context }),
    env,
    async (url, options) => {
      if (url.includes('/auth/')) return Response.json({ id: 'user-1' })
      if (url.includes('/rpc/')) return Response.json({ id: 2, cached: false })
      if (url.includes('open-meteo.com')) {
        weatherCalls++
        assert.equal(options.body, undefined)
        assert.doesNotMatch(url, /교육|revenue|cost/)
        return Response.json({
          daily: {
            time: ['2026-10-13'],
            temperature_2m_mean: [20],
            precipitation_sum: [0],
          },
        })
      }
      if (options.method === 'PATCH') {
        savedWeather = JSON.parse(options.body).weather_context
        return new Response(null, { status: 204 })
      }
      const payload = JSON.parse(
        JSON.parse(options.body).contents[0].parts[0].text,
      )
      assert.equal(payload.context.industry, '교육')
      assert.equal(payload.context.demandSeason, '상하반기 채용 시즌')
      assert.equal(payload.weather.source, 'Open-Meteo')
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ text: '전환 효율을 점검할 필요가 있습니다.' }],
            },
          },
        ],
      })
    },
  )
  assert.equal(response.status, 200)
  assert.equal(weatherCalls, 1)
  assert.equal(savedWeather.source, 'Open-Meteo')
})

test('AI 집계는 이름을 익명화하고 정확한 비교일과 전환율·객단가를 제공한다', () => {
  assert.doesNotMatch(JSON.stringify(report), /비공개/)
  assert.deepEqual(
    report.periods.map((period) => period.date),
    ['2026-10-20', '2026-10-19', '2026-10-13'],
  )
  assert.equal(report.periods[2].metrics, null)
  assert.equal(report.periods[0].metrics.conversionRate, 20)
  assert.equal(report.periods[0].metrics.averageOrderValue, 150)
})

test('인증 실패 시 Gemini를 호출하지 않는다', async () => {
  let calls = 0
  const response = await handleRequest(request(), env, async () => {
    calls++
    return new Response('{}', { status: 401 })
  })
  assert.equal(response.status, 401)
  assert.equal(calls, 1)
})

test('허용되지 않은 계정은 AI를 호출할 수 없다', async () => {
  const response = await handleRequest(request(), env, async () =>
    Response.json({ id: 'other-user' }),
  )
  assert.equal(response.status, 403)
})

test('Gemini에는 집계·메모만 보내며 키는 응답에 노출하지 않는다', async () => {
  let calls = 0
  const response = await handleRequest(request(), env, async (url, options) => {
    if (url.includes('/rpc/')) return Response.json({ id: 1, cached: false })
    if (options.method === 'PATCH') return new Response(null, { status: 204 })
    if (++calls === 1) return Response.json({ id: 'user-1' })
    assert.match(url, /streamGenerateContent/)
    assert.equal(options.headers['x-goog-api-key'], 'test-key')
    assert.equal(
      JSON.parse(options.body).generationConfig.maxOutputTokens,
      8192,
    )
    assert.doesNotMatch(options.body, /비공개/)
    return Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: '구매 효율이 개선됐습니다.' }] },
        },
      ],
    })
  })
  const output = await response.json()
  assert.ok(Number.isFinite(Date.parse(output.generatedAt)))
  assert.deepEqual(
    { ...output, generatedAt: undefined },
    {
      comment: '구매 효율이 개선됐습니다.',
      cached: false,
      cacheSaved: true,
      generatedAt: undefined,
      weather: { status: 'disabled', days: [], changes: [] },
      research: { status: 'disabled_cost', items: [] },
    },
  )
})

test('사용량 제한과 잘린 응답은 성공 코멘트로 반환하지 않는다', async () => {
  for (const providerResponse of [
    new Response('{}', { status: 429 }),
    new Response('{}', { status: 503 }),
    Response.json({
      candidates: [
        {
          finishReason: 'MAX_TOKENS',
          content: { parts: [{ text: '미완성' }] },
        },
      ],
    }),
  ]) {
    let calls = 0
    const response = await handleRequest(request(), env, async (url) => {
      if (url.includes('/rpc/')) return Response.json({ id: 1, cached: false })
      return ++calls === 1 ? Response.json({ id: 'user-1' }) : providerResponse
    })
    assert.equal(response.status, 502)
    const body = await response.json()
    const error = body.error
    assert.ok(error)
    if (providerResponse.status === 503)
      assert.equal(body.code, 'AI_PROVIDER_UNAVAILABLE')
    if (providerResponse.status === 200) assert.match(error, /MAX_TOKENS/)
  }
})

test('일일 한도·호출 간격 거절과 DB 장애 시 Gemini를 호출하지 않는다', async () => {
  for (const reservation of [
    Response.json({ error: '오늘 한도 도달' }),
    new Response('{}', { status: 500 }),
  ]) {
    let providerCalls = 0
    const response = await handleRequest(request(), env, async (url) => {
      if (url.includes('/auth/')) return Response.json({ id: 'user-1' })
      if (url.includes('/rpc/')) return reservation
      providerCalls++
      throw new Error('Gemini 호출 금지')
    })
    assert.ok([429, 503].includes(response.status))
    assert.equal(providerCalls, 0)
  }
})

test('저장된 동일 요청은 Gemini 호출 없이 재사용한다', async () => {
  const response = await handleRequest(request(), env, async (url) => {
    if (url.includes('/auth/')) return Response.json({ id: 'user-1' })
    if (url.includes('/rpc/'))
      return Response.json({ cached: true, comment: '저장된 분석' })
    throw new Error('외부 AI 재호출 금지')
  })
  assert.deepEqual(await response.json(), {
    cached: true,
    comment: '저장된 분석',
    generatedAt: null,
    weather: null,
    research: null,
  })
})

test('같은 데이터의 행 순서 변경은 분석 입력을 바꾸지 않는다', () => {
  const rows = [
    row('2026-10-20'),
    { ...row('2026-10-20'), media: 'NAVER', campaignName: '다른 캠페인' },
    row('2026-10-19'),
  ]
  assert.deepEqual(
    buildAiReport(rows, '2026-10-20'),
    buildAiReport([...rows].reverse(), '2026-10-20'),
  )
  assert.notDeepEqual(
    buildAiReport(rows, '2026-10-20'),
    buildAiReport([...rows, row('2026-10-20')], '2026-10-20'),
  )
})

test('자동 분석 준비 확인은 사용자 인증 후 응답하며 Gemini·DB를 호출하지 않는다', async () => {
  let calls = 0
  const response = await handleRequest(
    new Request('http://localhost', {
      headers: { Authorization: 'Bearer token' },
    }),
    env,
    async (url) => {
      calls++
      assert.match(url, /auth\/v1\/user/)
      return Response.json({ id: 'user-1' })
    },
  )
  assert.equal(calls, 1)
  assert.deepEqual(await response.json(), {
    protocol: 'adporter-limits-v1',
    weatherSupported: true,
    researchSupported: true,
    costControlsVersion: 'no-search-v1',
    partialSupported: true,
  })
})

test('AI 활성화 전에는 인증·DB·Gemini 등 외부 요청을 하나도 하지 않는다', async () => {
  const response = await handleRequest(
    request(),
    { ...env, ADPORTER_AI_ENABLED: undefined },
    async () => {
      throw new Error('외부 호출 금지')
    },
  )
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /비용 발생 방지/)
})

test('키 미설정·잘못된 데이터는 외부 AI 호출 없이 안내한다', async () => {
  assert.equal((await handleRequest(request(), {})).status, 503)
  assert.equal(
    (
      await handleRequest(request({ report: {}, note: '' }), env, async () =>
        Response.json({ id: 'user-1' }),
      )
    ).status,
    400,
  )
})
