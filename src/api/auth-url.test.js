import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getOAuthRedirectUrl } from './auth-url.js'

// 카카오 로그인 후 돌아올 주소: 화면 이동용 # 과 ? 는 빼고 페이지 주소만 (Supabase Redirect URLs 와 일치해야 함)
test('배포 주소에서 # 화면 이동 부분을 뺀다', () => {
  const location = new URL(
    'https://jeong-haeun.github.io/new_project_oct/#/data?media=META',
  )
  assert.equal(
    getOAuthRedirectUrl(location),
    'https://jeong-haeun.github.io/new_project_oct/',
  )
})

test('로그인 결과로 붙은 ?code= 도 뺀다', () => {
  const location = new URL('http://localhost:5173/?code=abc#/')
  assert.equal(getOAuthRedirectUrl(location), 'http://localhost:5173/')
})

test('index.html 로 열어도 그 주소 그대로', () => {
  const location = new URL(
    'https://jeong-haeun.github.io/new_project_oct/index.html',
  )
  assert.equal(
    getOAuthRedirectUrl(location),
    'https://jeong-haeun.github.io/new_project_oct/index.html',
  )
})
