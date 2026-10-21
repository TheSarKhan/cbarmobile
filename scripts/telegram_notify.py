#!/usr/bin/env python3
"""Release bot for Telegram: everybody who presses /start in the bot receives the APK, /stop unsubscribes.

  telegram_notify.py sync SUBS_JSON            read /start and /stop messages, greet new subscribers, update SUBS_JSON
  telegram_notify.py confirm OFFSET_FILE       tell Telegram those messages were handled (call after SUBS_JSON is stored)
  telegram_notify.py broadcast SUBS_JSON APK CAPTION   send the APK to every subscriber and to TELEGRAM_CHAT_ID

SUBS_JSON is {"ids": [chat ids]}. The workflows keep it encrypted on the telegram-subscribers branch.
"""
import json, os, subprocess, sys, urllib.error, urllib.parse, urllib.request

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
OWNER = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
API = f"https://api.telegram.org/bot{TOKEN}/"
APK_URL = "https://apicbar.sarkhan.az/download/kampus.apk"
WELCOME = ("Salam! Kampus APK bildirişlərinə abunə oldun ✅\n\nYeni versiya hazır olanda APK faylını burada alacaqsan.\n"
           f"Hazırkı versiya: {APK_URL}\n\nDayandırmaq üçün /stop yaz.")
GOODBYE = "Abunəlik dayandırıldı. Yenidən qoşulmaq üçün /start yaz."


def call(method, **fields):
    data = urllib.parse.urlencode(fields).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(API + method, data=data), timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return json.load(e)


def load(path):
    try:
        with open(path) as f:
            return [str(i) for i in json.load(f).get("ids", [])]
    except FileNotFoundError:
        return []


def save(path, ids):
    with open(path, "w") as f:
        json.dump({"ids": sorted(set(ids))}, f)


def sync(path, offset_file):
    ids = load(path)
    answer = call("getUpdates", timeout=0, limit=100, allowed_updates=json.dumps(["message"]))
    last = 0
    for update in answer.get("result", []):
        last = max(last, update["update_id"])
        message = update.get("message") or {}
        chat = message.get("chat") or {}
        text = (message.get("text") or "").strip().lower()
        if chat.get("type") != "private":
            continue
        chat_id = str(chat["id"])
        if text.startswith("/start") and chat_id not in ids:
            ids.append(chat_id)
            call("sendMessage", chat_id=chat_id, text=WELCOME)
        elif text.startswith("/stop") and chat_id in ids:
            ids.remove(chat_id)
            call("sendMessage", chat_id=chat_id, text=GOODBYE)
    save(path, ids)
    with open(offset_file, "w") as f:
        f.write(str(last + 1 if last else 0))
    print(f"{len(ids)} subscriber(s), {len(answer.get('result', []))} update(s) handled")


def confirm(offset_file):
    offset = int(open(offset_file).read() or 0)
    if offset:
        call("getUpdates", offset=offset, limit=1, timeout=0)


def broadcast(path, apk, caption):
    ids = load(path)
    targets = list(dict.fromkeys(([OWNER] if OWNER else []) + ids))
    file_id = None
    delivered = 0
    for chat_id in targets:
        if file_id:
            answer = call("sendDocument", chat_id=chat_id, document=file_id, parse_mode="HTML", caption=caption)
        else:
            out = subprocess.run(["curl", "-s", "-F", f"chat_id={chat_id}", "-F", f"document=@{apk}", "-F", "parse_mode=HTML",
                                  "-F", f"caption={caption}", API + "sendDocument"], capture_output=True, text=True)
            answer = json.loads(out.stdout or "{}")
            if answer.get("ok"):
                file_id = answer["result"]["document"]["file_id"]
        if answer.get("ok"):
            delivered += 1
        elif answer.get("error_code") == 403 and chat_id in ids:
            ids.remove(chat_id)  # the person blocked the bot: stop trying
        else:
            print(f"could not send to {chat_id}: {answer.get('description')}", file=sys.stderr)
    save(path, ids)
    print(f"APK delivered to {delivered} of {len(targets)} chat(s)")
    if delivered == 0:
        sys.exit(1)


if __name__ == "__main__":
    command, args = sys.argv[1], sys.argv[2:]
    if command == "sync":
        sync(args[0], os.environ.get("OFFSET_FILE", "telegram-offset.txt"))
    elif command == "confirm":
        confirm(args[0])
    elif command == "broadcast":
        broadcast(*args)
    else:
        sys.exit(__doc__)
