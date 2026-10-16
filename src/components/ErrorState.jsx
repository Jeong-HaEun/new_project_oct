// 서버 오류 (design.md 6절): 카드 + 빨간 테두리 + [다시 시도] 주요 버튼(5-3)
export function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="mt-6 rounded-lg border border-bad bg-surface p-4 md:mt-8 md:p-5"
    >
      <p className="text-sm text-bad">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 h-11 rounded bg-primary-strong px-4 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
      >
        다시 시도
      </button>
    </div>
  )
}
