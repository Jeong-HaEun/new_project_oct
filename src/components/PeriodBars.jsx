// 기간 비교 막대 (design.md 5-8 막대). WoW · MoM 이 함께 쓴다. 지표 1개당 그래프 1개.
// 이번 기간 막대는 좋아짐 청록빛 초록 · 나빠짐 빨강 · 판단 안 함(광고비 · 변화 없음) 진한 회색, 지난 기간은 회색.
// 값 계산은 utils 가 하고(summarizeCards · summarizeMom · buildPeriodBars), 여기서는 그리기만 한다.
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CARD_FORMATTERS, formatDelta } from '../utils/format.js'
import { buildPeriodBars } from '../utils/metrics.js'
import { ChangeBadge } from './ChangeBadge.jsx'

const PREVIOUS_COLOR = 'var(--color-muted)'
const CURRENT_COLORS = {
  good: 'var(--color-good)',
  bad: 'var(--color-bad)',
  neutral: 'var(--color-ink)',
}

function barColor(bar, change) {
  if (bar.key === 'previous') return PREVIOUS_COLOR
  return CURRENT_COLORS[change?.tone ?? 'neutral']
}

const AXIS_TEXT = { fill: 'var(--color-muted)', fontSize: 12 }

// items: [{ key, title, current, previous, change, delta? }]
export function PeriodBars({
  items,
  previousLabel,
  currentLabel,
  emptyMessage,
}) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2 md:gap-4">
      {items.map((item) => (
        <PeriodBarCard
          key={item.key}
          item={item}
          bars={buildPeriodBars(item, previousLabel, currentLabel)}
          emptyMessage={emptyMessage}
        />
      ))}
    </div>
  )
}

function PeriodBarCard({ item, bars, emptyMessage }) {
  const format = CARD_FORMATTERS[item.key]

  return (
    <div className="rounded-lg border border-hairline bg-surface p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted">{item.title}</h3>
        {item.change && (
          <ChangeBadge
            change={item.change}
            delta={formatDelta(item.delta ?? null)}
          />
        )}
      </div>
      {bars === null ? (
        <p className="mt-3 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-2 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bars}
              layout="vertical"
              margin={{ top: 0, right: 88, bottom: 0, left: 0 }}
              barCategoryGap={6}
            >
              {/* 막대는 0 에서 시작 (작은 차이가 부풀려 보이지 않게) */}
              <XAxis type="number" domain={[0, 'dataMax']} hide />
              <YAxis
                type="category"
                dataKey="label"
                width={72}
                tick={AXIS_TEXT}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-canvas)' }}
                formatter={(value) => [format(value), item.title]}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              >
                {bars.map((bar) => (
                  <Cell key={bar.key} fill={barColor(bar, item.change)} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value) => format(value ?? null)}
                  style={{ fill: 'var(--color-ink)', fontSize: 12 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
