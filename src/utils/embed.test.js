import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isEmbedded } from './embed.js'

// 한클래스 보고서 페이지(report.html) 안에 끼워 넣어 열렸는지
test('주소에 embed=1 이 있으면 끼워 넣은 화면', () => {
  assert.equal(isEmbedded('?embed=1', false), true)
})

test('다른 페이지 틀(iframe) 안에서 열리면 끼워 넣은 화면', () => {
  assert.equal(isEmbedded('', true), true)
})

test('단독으로 열면 끼워 넣은 화면이 아님', () => {
  assert.equal(isEmbedded('', false), false)
  assert.equal(isEmbedded('?embed=0&media=META', false), false)
})
