#!/bin/bash
cd "$(dirname "$0")"
echo "=== Still After: JWT 토큰 갱신 수정 & Push ==="
echo ""

# Git lock 파일 정리
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null
echo "✅ Git lock 파일 정리 완료"
echo ""

# 변경사항 확인
echo "--- 변경된 파일 ---"
git status --short
echo ""

# 스테이징 & 커밋
git add services/openaiService.ts
git commit -m "fix: Edge Function 401 오류 수정 — JWT 토큰 자동 갱신

채팅 시 Edge Function이 401 인증 실패를 반환하는 문제 해결.
- getSession()이 캐시된 만료 토큰을 반환하는 문제 발견
- 토큰 만료 60초 전에 자동으로 refreshSession() 호출
- 유효한 JWT만 Edge Function에 전송되도록 보장

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo ""
echo "--- 커밋 내역 ---"
git log --oneline -3
echo ""

# 푸시
echo "Push 중..."
git push origin main
echo ""
echo "=== 완료! Vercel이 자동 빌드 & 배포합니다 ==="
echo "약 1-2분 후 https://stillafter.com 에서 확인하세요"
echo ""
read -p "아무 키나 누르면 창이 닫힙니다..."
