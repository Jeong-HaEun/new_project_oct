import { supabase } from './supabase.js'
import { withDeadline } from '../utils/deadline.js'

const pending = new Map()

export async function loadAiNote(scope) {
  const { data } = await withDeadline(() => supabase.auth.getSession(), 5000)
  if (!data.session) return { key: null, note: '' }
  const key = `adporter-ai-note:${data.session.user.id}:${scope}`
  const profileKey = `adporter-ai-profile:${data.session.user.id}`
  try {
    let profile = null
    try {
      profile = JSON.parse(localStorage.getItem(profileKey) ?? 'null')
    } catch {
      /* 손상된 설정은 무시 */
    }
    const limit = Number(localStorage.getItem(`${profileKey}:limit`))
    return {
      key,
      note: localStorage.getItem(key) ?? '',
      profileKey,
      profile,
      limit: [10, 20, 30, 45, 60, 120, 150].includes(limit) ? limit : 150,
    }
  } catch {
    return { key, note: '', profileKey, profile: null }
  }
}

export function saveAiNote(key, note) {
  if (!key) return
  try {
    localStorage.setItem(key, note)
  } catch {
    /* 저장이 제한돼도 분석은 가능 */
  }
}

async function requestAiReport(
  report,
  note,
  context,
  signal,
  limit,
  deadlineAt,
) {
  if (!supabase) throw new Error('Supabase 연결 설정이 필요합니다.')
  // 이전 배포 코드에는 일일 한도가 없다. GET 확인에 성공한 새 서버만 자동 호출한다.
  const readiness = await supabase.functions.invoke('report-comment', {
    method: 'GET',
    signal,
    timeout: Math.min(8000, limit * 1000),
  })
  if (readiness.error) {
    const status = readiness.error.context?.status
    let detail = ''
    try {
      const body = await readiness.error.context?.json()
      detail = body?.error ?? body?.message ?? ''
    } catch {
      /* 네트워크·CORS 오류는 응답 본문이 없을 수 있다 */
    }
    if (status === 401)
      throw new Error(
        `서버 인증 오류(401): ${detail || '로그인 검증 실패'}. report-comment의 Verify JWT 설정을 OFF로 저장하고, Adporter에서 다시 로그인해 주세요.`,
      )
    if (status === 403) {
      // 허용 목록 밖의 계정(예: 한클래스 일반 회원)은 오류가 아니라 시연 대상 안내로 보여 준다
      const notAllowed = new Error('AI 분석은 시연 계정에서만 제공합니다.')
      notAllowed.code = 'AI_NOT_ALLOWED'
      throw notAllowed
    }
    if (status === 404)
      throw new Error(
        'report-comment 함수를 찾지 못했습니다(404). Adporter가 연결된 Supabase 프로젝트에 배포했는지 확인해 주세요.',
      )
    if (status === 405)
      throw new Error(
        '배포된 함수가 준비 확인(GET)을 지원하지 않습니다(405). 최신 handler.js로 Deploy updates를 실행해 주세요.',
      )
    throw new Error(
      detail ||
        `AI 서버 준비 확인에 실패했습니다${status ? ` (${status})` : ''}. 함수 배포 상태와 브라우저 네트워크 연결을 확인해 주세요.`,
    )
  }
  if (readiness.data?.protocol !== 'adporter-limits-v1')
    throw new Error(
      '자동 분석을 사용하려면 호출 한도 SQL과 최신 report-comment 함수를 먼저 적용해 주세요.',
    )
  if (context && !readiness.data.weatherSupported)
    throw new Error(
      '업종·날씨 분석을 사용하려면 최신 서버 코드와 weather.js를 배포해 주세요.',
    )
  if (readiness.data.costControlsVersion !== 'no-search-v1')
    throw new Error(
      '추가 비용 방지를 위해 이전 서버의 AI 호출을 차단했습니다. 비용 보호가 적용된 최신 handler.js를 배포해 주세요.',
    )
  if (!readiness.data.partialSupported)
    throw new Error(
      '시간 내 부분 분석을 받으려면 최신 handler.js를 배포해 주세요.',
    )
  signal.throwIfAborted()
  const { data, error } = await supabase.functions.invoke('report-comment', {
    body: {
      report,
      note,
      context,
      timeBudgetSec: Math.max(1, Math.floor((deadlineAt - Date.now()) / 1000)),
    },
    timeout: limit * 1000,
    signal,
  })
  if (error) {
    let message =
      'AI 서버에 연결하지 못했습니다. 서버 함수 배포와 로그인 상태를 확인해 주세요.'
    let code
    try {
      const response = await error.context?.json()
      if (response?.error) message = response.error
      code = response?.code
    } catch {
      /* 서버 응답이 없으면 기본 안내 */
    }
    const failure = new Error(message)
    if (code) failure.code = code
    throw failure
  }
  if (typeof data?.comment !== 'string' || !data.comment.trim())
    throw new Error('AI 응답이 비어 있습니다. 다시 시도해 주세요.')
  return {
    text: data.comment,
    generatedAt: data.generatedAt ?? null,
    cached: data.cached === true,
    cacheSaved: data.cacheSaved !== false,
    weather: data.weather ?? null,
    research: data.research ?? null,
    partial: data.partial === true,
  }
}

export async function generateAiReport(
  report,
  note,
  context = null,
  limit = 150,
) {
  if (!supabase) throw new Error('Supabase 연결 설정이 필요합니다.')
  const budget = [10, 20, 30, 45, 60, 120, 150].includes(limit) ? limit : 150
  const deadlineAt = Date.now() + budget * 1000
  let activeKey
  let activePromise
  // React 개발 모드·빠른 화면 전환에서 같은 요청을 합치되 계정 사이에는 공유하지 않는다.
  return withDeadline(async (signal) => {
    const { data, error } = await supabase.auth.getSession()
    signal.throwIfAborted()
    if (error || !data.session) throw new Error('다시 로그인해 주세요.')
    const key = JSON.stringify({
      user: data.session.user.id,
      report,
      note,
      context,
      budget,
    })
    if (!pending.has(key)) {
      const work = requestAiReport(
        report,
        note,
        context,
        signal,
        budget,
        deadlineAt,
      ).finally(() => {
        if (pending.get(key) === work) pending.delete(key)
      })
      pending.set(key, work)
    }
    activeKey = key
    activePromise = pending.get(key)
    return activePromise
  }, budget * 1000).finally(() => {
    if (activeKey && pending.get(activeKey) === activePromise)
      pending.delete(activeKey)
  })
}
