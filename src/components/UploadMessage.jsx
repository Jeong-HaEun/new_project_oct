// CSV 업로드 결과 (design.md 5-2 카드, 6절 서버 오류 상자와 같은 모양)
// result.type: 'success' 저장됨 · 'invalid' 틀린 줄 목록 · 'error' 서버 오류
export function UploadMessage({ result }) {
  if (result.type === 'success') {
    return (
      <p
        role="status"
        className="mt-6 rounded-lg border border-hairline bg-surface p-4 text-sm text-ink md:mt-8 md:p-5"
      >
        ✓ 업로드했어요 · {result.message}
      </p>
    )
  }

  return (
    <div
      role="alert"
      className="mt-6 rounded-lg border border-bad bg-surface p-4 md:mt-8 md:p-5"
    >
      {result.type === 'invalid' ? (
        <>
          <p className="text-sm font-semibold text-bad">
            틀린 줄이 있어 올리지 않았어요. 고친 뒤 다시 올려 주세요.
          </p>
          <ul className="mt-2 max-h-60 overflow-y-auto text-sm text-ink">
            {result.errors.map((error) => (
              <li key={error} className="py-0.5">
                {error}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-bad">{result.message}</p>
      )}
    </div>
  )
}
