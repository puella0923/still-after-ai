#!/bin/bash
cd /Users/bella/Documents/Claude/Projects/Still\ After/workspace/still-after-ai

echo "🔑 SSH 방식으로 전환 중..."
git remote set-url origin git@github.com:puella0923/still-after-ai.git
echo "현재 remote: $(git remote get-url origin)"
echo ""
echo "📤 GitHub에 push 중..."
git push origin main
EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Push 성공!"
else
  echo "❌ SSH 인증 실패. SSH 키 설정이 필요합니다."
fi
echo ""
read -p "엔터를 눌러 닫으세요..."
