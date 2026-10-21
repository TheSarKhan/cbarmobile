#!/usr/bin/env bash
# Keeps the Telegram subscriber list on the telegram-subscribers branch, encrypted with a key derived from the bot token,
# so a public repository never exposes chat ids.   usage: telegram-subscribers.sh load FILE | save FILE
set -euo pipefail
branch=telegram-subscribers
action=$1; file=$2
crypt() { openssl enc "$@" -aes-256-cbc -pbkdf2 -pass env:TELEGRAM_BOT_TOKEN; }
case "$action" in
  load)
    echo '{"ids":[]}' > "$file"
    if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
      git fetch -q --depth=1 origin "$branch"
      git show FETCH_HEAD:subscribers.enc 2>/dev/null | crypt -d > "$file.tmp" && mv "$file.tmp" "$file" || echo "could not read the subscriber list, starting empty" >&2
    fi
    ;;
  save)
    work=$(mktemp -d)
    if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
      git fetch -q --depth=1 origin "$branch"
      git worktree add -q -B subscribers-local "$work" FETCH_HEAD
    else
      git worktree add -q --orphan -b subscribers-local "$work"
    fi
    crypt < "$file" > "$work/subscribers.enc"
    cd "$work"
    git add subscribers.enc
    if git diff --cached --quiet; then echo "subscriber list unchanged"; exit 0; fi
    git -c user.name='kampus-bot' -c user.email='kampus-bot@users.noreply.github.com' commit -q -m "Update Telegram subscribers"
    git push -q origin "subscribers-local:$branch"
    ;;
esac
