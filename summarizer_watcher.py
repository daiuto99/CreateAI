import os, time, json, pathlib, hashlib, collections, requests, datetime, re, base64
from typing import Optional

# ---------- Config ----------
LOG_PATH       = os.getenv("LOG_PATH", "logs/app.log")
OUTPUT_DIR     = os.getenv("OUTPUT_DIR", "summaries")
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_APIKEY  = os.getenv("OPENAI_API_KEY")

# GitHub repo (optional: for issues + repo mirror when public or token allows Contents:RW)
GITHUB_OWNER   = os.getenv("GITHUB_OWNER")
GITHUB_REPO    = os.getenv("GITHUB_REPO")
GITHUB_TOKEN   = os.getenv("GITHUB_TOKEN")
GITHUB_BRANCH  = os.getenv("GITHUB_BRANCH", "main")

# Gist (public mirror that I can always fetch)
GIST_TOKEN     = os.getenv("GIST_TOKEN") or os.getenv("GITHUB_TOKEN")  # prefer dedicated gist token
GIST_ID_FILE   = os.getenv("GIST_ID_FILE", ".latest_summary_gist")
GIST_FILENAME  = os.getenv("GIST_FILENAME", "CreateAI-latest-summary.md")

# Triggers & behavior
MAX_BUFFER_LINES     = int(os.getenv("MAX_BUFFER_LINES", "200"))   # summarize if many lines arrive
DEBOUNCE_SECONDS     = int(os.getenv("DEBOUNCE_SECONDS", "300"))   # or every 5 minutes
ERROR_TRIGGER_WORDS  = re.compile(r"(error|exception|traceback|panic|failed|timeout|503|500)", re.I)

# Flood control (avoid spam to GitHub)
MIN_SECONDS_BETWEEN_ISSUES = int(os.getenv("MIN_SECONDS_BETWEEN_ISSUES", "120"))
last_issue_ts = 0

# Rolling issue & session recap
ROLLING_ISSUE_TITLE       = "📓 Log Summaries (Automated)"
SESSION_RECAP_MODE        = (os.getenv("SESSION_RECAP_MODE") or "daily").lower()  # daily | per_run | off
SESSION_RECAP_STATE_FILE  = os.getenv("SESSION_RECAP_STATE_FILE", ".session_recap_state")
_session_recap_posted_this_run = False


# ---------- Helpers ----------
def tail_follow(path: str):
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.touch(exist_ok=True)
    with p.open("r", encoding="utf-8", errors="replace") as f:
        f.seek(0, 2)  # start at end
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.2)
            else:
                yield line

def group_lines(lines):
    def norm(line):
        try:
            obj = json.loads(line)
            lvl = str(obj.get("level", "info")).lower()
            msg = str(obj.get("msg") or obj.get("message") or "").strip()
            return (lvl, msg if msg else line.strip())
        except Exception:
            low = line.lower()
            lvl = "error" if ERROR_TRIGGER_WORDS.search(low) else ("warn" if "warn" in low else "info")
            return (lvl, line.strip())

    counter = collections.Counter(norm(L) for L in lines)
    sev_order = {"error": 0, "warn": 1, "info": 2}
    return sorted(counter.items(), key=lambda kv: (sev_order.get(kv[0][0], 9), -kv[1]))[:8]

def _bullets(groups):
    return [f"- [{lvl.upper()} ×{cnt}] {msg}" for ((lvl, msg), cnt) in groups]

def make_summary_prompt(groups, recent_tail):
    groups_md = "\n".join(_bullets(groups)) if groups else "_No notable groups._"
    return f"""
You are a senior engineer coaching a non-developer.
From these logs, produce a short, surgical report:

1) Top 3–5 problems with likely root causes.
2) Exact, minimal fixes (file & line if inferable; else say unknown file and provide concrete code).
3) Missing env vars/secrets/config.
4) 3–6 plain-English prompts to paste into Replit’s AI.
5) 1–2 sentence rollback plan.

### Grouped symptoms
{groups_md}

### Recent raw lines
{recent_tail}
""".strip()

def make_recap_prompt(groups, recent_tail):
    groups_md = "\n".join(_bullets(groups)) if groups else "_No notable groups._"
    return f"""
You are a PM/tech lead writing a daily session recap for a single-developer project.
Write a concise recap with sections:

**What we did today**
**Current status**
**Next steps** (3–6 bullets)

Be brief, specific, and actionable. Use Markdown bullets.

### Grouped symptoms
{groups_md}

### Recent raw lines
{recent_tail}
""".strip()

def openai_complete(prompt: str) -> str:
    url = "https://api.openai.com/v1/responses"
    headers = {"Authorization": f"Bearer {OPENAI_APIKEY}", "Content-Type": "application/json"}
    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {"role": "system", "content": "Be specific and concise. Return Markdown."},
            {"role": "user", "content": prompt}
        ],
        "max_output_tokens": 900
    }
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    text = data.get("output_text")
    if not text:
        chunks = []
        for block in data.get("output", []):
            for c in block.get("content", []):
                if c.get("type") in ("output_text", "text"):
                    chunks.append(c.get("text", ""))
        text = "\n".join(chunks).strip()
    return text

def write_md(md: str) -> str:
    ts = datetime.datetime.utcnow().replace(microsecond=0).isoformat().replace(":", "-")
    outdir = pathlib.Path(OUTPUT_DIR); outdir.mkdir(parents=True, exist_ok=True)
    path = outdir / f"log-summary-{ts}Z.md"
    path.write_text(md, encoding="utf-8")
    return str(path)

def write_public_latest(md: str):
    pub_dir = pathlib.Path("server/public"); pub_dir.mkdir(parents=True, exist_ok=True)
    (pub_dir / "latest-summary.txt").write_text(md, encoding="utf-8")

def gh_headers():
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

# ---------- GitHub Rolling Issue ----------
def find_or_create_rolling_issue():
    list_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/issues"
    s = requests.get(list_url, headers=gh_headers(), params={"state": "open", "per_page": 50}, timeout=20)
    s.raise_for_status()
    for item in s.json():
        if item.get("title") == ROLLING_ISSUE_TITLE:
            return item
    create_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/issues"
    payload = {
        "title": ROLLING_ISSUE_TITLE,
        "body": "This Issue collects all automated log summaries and session recaps.\n\n(Generated by watcher.)",
        "labels": ["automated", "logs", "log-summary"],
    }
    r = requests.post(create_url, headers=gh_headers(), json=payload, timeout=20)
    r.raise_for_status()
    return r.json()

def post_comment(issue_number: int, body_md: str):
    com_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/issues/{issue_number}/comments"
    r = requests.post(com_url, headers=gh_headers(), json={"body": body_md}, timeout=20)
    r.raise_for_status()
    return r.json().get("html_url")

def ensure_issue(_title, body_md, _fingerprint):
    global last_issue_ts
    now = time.time()
    if now - last_issue_ts < MIN_SECONDS_BETWEEN_ISSUES:
        return None
    issue = find_or_create_rolling_issue()
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%SZ")
    decorated = f"### {ts} UTC\n\n{body_md}"
    post_comment(issue["number"], decorated)
    last_issue_ts = now
    return issue["html_url"]

# ---------- GitHub repo mirror (optional; requires Contents: RW) ----------
def upsert_latest_summary_to_repo(md_text: str, path: str = "latest-summary.md"):
    try:
        if not GITHUB_OWNER or not GITHUB_REPO or not GITHUB_TOKEN:
            return
        get_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/{path}"
        params = {"ref": GITHUB_BRANCH}
        g = requests.get(get_url, headers=gh_headers(), params=params, timeout=20)
        sha = g.json().get("sha") if g.status_code == 200 else None

        content_b64 = base64.b64encode(md_text.encode("utf-8")).decode("ascii")
        payload = {
            "message": f"chore: update {path} (automated log mirror)",
            "content": content_b64,
            "branch": GITHUB_BRANCH,
        }
        if sha:
            payload["sha"] = sha

        r = requests.put(get_url, headers=gh_headers(), json=payload, timeout=20)
        if r.status_code >= 400:
            print("WARN: repo mirror failed:", r.status_code, r.text[:300])
    except Exception as e:
        print("WARN: repo mirror exception:", e)

# ---------- Public Gist mirror ----------
def _gist_headers():
    return {
        "Authorization": f"Bearer {GIST_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

def _load_gist_id() -> Optional[str]:
    p = pathlib.Path(GIST_ID_FILE)
    if p.exists():
        try:
            return p.read_text().strip() or None
        except Exception:
            return None
    return None

def _save_gist_id(gist_id: str):
    try:
        pathlib.Path(GIST_ID_FILE).write_text(gist_id)
    except Exception:
        pass

def ensure_public_gist(md_text: str) -> Optional[str]:
    if not GIST_TOKEN:
        print("WARN: no GIST_TOKEN for gist; skipping gist mirror.")
        return None

    files = { GIST_FILENAME: { "content": md_text } }
    gist_id = _load_gist_id()

    if gist_id:
        u = f"https://api.github.com/gists/{gist_id}"
        r = requests.patch(u, headers=_gist_headers(), json={"files": files}, timeout=20)
        if r.status_code < 400:
            return gist_id
        else:
            print("WARN: gist update failed, will try recreate:", r.status_code, r.text[:300])

    payload = {
        "description": "Latest CreateAI log summary (automated)",
        "public": True,
        "files": files
    }
    c = requests.post("https://api.github.com/gists", headers=_gist_headers(), json=payload, timeout=20)
    if c.status_code < 400:
        gid = c.json()["id"]
        _save_gist_id(gid)
        html = c.json().get("html_url")
        print("Created public gist:", html)
        print("Gist Raw URL:", f"https://gist.githubusercontent.com/{GITHUB_OWNER}/{gid}/raw/{GIST_FILENAME}")
        return gid
    else:
        print("WARN: gist create failed:", c.status_code, c.text[:300])
        return None

def gist_raw_url(gist_id: str) -> str:
    return f"https://gist.githubusercontent.com/{GITHUB_OWNER}/{gist_id}/raw/{GIST_FILENAME}"

# ---------- Session recap helpers ----------
def _load_last_recap_date() -> str:
    p = pathlib.Path(SESSION_RECAP_STATE_FILE)
    if p.exists():
        try:
            return p.read_text().strip()
        except Exception:
            return ""
    return ""

def _save_last_recap_date(date_str: str):
    p = pathlib.Path(SESSION_RECAP_STATE_FILE)
    try:
        p.write_text(date_str)
    except Exception:
        pass

def maybe_post_session_recap(groups, recent_tail):
    global _session_recap_posted_this_run
    if SESSION_RECAP_MODE == "off":
        return
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    last = _load_last_recap_date()
    should_post = False
    header = ""
    if SESSION_RECAP_MODE == "daily":
        if last != today:
            should_post = True
            header = f"## 📌 Session Recap ({today} UTC)"
    elif SESSION_RECAP_MODE == "per_run":
        if not _session_recap_posted_this_run:
            should_post = True
            header = f"## 📌 Session Recap ({today} UTC)"
    else:
        if last != today:
            should_post = True
            header = f"## 📌 Session Recap ({today} UTC)"

    if not should_post:
        return

    recap_prompt = make_recap_prompt(groups, recent_tail)
    recap_md = openai_complete(recap_prompt)
    issue = find_or_create_rolling_issue()
    body = f"{header}\n\n{recap_md.strip()}\n"
    post_comment(issue["number"], body)
    _session_recap_posted_this_run = True
    _save_last_recap_date(today)

# ---------- Emit logic ----------
def should_emit(buffer, last_emit_at):
    if any(ERROR_TRIGGER_WORDS.search(L) for L in buffer):
        return "error"
    if len(buffer) >= MAX_BUFFER_LINES:
        return "bulk"
    if (time.time() - last_emit_at) >= DEBOUNCE_SECONDS:
        return "debounce"
    return None

# ---------- Main ----------
def main():
    assert OPENAI_APIKEY, "Add OPENAI_API_KEY in Replit Secrets."
    assert GITHUB_OWNER and GITHUB_REPO and GITHUB_TOKEN, "Set GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN in Secrets."

    buffer, last_emit_at = [], time.time()
    for line in tail_follow(LOG_PATH):
        buffer.append(line.rstrip("\n"))
        reason = should_emit(buffer, last_emit_at)
        if not reason:
            continue

        groups = group_lines(buffer)
        tail = "\n".join(buffer[-200:])

        # 1) Create the log summary
        summary_prompt = make_summary_prompt(groups, tail)
        summary = openai_complete(summary_prompt)

        top_err = next((msg for ((lvl, msg), cnt) in groups if lvl == "error"), None)
        title = f"[Logs] {top_err[:90]}" if top_err else "Automated log summary"

        fingerprint_seed = (top_err or "") + str({k: v for (k, v) in groups[:3]})
        fingerprint = hashlib.sha1(fingerprint_seed.encode("utf-8")).hexdigest()[:12]
        header = (
            f"# Automated Log Summary\n\n"
            f"**Reason:** {reason} • **Lines:** {len(buffer)} • **Time (UTC):** {datetime.datetime.utcnow().isoformat()}Z\n\n"
            f"<!-- fingerprint:{fingerprint} -->\n\n"
        )
        body = header + summary.strip() + "\n"

        path = write_md(body)
        print("Wrote summary:", path)

        # publish for app to serve at /latest-summary.txt
        write_public_latest(body)

        # optional repo mirror (works if repo public or token has Contents:RW)
        upsert_latest_summary_to_repo(body)

        # rolling issue comment
        url = ensure_issue(title, body, f"fingerprint:{fingerprint}")
        if url:
            print("Synced to GitHub Issue:", url)

        # 2) Gist mirror (public, fetchable)
        gid = ensure_public_gist(body)
        if gid:
            print("Gist Raw URL:", gist_raw_url(gid))

        # 3) Maybe post daily/per-run session recap
        maybe_post_session_recap(groups, tail)

        buffer.clear()
        last_emit_at = time.time()

if __name__ == "__main__":
    main()
