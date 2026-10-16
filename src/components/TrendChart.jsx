// 흐름 선 그래프 (design.md 5-8 선). 월 누적(#24) · 14일 추이(#12) 가 함께 쓴다. 지표 1개당 그래프 1개.
// 값이 null 인 점은 비우고 선을 끊는다 (0 으로 그리지 않음). 값 계산은 utils, 여기서는 그리기만 한다.
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const LINE_COLOR = 'var(--color-primary)'
const AXIS_TEXT = { fill: 'var(--color-muted)', fontSize: 12 }

// title: 지표 이름
// data: [{ label, value, note?, tooltipLabel? }] (왼쪽 → 오른쪽). note = 값이 없는 이유, tooltipLabel = 툴팁 제목('10/7(수)')
// format: 값 → 글자 (툴팁 · 마지막 점), axisFormat: 세로축 글자 (없으면 format, '1.2만' 처럼 줄일 때 씀)
export function TrendChart({ title, data, format, axisFormat = format }) {
  const lastIndex = data.length - 1

  // 마지막 점 옆에만 값을 적는다 (모든 점에 숫자를 달지 않음)
  function renderLastLabel({ x, y, value, index }) {
    if (index !== lastIndex || value === null) return null
    return (
      <text
        x={x}
        y={y - 10}
        textAnchor="end"
        fill="var(--color-ink)"
        fontSize={12}
      >
        {format(value)}
      </text>
    )
  }

  // 툴팁에는 원래 숫자, 값이 없으면 이유 (prd ADR-4)
  function formatTooltipValue(value, _name, entry) {
    const text =
      value === null
        ? `- (${entry.payload.note ?? '계산 불가'})`
        : format(value)
    return [text, title]
  }

  function formatTooltipLabel(label, payload) {
    return payload[0]?.payload.tooltipLabel ?? label
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface p-4 md:p-5">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      <div className="mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
            {/* 날짜가 많으면 처음 · 끝은 남기고 겹치는 글자는 건너뛴다 */}
            <XAxis
              dataKey="label"
              tick={AXIS_TEXT}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              tick={AXIS_TEXT}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value) => axisFormat(value)}
            />
            {/* filterNull 을 꺼야 값이 없는 점에서도 이유가 보인다 */}
            <Tooltip
              cursor={{ stroke: 'var(--color-hairline)' }}
              filterNull={false}
              formatter={formatTooltipValue}
              labelFormatter={formatTooltipLabel}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ r: 2, fill: LINE_COLOR, stroke: LINE_COLOR }}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            >
              <LabelList dataKey="value" content={renderLastLabel} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
