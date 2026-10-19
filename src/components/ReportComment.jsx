import { buildReportComment } from '../utils/report-comment.js'
import { useEffect, useState } from 'react'
import { buildAiReport } from '../utils/ai-report.js'
import { generateAiReport, loadAiNote, saveAiNote } from '../api/ai-report.js'
import {
  WEATHER_REGIONS,
  normalizeWeatherContext,
} from '../../supabase/functions/report-comment/weather.js'

const EMPTY_PROFILE = {
  industry: '',
  product: '',
  demandSeason: '',
  regionId: '',
  weatherEnabled: false,
}

export function ReportComment({ rows, latestDate, media }) {
  const comment = buildReportComment(rows, latestDate)
  const [note, setNote] = useState('')
  const [appliedNote, setAppliedNote] = useState('')
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [appliedProfile, setAppliedProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [limit, setLimit] = useState(150)
  const [appliedLimit, setAppliedLimit] = useState(150)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [retry, setRetry] = useState(0)
  const [noteScope, setNoteScope] = useState(null)
  const scope = JSON.stringify([latestDate, media])
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState(null)
  const report = buildAiReport(rows, latestDate)
  const signature = JSON.stringify({
    report,
    note: appliedNote,
    media,
    context: appliedProfile,
    limit: appliedLimit,
  })
  const currentResult = result?.signature === signature ? result.text : null
  const loading = status?.signature === signature && status.loading
  const error = status?.signature === signature ? status.error : ''
  const notAllowed = Boolean(error) && status.code === 'AI_NOT_ALLOWED'
  const failed = Boolean(error) && !notAllowed
  const hasData = Boolean(comment)

  useEffect(() => {
    let active = true
    loadAiNote(scope)
      .then((saved) => {
        if (!active) return
        setNote(saved.note)
        setAppliedNote(saved.note)
        setLimit(Math.min(150, saved.limit ?? 150))
        setAppliedLimit(Math.min(150, saved.limit ?? 150))
        let context = null
        try {
          context = normalizeWeatherContext(saved.profile)
        } catch {
          /* 저장된 설정이 유효하지 않으면 재입력 */
        }
        setProfile(context ?? EMPTY_PROFILE)
        setAppliedProfile(context)
        setNoteScope({ scope, key: saved.key, profileKey: saved.profileKey })
      })
      .catch(() => {
        if (active) setNoteScope({ scope, key: null })
      })
    return () => {
      active = false
    }
  }, [scope])
  const noteReady = noteScope?.scope === scope
  const preparing =
    hasData &&
    (!noteReady || status?.signature !== signature || status?.attempt !== retry)
  const processing = Boolean(loading || preparing)
  useEffect(() => {
    if (!processing) return
    const startedAt = Date.now()
    setElapsedSeconds(0)
    const timer = setInterval(
      () =>
        setElapsedSeconds(
          Math.min(appliedLimit, Math.floor((Date.now() - startedAt) / 1000)),
        ),
      250,
    )
    return () => clearInterval(timer)
  }, [processing, signature, retry, appliedLimit])
  const hasUnsavedChanges =
    note.trim() !== appliedNote ||
    limit !== appliedLimit ||
    JSON.stringify(profile) !== JSON.stringify(appliedProfile ?? EMPTY_PROFILE)

  useEffect(() => {
    if (!hasData || !noteReady) return
    let active = true
    const timer = setTimeout(async () => {
      setStatus({ signature, attempt: retry, loading: true, error: '' })
      const input = JSON.parse(signature)
      try {
        const next = await generateAiReport(
          input.report,
          input.note,
          input.context,
          input.limit,
        )
        if (active) {
          setResult({ signature, ...next })
          setStatus({ signature, attempt: retry, loading: false, error: '' })
        }
      } catch (failure) {
        if (active) {
          if (
            ['AI_DEADLINE', 'AI_PROVIDER_UNAVAILABLE'].includes(failure.code)
          ) {
            setResult({
              signature,
              text: [
                comment.overview,
                ...comment.comparisons.map((item) => item.text),
              ].join('\n\n'),
              fallback: true,
              cached: false,
              generatedAt: null,
            })
          }
          setStatus({
            signature,
            attempt: retry,
            loading: false,
            error: failure.message,
            code: failure.code,
          })
        }
      }
    }, 500)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [signature, hasData, retry, noteReady])

  function handleGenerate() {
    let context = null
    try {
      if (
        profile.industry.trim() ||
        profile.product.trim() ||
        profile.weatherEnabled
      )
        context = normalizeWeatherContext(profile)
    } catch (failure) {
      setProfileError(failure.message)
      return
    }
    setProfileError('')
    setAppliedLimit(limit)
    saveAiNote(
      noteScope?.profileKey ? `${noteScope.profileKey}:limit` : null,
      String(limit),
    )
    setProfile(context ?? EMPTY_PROFILE)
    saveAiNote(noteScope?.profileKey, JSON.stringify(context))
    setAppliedProfile(context)
    saveAiNote(noteScope?.key, note.trim())
    if (note.trim() !== appliedNote) setAppliedNote(note.trim())
    else setRetry((value) => value + 1)
  }
  return (
    <section
      aria-labelledby="report-comment-title"
      className="mt-3 rounded-lg border border-hairline bg-surface p-4 md:p-5"
    >
      <h2
        id="report-comment-title"
        className="font-display text-lg font-bold text-ink"
      >
        성과 요약 코멘트
      </h2>
      <p className="mt-1 text-xs text-muted">
        {media ?? '전체 매체'} · {latestDate} 데이터 기준 ·{' '}
        {currentResult && !result.fallback
          ? 'Gemini AI 분석 초안'
          : '기본 자동 분석'}
      </p>
      {hasData && (
        <div
          role={failed && !processing ? 'alert' : 'status'}
          aria-live="polite"
          aria-atomic="true"
          className={`mt-3 flex items-start gap-2 rounded border border-hairline p-3 text-sm ${failed && !processing ? 'bg-bad-tint text-bad' : 'bg-canvas text-ink'}`}
        >
          {processing && (
            <span
              aria-hidden="true"
              className="mt-1 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-hairline border-t-primary-strong motion-reduce:animate-none"
            />
          )}
          <div>
            <p className="font-semibold">
              {processing
                ? noteReady
                  ? 'AI 분석 중입니다'
                  : '저장한 설정을 확인하고 있습니다'
                : notAllowed
                  ? '기본 수치 분석을 표시하고 있습니다'
                  : error
                  ? 'AI 분석을 완료하지 못했습니다'
                  : currentResult
                    ? result.partial
                      ? '시간 내 도착한 AI 부분 분석입니다'
                      : result.cached
                        ? '저장된 AI 분석을 불러왔습니다'
                        : 'AI 분석이 완료됐습니다'
                    : '기본 수치 분석을 표시하고 있습니다'}
            </p>
            <p className="mt-1 text-xs">
              {processing
                ? `최대 ${appliedLimit}초 동안 AI 답변을 받습니다. 제한 시간이 되면 그때까지 완성된 분석 문장만 표시합니다.`
                : notAllowed
                  ? 'AI 분석은 시연 계정에서만 제공합니다. 전일·전주 비교는 그대로 확인할 수 있어요.'
                  : error
                    ? `${error} 기본 수치 비교는 계속 확인할 수 있습니다.`
                  : currentResult
                    ? result.cached
                      ? '추가 Gemini 생성 호출 없이 기존 결과를 재사용했습니다.'
                      : '아래 코멘트의 수치와 해석을 확인해 주세요.'
                    : 'AI 분석 상태가 이곳에 표시됩니다.'}
            </p>
            {processing && (
              <div className="mt-3">
                <progress
                  aria-label="최대 대기 시간 중 경과 시간"
                  max={appliedLimit}
                  value={Math.min(elapsedSeconds, appliedLimit)}
                  className="h-2 w-full accent-primary-strong"
                />
                <p className="mt-1 text-xs text-muted">
                  경과 {Math.floor(elapsedSeconds / 60)}분 {elapsedSeconds % 60}
                  초 · 남은 대기{' '}
                  {Math.floor(Math.max(0, appliedLimit - elapsedSeconds) / 60)}
                  분 {Math.max(0, appliedLimit - elapsedSeconds) % 60}초
                </p>
                <p className="mt-1 text-xs text-muted">
                  시간 기준 표시이며 AI의 실제 작업 진행률은 아닙니다. 서버
                  제한에 따라 더 일찍 종료될 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {comment && (
        <div className="mt-3 space-y-2">
          <details className="rounded border border-hairline p-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              업종·지역 설정
              {appliedProfile ? ` · ${appliedProfile.industry}` : ' (선택)'}
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-ink">
                업종
                <input
                  value={profile.industry}
                  maxLength={80}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      industry: event.target.value,
                    }))
                  }
                  placeholder="예: 교육, 가전 설치·관리"
                  className="mt-1 w-full rounded border border-hairline bg-surface p-3 text-sm"
                />
              </label>
              <label className="text-sm text-ink">
                주요 상품·서비스
                <input
                  value={profile.product}
                  maxLength={120}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      product: event.target.value,
                    }))
                  }
                  placeholder="예: 취업 교육, 에어컨 청소"
                  className="mt-1 w-full rounded border border-hairline bg-surface p-3 text-sm"
                />
              </label>
              <label className="text-sm text-ink md:col-span-2">
                주요 수요 시기 (선택)
                <input
                  value={profile.demandSeason}
                  maxLength={200}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      demandSeason: event.target.value,
                    }))
                  }
                  placeholder="예: 상·하반기 채용 시즌. 실제 운영 경험을 입력해 주세요."
                  className="mt-1 w-full rounded border border-hairline bg-surface p-3 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={profile.weatherEnabled}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      weatherEnabled: event.target.checked,
                    }))
                  }
                />
                날씨 자동 참고 (상품과 관련될 때만)
              </label>
              <label className="text-sm text-ink">
                광고 대상 대표 지역
                <select
                  value={profile.regionId}
                  disabled={!profile.weatherEnabled}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      regionId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded border border-hairline bg-surface p-3 text-sm disabled:opacity-40"
                >
                  <option value="">지역 선택</option>
                  {WEATHER_REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-sm text-ink">
              최대 대기 시간 (상한 150초·2분 30초)
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="ml-3 rounded border border-hairline bg-surface p-2 text-sm"
              >
                {[10, 20, 30, 45, 60, 120, 150].map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds}초{seconds === 150 ? ' (기본·2분 30초)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={processing || !noteReady}
              className="mt-3 h-11 rounded bg-primary-strong px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              {processing ? '성과를 분석하고 있어요…' : '설정 저장 후 분석'}
            </button>
            <p className="mt-2 text-xs text-muted">
              취업 교육처럼 날씨 연관성이 낮으면 설명을 생략합니다. 전국 광고도
              선택한 한 지역의 날씨만 참고합니다. 설정은 이 브라우저의 본인
              계정에 저장됩니다.
            </p>
            <p className="mt-2 text-xs text-muted">
              추가 검색 비용 방지를 위해 유료 검색 연결은 꺼져 있습니다. AI는
              무료 등급 확인 후 활성화하며, 새 코멘트는 호출 한도 1회를
              사용합니다. 같은 입력은 재사용합니다.
            </p>
          </details>
          {profileError && (
            <p role="alert" className="text-sm text-bad">
              {profileError}
            </p>
          )}
          <label htmlFor="report-note" className="block text-sm text-ink">
            운영 메모 (선택)
          </label>
          <textarea
            id="report-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="예: 10/20 프로모션 시작, META 소재 교체. 확인된 내용만 입력해 주세요."
            className="w-full rounded border border-hairline bg-surface p-3 text-sm text-ink"
          />
          {hasUnsavedChanges && (
            <p role="status" className="text-xs text-primary-strong">
              설정 또는 메모에 아직 적용하지 않은 변경이 있습니다. ‘업종·지역
              설정’을 열고 ‘설정 저장 후 분석’을 눌러 주세요.
            </p>
          )}
          <p className="text-xs text-muted">
            분석 데이터가 바뀌면 Gemini로 집계 지표와 적용한 메모를 전송해 자동
            분석합니다. 같은 입력은 저장된 결과를 재사용합니다. 메모에
            고객명이나 개인정보를 넣지 마세요.
          </p>
          <div aria-live="polite" aria-busy={processing}>
            {currentResult && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                {currentResult}
              </p>
            )}
          </div>
          {currentResult && (
            <p className="text-xs text-muted">
              {result.generatedAt &&
                `생성 시각 ${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }).format(new Date(result.generatedAt))} · `}
              {result.cached ? '저장된 분석 재사용 · ' : ''}
              {result.fallback
                ? 'AI 응답 지연 또는 서비스 오류로 기본 수치 코멘트를 표시했습니다. 미완성 AI 문장은 사용하지 않습니다.'
                : result.partial
                  ? 'AI가 시간 안에 완성한 문장만 표시한 부분 분석입니다. 후속 해석·제안은 포함되지 않을 수 있습니다. 부분 결과는 저장하지 않습니다.'
                  : 'AI 초안입니다. 수치와 해석을 검토한 후 광고주에게 전달해 주세요.'}
              {result.cacheSaved === false &&
                !result.partial &&
                ' 결과를 서버에 저장하지 못했습니다. 새로고침 전에 최신 SQL 적용 여부를 확인해 주세요.'}
            </p>
          )}
          {currentResult &&
            result.weather &&
            result.weather.status !== 'disabled' && (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer">
                  날씨 참고 자료 · {result.weather.region} 대표 지점
                  {result.weather.status === 'unavailable'
                    ? ' · 조회 불가'
                    : ''}
                </summary>
                <ul className="mt-2 space-y-1">
                  {result.weather.days.map((day) => (
                    <li key={day.date}>
                      {day.date}:{' '}
                      {day.status === 'available'
                        ? `평균 ${day.meanTemperature}℃ · 강수 ${day.precipitation}mm`
                        : day.status === 'incomplete'
                          ? '당일·미래 날짜는 분석에서 제외'
                          : '자료 없음'}
                    </li>
                  ))}
                </ul>
                <p className="mt-2">
                  기상 모델 기반 추정 자료입니다.{' '}
                  <a
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Weather data by Open-Meteo.com
                  </a>{' '}
                  ·{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    CC BY 4.0
                  </a>
                </p>
              </details>
            )}
        </div>
      )}
      <details className="mt-3" open={!currentResult}>
        <summary className="cursor-pointer text-sm text-muted">
          기본 수치 비교
        </summary>
        {comment ? (
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink">
            <p>{comment.overview}</p>
            {comment.comparisons.map((item) => (
              <p key={item.key}>{item.text}</p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            선택한 매체에 기준일 데이터가 없어 코멘트를 표시할 수 없습니다.
          </p>
        )}
      </details>
      <p className="mt-3 text-xs text-muted">
        업로드된 데이터 기준이며 당일 데이터는 집계 중일 수 있습니다. 날씨는
        업종과 관련된 변화가 있을 때만 참고하며 인과관계를 의미하지 않습니다.
        시즌·이슈 자동 검색은 추가 비용 방지를 위해 사용하지 않습니다.
      </p>
    </section>
  )
}
