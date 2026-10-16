import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase.js'
import { signInWithKakao } from '../api/auth.js'
import { App } from '../App.jsx'
import { isEmbedded } from '../utils/embed.js'

// 한클래스 보고서 페이지에 끼워 넣어 열렸는지 (로그인·로그아웃은 한클래스가 맡는다)
const embedded = isEmbedded(window.location.search, window.self !== window.top)

export function AuthGate() {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!supabase) return
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setIsLoading(false)
    })
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (active && error) {
          setErrorMessage('로그인 상태를 확인하지 못했어요. 새로고침해 주세요.')
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setErrorMessage('로그인 상태를 확인하지 못했어요. 새로고침해 주세요.')
          setIsLoading(false)
        }
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error)
        setErrorMessage(
          '로그인하지 못했어요. 이메일과 비밀번호, 계정 등록 여부를 확인해 주세요.',
        )
    } catch {
      setErrorMessage('연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 카카오 화면으로 이동한다. 실패하면 버튼을 다시 살리고 안내한다
  async function handleKakaoLogin() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await signInWithKakao()
    } catch (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setErrorMessage('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) setErrorMessage('로그아웃하지 못했어요. 다시 시도해 주세요.')
    } catch {
      setErrorMessage('로그아웃하지 못했어요. 다시 시도해 주세요.')
    }
  }

  if (!supabase) {
    return (
      <main className="mx-auto max-w-xl p-5">
        <h1 className="font-display text-2xl font-bold">Adporter 연결 설정</h1>
        <p className="mt-4 text-sm text-ink">
          Supabase 연결 정보가 아직 설정되지 않았어요. README의 설정 순서에 따라
          공개 URL과 publishable 키를 등록한 뒤 다시 빌드해 주세요.
        </p>
        <p className="mt-3 text-sm text-muted">
          실제 비밀번호나 service_role 키는 화면 설정에 넣지 마세요.
        </p>
      </main>
    )
  }
  if (isLoading)
    return (
      <p role="status" className="p-5 text-sm text-muted">
        로그인 상태를 확인하고 있어요.
      </p>
    )
  if (session && embedded) return <App key={session.user.id} />
  if (embedded) {
    return (
      <main className="mx-auto max-w-xl p-5">
        <p className="text-sm text-ink">
          한클래스에서 카카오로 로그인하면 내 보고서가 열려요.
        </p>
      </main>
    )
  }
  if (session) {
    return (
      <>
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-3.5 py-2 md:px-6">
          <span className="text-xs text-muted">내 계정의 광고 데이터</span>
          <button
            type="button"
            onClick={handleLogout}
            className="h-11 rounded border border-hairline bg-surface px-4 text-sm text-ink"
          >
            로그아웃
          </button>
        </div>
        {errorMessage && (
          <p role="alert" className="px-4 text-sm text-bad">
            {errorMessage}
          </p>
        )}
        <App key={session.user.id} />
      </>
    )
  }
  return (
    <main className="mx-auto mt-8 max-w-xl rounded-lg border border-hairline bg-surface p-5">
      <h1 className="font-display text-2xl font-bold">Adporter</h1>
      <p className="mt-3 text-sm text-muted">
        로그인하면 내 광고 데이터를 불러오고 CSV를 저장할 수 있어요.
      </p>
      <button
        type="button"
        onClick={handleKakaoLogin}
        disabled={isSubmitting}
        className="mt-6 h-11 w-full rounded bg-kakao px-4 text-sm font-semibold text-on-kakao hover:bg-kakao-hover disabled:opacity-40"
      >
        카카오로 로그인
      </button>
      <p className="mt-2 text-xs text-muted">
        한클래스와 같은 카카오 계정으로 로그인돼요.
      </p>
      <p className="mt-6 text-sm text-muted">또는 이메일로 로그인</p>
      <form onSubmit={handleLogin} className="mt-2 flex flex-col gap-3">
        <label className="text-sm text-ink">
          이메일
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-11 w-full rounded border border-hairline bg-surface px-3"
          />
        </label>
        <label className="text-sm text-ink">
          비밀번호
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 h-11 w-full rounded border border-hairline bg-surface px-3"
          />
        </label>
        {errorMessage && (
          <p role="alert" className="text-sm text-bad">
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded bg-primary-strong px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {isSubmitting ? '로그인 중…' : '로그인'}
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">
        이메일 계정은 서비스 운영자가 등록해 드려요.
      </p>
    </main>
  )
}
