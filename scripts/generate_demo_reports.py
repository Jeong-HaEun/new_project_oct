"""실제 고객·광고 계정과 무관한 재현 가능한 대시보드 시연용 CSV 생성."""
import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path

rng = random.Random(20261016)
start, end = date(2026, 8, 15), date(2026, 10, 15)
output = Path(__file__).resolve().parents[1] / 'sample-data' / 'demo_reports_2026-08-15_2026-10-15.csv'
headers = ['날짜', '매체', '캠페인', '광고그룹', '소재', '광고비', '노출', '클릭', '장바구니', '전환', '매출']
campaigns = {
    'NAVER': [('브랜드 검색', ['브랜드명', '브랜드 상품']), ('일반 키워드', ['간편식 추천', '도시락 구독']), ('쇼핑 검색', ['인기 상품', '신규 상품'])],
    'META': [('신규 고객 확보', ['관심사 타겟', '유사 타겟']), ('리타겟팅', ['방문자 7일', '장바구니 이탈']), ('가을 프로모션', ['직장인 타겟', '1인 가구 타겟'])],
    'GOOGLE': [('검색 캠페인', ['브랜드 키워드', '일반 키워드']), ('동영상 캠페인', ['관심 고객', '맞춤 세그먼트']), ('리마케팅', ['방문자 30일', '구매 경험 고객'])],
}
rows = []
for day_index in range((end - start).days + 1):
    day = start + timedelta(days=day_index)
    progress = day_index / (end - start).days
    weekend = day.weekday() >= 5
    for media_index, (media, media_campaigns) in enumerate(campaigns.items()):
        for campaign_index, (campaign, groups) in enumerate(media_campaigns):
            for group_index, group in enumerate(groups):
                for creative_index in range(2):
                    kind = {'NAVER': '검색 문구', 'META': '이미지', 'GOOGLE': '반응형 소재'}[media]
                    creative = f'{kind} {"A" if creative_index == 0 else "B"}'
                    seasonal = 1.18 if date(2026, 9, 14) <= day <= date(2026, 9, 25) else 1
                    volume = (1 + .22 * progress) * (.79 if weekend else 1) * seasonal
                    impressions = round(rng.randint(7000, 16000) * volume * (1.45 if media == 'META' else 1))
                    ctr = [0.029, 0.012, 0.022][media_index] * (1.22 if campaign_index == 0 else 1)
                    # 신규 소재 개선, META A 소재의 점진적인 피로 등 비교 가능한 차이를 만든다.
                    ctr *= (1 + .3 * progress) if creative_index else (1 - .2 * progress if media == 'META' else 1)
                    clicks = max(1, round(impressions * ctr * rng.uniform(.85, 1.15)))
                    cpc = [510, 610, 440][media_index] * (1 + .16 * campaign_index) * rng.uniform(.85, 1.15)
                    cost = round(clicks * cpc)
                    cart_rate = [.16, .12, .14][media_index] * (1.25 if campaign_index == 1 else 1)
                    carts = max(1, min(clicks, round(clicks * cart_rate * rng.uniform(.85, 1.15))))
                    buy_rate = (.38 + .09 * progress) * (1.15 if creative_index else 1) * rng.uniform(.8, 1.2)
                    conversions = min(carts, max(0, round(carts * buy_rate)))
                    revenue = conversions * rng.choice([29900, 34900, 39900, 44900, 49900])
                    rows.append([day.isoformat(), media, campaign, group, creative, cost, impressions, clicks, carts, conversions, revenue])
with output.open('w', encoding='utf-8-sig', newline='') as stream:
    writer = csv.writer(stream)
    writer.writerow(headers)
    writer.writerows(rows)
print(f'{output.name}: {len(rows)}줄, {(end-start).days+1}일, 전부 가상 데이터')
