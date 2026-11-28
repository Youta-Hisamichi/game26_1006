#!/usr/bin/env bash
# テキスト盆栽を公開するスクリプト。どのフォルダから実行しても、必ず textbonsai プロジェクトに公開します。
set -euo pipefail
cd "$(dirname "$0")"                      # このスクリプトがあるフォルダ（テキスト盆栽のクローン）へ移動
BRANCH="claude/busy-albattani-fd5r0q"
PROJECT="textbonsai"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
echo "=== $(git log --oneline -1) ==="

# 取り違え防止：公開先を明示（別プロジェクトには絶対に公開しない）
npx firebase-tools deploy --only hosting --project "$PROJECT"

echo "公開しました: https://$PROJECT.web.app"
