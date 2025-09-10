import os, time, json, pathlib, hashlib, collections, requests, datetime, re

# ---------- Config ----------
LOG_PATH      = os.getenv("LOG_PATH", "logs/app.log")
OUTPUT_DIR    = os.getenv("OUTPUT_DIR", "summaries")
OPENAI_MODEL  = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_APIKEY = os.getenv("OPENAI_API_KEY")

# GitHub (required for sync)
GITHUB_OWNER  = os.getenv("GITHUB_OWNER")
GITHUB_REPO   = os.getenv("GITHUB_REPO")
GITHUB_TOKEN  = os.getenv("GITHUB_TOKEN")

# Triggers (your choices): immediate on errors; also backstops for bursts/quiet periods
MAX_BUFFER_LINES   = int(os.getenv("MAX_BUFFER_LINES", "200"))   # summarize if many lines arrive
DEBOUNCE_SECONDS   = int(os.getenv("DEBOUNCE_SECONDS", "300"))   # or every 5 minutes
ERROR_TRIGGER_WORDS = re.compile(r"(error|exception|traceback|panic|failed|timeout|503|500)", re.I)

# Flood control (avoid spam to GitHub)
MIN_SECONDS_BETWEEN_ISSUES = int(os.getenv("MIN_SECONDS_BETWEEN_ISSUES", "120"))
last_issue_ts = 0

# ---------- Helpers ----------
def tail_follow(path):
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
            lvl = str(obj.get("level","info")).lower()
            msg = str(obj.get("msg") or obj.get("message") or "").strip()
            return (lvl, msg if msg else line.strip())
        except Exception:
            low = line.lower()
            lvl = "error" if ERROR_TRIGGER_WORDS.search(low) else ("warn" if "warn" in low else "info")
            return (lvl, line.strip())
    counter = collections.Counter(norm(L) for L in lines)
    sev_order = {"error":0,"warn":1,"info":2}
    return sorted(counter.items(), key=lambda kv: (sev_order.get(kv[0][0],9), -kv[1]))[:8]

def make_prompt(groups, recent_tail):
    bullets = [f"- [{lvl.upper()} ×{cnt}] {msg}" for ((lvl,msg),cnt) in groups]
    groups_md = "\n".join(bullets) if bullets else "_No notable groups._"
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

def openai_summary(prompt):
    url = "https://api.openai.com/v1/responses"
    headers = {"Authorization": f"Bearer {OPENAI_APIKEY}", "Content-Type":"application/json"}
    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {"role":"system","content":"Be specific and concise. Return Markdown with headings."},
            {"role":"user","content":prompt}
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
                if c.get("type") in ("output_text","text"):
                    chunks.append(c.get("text",""))
        text = "\n".join(chunks).strip()
    return text

def write_md(md):
    ts = datetime.datetime.utcnow().replace(microsecond=0).isoformat().replace(":","-")
    outdir = pathlib.Path(OUTPUT_DIR); outdir.mkdir(parents=True, exist_ok=True)
    path = outdir / f"log-summary-{ts}Z.md"
    path.write_text(md)
    return str(path)

def gh_headers():
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

def ensure_issue(title, body_md, fingerprint):
    """
    One issue per recurring problem:
    - If an open issue with this fingerprint exists: add a comment.
    - Else: create a new issue labeled automated/logs.
    """
    global last_issue_ts
    now = time.time()
    if now - last_issue_ts < MIN_SECONDS_BETWEEN_ISSUES:
        return None

    s_url = "https://api.github.com/search/issues"
    q = f'repo:{GITHUB_OWNER}/{GITHUB_REPO} state:open "{fingerprint}" in:body'
    s = requests.get(s_url, headers=gh_headers(), params={"q": q}, timeout=20)
    if s.status_code == 200 and s.json().get("total_count",0) > 0:
        issue = s.json()["items"][0]
        num = issue["number"]
        com_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/issues/{num}/comments"
        requests.post(com_url, headers=gh_headers(), json={"body": body_md}, timeout=20)
        last_issue_ts = now
        return issue["html_url"]
    else:
        c_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/issues"
        payload = {"title": title[:120], "body": body_md, "labels": ["automated","logs"]}
        r = requests.post(c_url, headers=gh_headers(), json=payload, timeout=20)
        if r.status_code < 400:
            last_issue_ts = now
            return r.json().get("html_url")
        return None

def should_emit(buffer, last_emit_at):
    # Immediate if error-like line appears (your choice A)
    if any(ERROR_TRIGGER_WORDS.search(L) for L in buffer):
        return "error"
    # Backstops
    if len(buffer) >= MAX_BUFFER_LINES:
        return "bulk"
    if (time.time() - last_emit_at) >= DEBOUNCE_SECONDS:
        return "debounce"
    return None

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
        prompt = make_prompt(groups, tail)
        summary = openai_summary(prompt)

        top_err = next((msg for ((lvl,msg),cnt) in groups if lvl=="error"), None)
        title = f"[Logs] {top_err[:90]}" if top_err else "Automated log summary"

        # Stable fingerprint for "one issue per recurring problem"
        fingerprint_seed = (top_err or "") + str({k:v for (k,v) in groups[:3]})
        fingerprint = hashlib.sha1(fingerprint_seed.encode("utf-8")).hexdigest()[:12]
        header = (
            f"# Automated Log Summary\n\n"
            f"**Reason:** {reason} • **Lines:** {len(buffer)} • **Time (UTC):** {datetime.datetime.utcnow().isoformat()}Z\n\n"
            f"<!-- fingerprint:{fingerprint} -->\n\n"
        )
        body = header + summary.strip() + "\n"

        path = write_md(body)
        print("Wrote summary:", path)

        url = ensure_issue(title, body, f"fingerprint:{fingerprint}")
        if url:
            print("Synced to GitHub Issue:", url)

        buffer.clear()
        last_emit_at = time.time()

if __name__ == "__main__":
    main()
