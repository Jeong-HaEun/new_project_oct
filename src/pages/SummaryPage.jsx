// 요약 페이지 (/). 계산은 utils 함수를 부르기만 한다.
// 매체 필터 값은 주소(?media=)가 보관한다 (PRD ADR-3).
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { BestCreatives } from '../components/BestCreatives.jsx'
import { BestOptions } from '../components/BestOptions.jsx'
import { DataDateBar } from '../components/DataDateBar.jsx'
import { EmptyState } from '../components/EmptyState.jsx'
import { FunnelCompare } from '../components/FunnelCompare.jsx'
import { FunnelFlow } from '../components/FunnelFlow.jsx'
import { FunnelInsight } from '../components/FunnelInsight.jsx'
import { MediaFilter } from '../components/MediaFilter.jsx'
import { MetricTable } from '../components/MetricTable.jsx'
import { PeriodBars } from '../components/PeriodBars.jsx'
import { CARD_GRID, SummaryCard } from '../components/SummaryCard.jsx'
import { TrendChart } from '../components/TrendChart.jsx'
import { WeekdayTrendTable } from '../components/WeekdayTrendTable.jsx'
import {
  formatMonthRange,
  formatWeekdayDate,
  getLatestDate,
  getMonthToDateRanges,
  getTodayKst,
  countRecentDays,
  getUploadDelayDays,
} from '../utils/dates.js'
import {
  formatBestCondition,
  formatCompactWon,
  formatCoverage,
  formatPercent,
  formatWon,
} from '../utils/format.js'
import { filterByMedia, parseMedia } from '../utils/media.js'
import {
  BEST_DEFAULT_OPTIONS,
  buildFunnelInsights,
  buildDailyTable,
  buildMonthTable,
  compareFunnelByMedia,
  rankBestCreatives,
  rankBestCreativesByMedia,
  summarizeCards,
  summarizeFunnel,
  summarizeMom,
  summarizeDailyTrend,
  summarizeMonthTrend,
  summarizeSameWeekday,
} from '../utils/metrics.js'

// BEST 소재 부제에 쓰는 순위 기준 글
const SORT_TEXT = { roas: 'ROAS 높은 순', conversions: '구매 많은 순' }

// onTemplateDownload · onUploadResult: 빈 화면 버튼이 머리글 버튼과 같은 일을 하게 App 이 넘긴다
export function SummaryPage({ rows, onTemplateDownload, onUploadResult }) {
  const [searchParams, setSearchParams] = useSearchParams()
  // BEST 소재 기준 · 조건은 화면 상태 (주소에 남기지 않음, issue-22-tests.md 결정 7)
  const [bestOptions, setBestOptions] = useState(BEST_DEFAULT_OPTIONS)
  const media = parseMedia(searchParams.get('media'))

  function handleBestOptionChange(key, value) {
    setBestOptions((previous) => ({ ...previous, [key]: value }))
  }

  // 전체를 고르면 주소에서 media 를 뺀다
  function handleMediaChange(nextMedia) {
    setSearchParams(nextMedia === null ? {} : { media: nextMedia })
  }

  // 기준일은 전체 데이터 기준 (issue-2-tests.md 결정 A)
  const latestDate = getLatestDate(rows)

  // 데이터 0건: 카드 · 그래프를 숨기고 다음 할 일을 보여 준다 (spec 결정 4)
  if (latestDate === null) {
    return (
      <>
        <MediaFilter media={media} onChange={handleMediaChange} disabled />
        <EmptyState
          onTemplateDownload={onTemplateDownload}
          onUploadResult={onUploadResult}
        />
      </>
    )
  }

  // 카드 · 단계 흐름은 필터를 따르고, 매체별 비교는 전체 줄을 쓴다 (spec 결정 6)
  const mediaRows = filterByMedia(rows, media)
  const cards = summarizeCards(mediaRows, latestDate)
  // 최근 7일이 다 안 차면 카드 이름 옆에 "최근 3일 기준" (issue-11-tests.md 결정 1)
  const coverageLabel = formatCoverage(countRecentDays(mediaRows, latestDate))
  const funnel = summarizeFunnel(mediaRows, latestDate)
  const comparison = compareFunnelByMedia(rows, latestDate)
  const funnelInsights = buildFunnelInsights(comparison)
  const momItems = summarizeMom(mediaRows, latestDate)
  const momRanges = getMonthToDateRanges(latestDate)
  const weekday = summarizeSameWeekday(mediaRows, latestDate)
  const dailyTrend = summarizeDailyTrend(mediaRows, latestDate)
  const monthTrend = summarizeMonthTrend(mediaRows, latestDate)
  const monthTable = buildMonthTable(mediaRows, latestDate)
  const dailyTable = buildDailyTable(mediaRows, latestDate)
  const bestCondition = formatBestCondition(bestOptions)
  // [전체] 면 매체별 3개, 매체를 고르면 그 매체 1개 (issue-22-tests.md 결정 4)
  const bestGroups =
    media === null
      ? rankBestCreativesByMedia(rows, latestDate, bestOptions)
      : [
          {
            media,
            items: rankBestCreatives(mediaRows, latestDate, bestOptions),
          },
        ]
  const delayDays = getUploadDelayDays(latestDate, getTodayKst())

  return (
    <>
      <MediaFilter media={media} onChange={handleMediaChange} />
      <DataDateBar latestDate={latestDate} delayDays={delayDays} />
      <section aria-label="최근 7일 합계" className={`mt-3 ${CARD_GRID}`}>
        {cards.map((card) => (
          <SummaryCard
            key={card.key}
            card={card}
            coverageLabel={coverageLabel}
          />
        ))}
      </section>
      <section aria-labelledby="wow-title" className="mt-6 md:mt-8">
        <h2 id="wow-title" className="font-display text-lg font-bold">
          전주 대비 (WoW)
        </h2>
        <p className="mt-1 text-xs text-muted">
          {media ?? '전체'} · 최근 7일 vs 그 전 7일
        </p>
        <PeriodBars
          items={cards}
          previousLabel="지난주"
          currentLabel="이번 주"
          emptyMessage="비교할 지난주 데이터 없음"
        />
      </section>
      <section aria-labelledby="mom-title" className="mt-6 md:mt-8">
        <h2 id="mom-title" className="font-display text-lg font-bold">
          전월 대비 (MoM)
        </h2>
        <p className="mt-1 text-xs text-muted">
          {media ?? '전체'} · 이번 달과 지난달의 같은 기간
        </p>
        <PeriodBars
          items={momItems}
          previousLabel={formatMonthRange(momRanges.previous)}
          currentLabel={formatMonthRange(momRanges.current)}
          emptyMessage="비교할 지난달 데이터 없음"
        />
      </section>
      <section aria-labelledby="weekday-title" className="mt-6 md:mt-8">
        <h2 id="weekday-title" className="font-display text-lg font-bold">
          동요일 비교
        </h2>
        <p className="mt-1 text-xs text-muted">
          {media ?? '전체'} · 같은 요일끼리 비교해 요일 차이를 성과 변화로
          착각하지 않게 해요
        </p>
        <PeriodBars
          items={weekday.cards}
          previousLabel={formatWeekdayDate(weekday.trend[1].date)}
          currentLabel={formatWeekdayDate(weekday.trend[0].date)}
          emptyMessage="비교할 지난주 같은 요일 데이터 없음"
        />
        <p className="mt-4 text-xs text-muted">
          최근 4주 같은 요일 · 데이터 없는 주는 -
        </p>
        <WeekdayTrendTable trend={weekday.trend} />
      </section>
      <section aria-labelledby="daily-trend-title" className="mt-6 md:mt-8">
        <h2 id="daily-trend-title" className="font-display text-lg font-bold">
          일자별 추이 (최근 14일)
        </h2>
        <p className="mt-1 text-xs text-muted">
          {media ?? '전체'} · 데이터 없는 날 · 계산할 수 없는 날은 선이 끊겨요
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 md:gap-4">
          <TrendChart
            title="CPA"
            data={dailyTrend.map((day) => ({
              label: day.label,
              tooltipLabel: formatWeekdayDate(day.date),
              value: day.cpa,
              note: day.cpaNote,
            }))}
            format={formatWon}
            axisFormat={formatCompactWon}
          />
          <TrendChart
            title="ROAS"
            data={dailyTrend.map((day) => ({
              label: day.label,
              tooltipLabel: formatWeekdayDate(day.date),
              value: day.roas,
              note: day.roasNote,
            }))}
            format={formatPercent}
          />
        </div>
      </section>
      <section aria-labelledby="month-trend-title" className="mt-6 md:mt-8">
        <h2 id="month-trend-title" className="font-display text-lg font-bold">
          월 누적 추이
        </h2>
        <p className="mt-1 text-xs text-muted">
          {media ?? '전체'} · 기준일이 속한 달과 그 전 2개월 · 계산할 수 없는
          달은 선이 끊겨요
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 md:gap-4">
          <TrendChart
            title="CPA"
            data={monthTrend.map((month) => ({
              label: month.label,
              value: month.cpa,
            }))}
            format={formatWon}
            axisFormat={formatCompactWon}
          />
          <TrendChart
            title="ROAS"
            data={monthTrend.map((month) => ({
              label: month.label,
              value: month.roas,
            }))}
            format={formatPercent}
          />
        </div>
      </section>
      <section aria-labelledby="funnel-title" className="mt-6 md:mt-8">
        <h2 id="funnel-title" className="font-display text-lg font-bold">
          퍼널 분석
        </h2>
        <div className="mt-3">
          <FunnelFlow funnel={funnel} scopeLabel={media ?? '전체'} />
          <FunnelCompare comparison={comparison} />
          <FunnelInsight insights={funnelInsights} />
        </div>
      </section>
      <section aria-labelledby="best-title" className="mt-6 md:mt-8">
        <h2 id="best-title" className="font-display text-lg font-bold">
          BEST 소재 5
        </h2>
        <p className="mt-1 text-xs text-muted">
          {media ?? '전체'} · 최근 7일 · {SORT_TEXT[bestOptions.sortBy]} ·{' '}
          {bestCondition} · 캠페인당 1개
        </p>
        <BestOptions options={bestOptions} onChange={handleBestOptionChange} />
        <BestCreatives
          groups={bestGroups}
          showMediaName={media === null}
          sortBy={bestOptions.sortBy}
          conditionText={bestCondition}
        />
      </section>
      <section aria-labelledby="tables-title" className="mt-6 md:mt-8">
        <h2 id="tables-title" className="font-display text-lg font-bold">
          데이터 표
        </h2>
        <p className="mt-1 text-xs text-muted">
          {media ?? '전체'} · 그래프로 본 흐름을 숫자로 확인해요 · 데이터 없는
          달 · 날은 -
        </p>
        <h3 className="mt-3 text-sm font-semibold">월 누적 (최신 월이 위)</h3>
        <MetricTable labelHeader="월" rows={monthTable} />
        <h3 className="mt-4 text-sm font-semibold">
          일자별 (최근 14일, 최신 날짜가 위)
        </h3>
        <MetricTable labelHeader="날짜" rows={dailyTable} />
      </section>
    </>
  )
}
