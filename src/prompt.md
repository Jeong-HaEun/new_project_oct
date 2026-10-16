3단계. 커밋 검문소 (husky + lint-staged + commitlint)
• 무엇을: 커밋할 때 자동으로 코드 검사(ESLint)와 모양 정리(Prettier)를 하고, 커밋 메시지 형식을 검사해요.
• 왜: 사람도 AI도 실수해요. 검문소가 있으면 틀린 코드가 저장소에 들어가기 전에 막혀요.
• 어떻게: 명령문 ④ → ⑤.
• 확인: "그냥 고침" 커밋은 막혀야 정상, "feat: 합계 카드 추가" 는 통과.
커밋 메시지 형식: 타입(범위): 설명
타입
뜻
Adporter 예시
feat
새 기능
feat(summary): 전체 CPA 카드 추가
fix
버그 고침
fix(metrics): 광고비 0일 때 ROAS 대신 - 표시
test
테스트 추가·수정
test(metrics): CTR 경계값 테스트
refactor
동작은 그대로, 구조만 개선
refactor(chart): 추이 그래프 하나로 합치기
chore
빌드·설정·패키지
chore: husky 설치
docs
문서
docs(summary): prd 작성
