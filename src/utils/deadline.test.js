import test from 'node:test'
import assert from 'node:assert/strict'
import { withDeadline } from './deadline.js'

test('제한 시간 안에 끝난 결과는 그대로 반환한다', async () => {
  assert.equal(await withDeadline(async () => '완료', 100), '완료')
})

test('끝나지 않는 작업도 제한 시간에 중단 신호와 오류를 반환한다', async () => {
  let signal
  await assert.rejects(
    withDeadline((value) => {
      signal = value
      return new Promise(() => {})
    }, 15),
    (error) => error.code === 'AI_DEADLINE',
  )
  assert.equal(signal.aborted, true)
})

test('시간 초과 전의 오류는 바꿔 쓰지 않는다', async () => {
  await assert.rejects(
    withDeadline(async () => {
      throw new Error('인증 오류')
    }, 100),
    /인증 오류/,
  )
})
