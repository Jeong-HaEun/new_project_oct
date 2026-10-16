// 데이터 0건 화면 (design.md 6절): 카드 가운데 정렬 + 문구 + 주요 · 보조 버튼. 버튼은 머리글과 같은 일을 한다.
import { CsvUploadButton } from './CsvUploadButton.jsx'

export function EmptyState({ onTemplateDownload, onUploadResult }) {
  return (
    <section className="mt-3 rounded-lg border border-hairline bg-surface p-4 py-12 text-center md:p-5 md:py-12">
      <p className="text-ink">아직 데이터가 없어요</p>
      <p className="mt-1 text-sm text-muted">
        양식을 내려받아 채운 뒤 CSV 로 올려 주세요
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <CsvUploadButton onResult={onUploadResult} />
        <button
          type="button"
          onClick={onTemplateDownload}
          className="h-11 whitespace-nowrap rounded border border-hairline bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:bg-primary-tint disabled:cursor-not-allowed disabled:opacity-40"
        >
          양식 내려받기
        </button>
      </div>
    </section>
  )
}
