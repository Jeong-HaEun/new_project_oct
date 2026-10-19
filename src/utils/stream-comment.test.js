import test from 'node:test'
import assert from 'node:assert/strict'
import {
  collectGeminiResponse,
  completeSentences,
} from '../../supabase/functions/report-comment/handler.js'

const encode = (value) => new TextEncoder().encode(value)
const frame = (text, finishReason) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, ...(finishReason ? { finishReason } : {}) }] })}\n\n`
test('분할된 SSE 프레임과 한글을 이어 완성 응답을 수집한다', async () => {
  const bytes = encode(
    frame('매출이 증가했습니다. ') + frame('ROAS도 개선됐습니다.', 'STOP'),
  )
  const response = new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7)
          controller.enqueue(bytes.slice(i, i + 7))
        controller.close()
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
  const result = await collectGeminiResponse(response, 1000)
  assert.equal(
    result.candidates[0].content.parts[0].text,
    '매출이 증가했습니다. ROAS도 개선됐습니다.',
  )
  assert.equal(result.candidates[0].finishReason, 'STOP')
})
test('제한 시간이 오면 이미 받은 문장을 보존하고 미완성 꼬리는 제외한다', async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          encode(frame('ROAS는 58.19%p 상승했습니다. 다음으로 광고비는')),
        )
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
  const result = await collectGeminiResponse(response, 15)
  assert.equal(result.candidates[0].finishReason, 'TIME_LIMIT')
  assert.equal(
    completeSentences(result.candidates[0].content.parts[0].text),
    'ROAS는 58.19%p 상승했습니다.',
  )
  assert.equal(completeSentences('아직 작성 중인 문장'), '')
})
test('추론 내용은 사용자용 부분 답변에 포함하지 않는다', async () => {
  const payload = {
    candidates: [
      {
        content: {
          parts: [
            { text: '내부 추론', thought: true },
            { text: '구매가 늘었습니다.' },
          ],
        },
        finishReason: 'STOP',
      },
    ],
  }
  const response = new Response(`data: ${JSON.stringify(payload)}\n\n`, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
  const result = await collectGeminiResponse(response, 1000)
  assert.equal(result.candidates[0].content.parts[0].text, '구매가 늘었습니다.')
})

test('안전 차단 종료는 대기 시간 초과나 통신 오류로 바뀌지 않는다', async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encode(frame('아직 검토할 문장입니다.', 'SAFETY')))
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
  const result = await collectGeminiResponse(response, 15)
  assert.equal(result.candidates[0].finishReason, 'SAFETY')
})
