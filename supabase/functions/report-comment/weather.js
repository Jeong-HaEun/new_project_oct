// 대표 지점만 지원한다. 전국 평균이나 사용자 현재 위치를 추정하지 않는다.
export const WEATHER_REGIONS = [
  { id: 'seoul', name: '서울', latitude: 37.5665, longitude: 126.978 },
  { id: 'busan', name: '부산', latitude: 35.1796, longitude: 129.0756 },
  { id: 'incheon', name: '인천', latitude: 37.4563, longitude: 126.7052 },
  { id: 'suwon', name: '수원', latitude: 37.2636, longitude: 127.0286 },
  { id: 'daejeon', name: '대전', latitude: 36.3504, longitude: 127.3845 },
  { id: 'daegu', name: '대구', latitude: 35.8714, longitude: 128.6014 },
  { id: 'gwangju', name: '광주', latitude: 35.1595, longitude: 126.8526 },
  { id: 'ulsan', name: '울산', latitude: 35.5384, longitude: 129.3114 },
  { id: 'gangneung', name: '강릉', latitude: 37.7519, longitude: 128.8761 },
  { id: 'jeju', name: '제주', latitude: 33.4996, longitude: 126.5312 },
]

export function normalizeWeatherContext(value) {
  if (value === undefined || value === null) return null
  if (
    typeof value.industry !== 'string' ||
    typeof value.product !== 'string' ||
    !value.industry.trim() ||
    value.industry.length > 80 ||
    !value.product.trim() ||
    value.product.length > 120 ||
    (value.weatherEnabled !== false &&
      !WEATHER_REGIONS.some((region) => region.id === value.regionId)) ||
    (value.demandSeason !== undefined &&
      (typeof value.demandSeason !== 'string' ||
        value.demandSeason.length > 200))
  )
    throw new Error('업종·상품·대표 지역 설정을 확인해 주세요.')
  return {
    industry: value.industry.trim(),
    product: value.product.trim(),
    regionId: value.weatherEnabled === false ? '' : value.regionId,
    weatherEnabled: value.weatherEnabled !== false,
    demandSeason: (value.demandSeason ?? '').trim(),
  }
}

function dayText(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// 변화 기준은 통계적 인과 증명이 아닌 설명 후보를 줄이는 필터다.
export function findWeatherChanges(days) {
  const current = days[0]
  if (!current || current.status !== 'available') return []
  return days.slice(1).flatMap((previous) => {
    if (previous.status !== 'available') return []
    const temperatureDelta =
      Math.round((current.meanTemperature - previous.meanTemperature) * 10) / 10
    const precipitationDelta =
      Math.round((current.precipitation - previous.precipitation) * 10) / 10
    if (Math.abs(temperatureDelta) < 3 && Math.abs(precipitationDelta) < 5)
      return []
    return [
      {
        date: current.date,
        comparedDate: previous.date,
        temperatureDelta,
        precipitationDelta,
      },
    ]
  })
}

export async function getReportWeather(
  context,
  dates,
  env = {},
  fetcher = fetch,
  now = new Date(),
) {
  if (!context || !context.weatherEnabled)
    return { status: 'disabled', days: [], changes: [] }
  const region = WEATHER_REGIONS.find((item) => item.id === context.regionId)
  const today = dayText(now)
  const days = dates.map((date) => ({
    date,
    status: date >= today ? 'incomplete' : 'missing',
  }))
  const past = dates.filter((date) => date < today).sort()
  const base = {
    region: region.name,
    representativePoint: true,
    source: 'Open-Meteo',
    sourceUrl: 'https://open-meteo.com/',
    dataType: '기상 모델 기반 추정치이며 관측소 실측값과 다를 수 있음',
    fetchedAt: now.toISOString(),
  }
  if (!past.length) return { ...base, status: 'unavailable', days, changes: [] }
  // 최근 2주만 forecast의 과거 자료를 사용한다. 오래된 날짜는 archive로 조회한다.
  const cutoff = new Date(now.getTime() - 14 * 86400000)
  const recent = past[0] >= dayText(cutoff)
  const paid = Boolean(env.ADPORTER_WEATHER_API_KEY)
  const host = recent
    ? paid
      ? 'customer-api.open-meteo.com'
      : 'api.open-meteo.com'
    : paid
      ? 'customer-archive-api.open-meteo.com'
      : 'archive-api.open-meteo.com'
  const url = new URL(`https://${host}/v1/${recent ? 'forecast' : 'archive'}`)
  url.search = new URLSearchParams({
    latitude: String(region.latitude),
    longitude: String(region.longitude),
    start_date: past[0],
    end_date: past.at(-1),
    daily: 'temperature_2m_mean,precipitation_sum',
    timezone: 'Asia/Seoul',
    ...(paid ? { apikey: env.ADPORTER_WEATHER_API_KEY } : {}),
  }).toString()
  try {
    const response = await fetcher(url.toString(), {
      signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) throw new Error('날씨 조회 실패')
    const daily = (await response.json()).daily
    for (const item of days) {
      if (item.date >= today) continue
      const index = daily?.time?.indexOf(item.date) ?? -1
      const temperature = daily?.temperature_2m_mean?.[index]
      const precipitation = daily?.precipitation_sum?.[index]
      if (
        index >= 0 &&
        typeof temperature === 'number' &&
        Number.isFinite(temperature) &&
        temperature >= -90 &&
        temperature <= 65 &&
        typeof precipitation === 'number' &&
        Number.isFinite(precipitation) &&
        precipitation >= 0 &&
        precipitation <= 3000
      ) {
        Object.assign(item, {
          status: 'available',
          meanTemperature: temperature,
          precipitation,
        })
      }
    }
    return {
      ...base,
      status: days.every((day) => day.status === 'available')
        ? 'available'
        : 'partial',
      days,
      changes: findWeatherChanges(days),
    }
  } catch {
    return { ...base, status: 'unavailable', days, changes: [] }
  }
}
