#!/bin/bash
# Still After — 앱 Push 스크립트
# Finder에서 더블클릭하면 실행됩니다.

cd "$(dirname "$0")"

echo "🔧 Still After 앱 — 최신 수정 Push"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

echo ""
echo "📋 수정 사항:"
echo "  [LoginScreen] 미니 카드 3개 제거 (노이즈 → 삭제)"
echo "  [LoginScreen] 약관/개인정보 링크 제거"
echo "  [LoginScreen] 돌아가기 canGoBack() 안전 처리, 💜 아이콘"
echo "  [OnboardingScreen] 데모 대화 섹션 추가 (재연/이별 탭)"
echo "  [ChatScreen] replay 5·10회, stable 5·10회 마일스톤 메시지"
echo "  [HomeScreen] auto-transition 제거, ⋯ 메뉴, currentRelationship"
echo "  [PersonaEditScreen] 형제/자매 추가"
echo ""

UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null)
if [ -n "$UNPUSHED" ]; then
  echo "📦 미push 커밋:"
  echo "$UNPUSHED"
  echo ""
fi

CHANGED=$(git diff --name-only HEAD 2>/dev/null)

if [ -n "$CHANGED" ]; then
  echo "📦 변경 파일 커밋 중..."
  git add \
    screens/auth/LoginScreen.tsx \
    screens/onboarding/OnboardingScreen.tsx \
    screens/chat/ChatScreen.tsx \
    screens/home/HomeScreen.tsx \
    screens/persona/PersonaEditScreen.tsx
  git commit -m "fix: 로그인 노이즈 제거 + 온보딩 데모 대화 + 채팅 마일스톤

LoginScreen:
- 서비스 특징 미니 카드 3개 제거 (노이즈 판단)
- 약관/개인정보처리방침 링크 제거
- 돌아가기 canGoBack() 안전 처리 유지
- 💜 아이콘 유지, infoBox '첫 10번 무료' 유지

OnboardingScreen:
- '이런 대화가 가능해요' 섹션 (재연/이별 탭 전환)
- 가상 유저 유진 + 엄마 AI 데모 대화 (DemoBubble 컴포넌트)
- 이별 탭: 마일스톤 + 마지막 편지 쓰기 버튼 + 봉인 안내

ChatScreen:
- replay 5회: 그 사람과의 대화가 이어지고 있어요 💜
- replay 10회: 대화가 깊어지고 있어요
- stable 5회: 마음을 나눠주셔서 고마워요 💙
- stable 10회: 많은 이야기를 털어놓았네요

HomeScreen: auto-transition 제거, ⋯ 메뉴, currentRelationship 전달
PersonaEditScreen: 형제/자매 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
  echo ""
fi

git push origin main 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Push 완료! Vercel이 자동 배포합니다."
else
  echo ""
  echo "❌ Push 실패. 위 에러를 확인해주세요."
fi

echo ""
read -p "아무 키나 누르면 종료합니다..."
