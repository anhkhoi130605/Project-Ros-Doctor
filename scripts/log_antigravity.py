#!/usr/bin/env python3
"""
Antigravity IDE log scanner — extracts the exact user-typed prompts from
local Antigravity conversation transcripts.

Source of truth:
    ~/.gemini/antigravity-ide/brain/<conv_id>/.system_generated/logs/transcript.jsonl
    (with fallback to the legacy ~/.gemini/antigravity/brain/... layout)

Each transcript line is a JSON object. We emit one log entry per line where
`type == "USER_INPUT"` AND `source == "USER_EXPLICIT"`. The text inside
<USER_REQUEST>...</USER_REQUEST> is the exact prompt the student typed
(auxiliary <ADDITIONAL_METADATA> and <USER_SETTINGS_CHANGE> blocks are
stripped).

Why not other sources we considered?
  - ~/.gemini/antigravity-ide/conversations/<conv>.pb is encrypted.
  - brain/<conv>/task.md / walkthrough.md are AI-generated artifacts, not the
    user's prompt.
  - ~/.gemini/tmp/<slug>/chats/session-*.json is the Gemini CLI, not the
    Antigravity IDE.

Two ways in
-----------
--hook  Antigravity 2.0 fires this from `.agents/hooks.json` on PreInvocation
        and hands us the payload on stdin. Its `transcriptPath` points straight
        at the current conversation, so this mode needs none of the brain
        scanning or repo guessing described below.
--auto  Pre-push sweep, and the only mode Antigravity 1.x can use. It has to
        locate the transcripts itself — see "Conversation → repo mapping".

Conversation → repo mapping
---------------------------
The brain folder has no .project_root file. We map a conv to the current repo
by scanning its transcript for tool-call `Cwd` values. A conv counts as
belonging to this repo when one of its Cwd values either equals, is an
ancestor of, or is a descendant of the current repo root.

Usage:
  python scripts/log_antigravity.py --hook            # hook mode, payload on stdin
  python scripts/log_antigravity.py --auto            # default: last 24h
  python scripts/log_antigravity.py --hours 72
  python scripts/log_antigravity.py --all             # every conv, no cutoff
  python scripts/log_antigravity.py --conv-id <id>    # one conversation
  python scripts/log_antigravity.py --dry-run         # preview only

Env overrides:
  ANTIGRAVITY_BRAIN_DIR  point at a different brain/ directory
  AI_LOG_DIR             where session.jsonl is written (default: .ai-log)
"""
import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Fix Windows console encoding so VN diacritics in prompts print cleanly.
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

VN_TZ = timezone(timedelta(hours=7))
GEMINI_HOME = Path.home() / ".gemini"

# Antigravity has shipped under two folder names; prefer the newer IDE one.
BRAIN_CANDIDATES = (
    GEMINI_HOME / "antigravity-ide" / "brain",
    GEMINI_HOME / "antigravity" / "brain",
)

USER_REQUEST_RE = re.compile(r"<USER_REQUEST>(.*?)</USER_REQUEST>", re.DOTALL)
AUX_BLOCK_RE = re.compile(
    r"<(?:ADDITIONAL_METADATA|USER_SETTINGS_CHANGE|SYSTEM_MESSAGE)>"
    r".*?"
    r"</(?:ADDITIONAL_METADATA|USER_SETTINGS_CHANGE|SYSTEM_MESSAGE)>",
    re.DOTALL,
)


def git(cmd: str, cwd: Path | None = None) -> str:
    try:
        return subprocess.check_output(
            cmd.split(), shell=False, text=True, stderr=subprocess.DEVNULL,
            cwd=cwd,
        ).strip()
    except Exception:
        return ""


def repo_context(cwd: Path | None = None) -> tuple[str, str, str, str]:
    """(repo, branch, commit, student) read from the git tree at `cwd`.

    Hook mode passes the workspace root explicitly: the hook process does not
    necessarily start inside the student's repo.
    """
    root = cwd or Path.cwd()
    repo = git("git remote get-url origin", cwd).rstrip("/").split("/")[-1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    return (
        repo or root.name,
        git("git rev-parse --abbrev-ref HEAD", cwd),
        git("git rev-parse --short HEAD", cwd),
        git("git config user.email", cwd)
        or os.environ.get("USERNAME", os.environ.get("USER", "unknown")),
    )


# ---------------------------------------------------------------------------
# Locating brain/
# ---------------------------------------------------------------------------

def get_brain_dirs() -> list[Path]:
    """Brain directories to scan, newest layout first."""
    env = os.environ.get("ANTIGRAVITY_BRAIN_DIR")
    if env:
        p = Path(env)
        return [p] if p.exists() else []
    return [p for p in BRAIN_CANDIDATES if p.exists()]


# ---------------------------------------------------------------------------
# Path normalization + repo gating
# ---------------------------------------------------------------------------

def _normalize(p: str) -> str:
    """Lower-case + backslash form, no trailing separator."""
    if not p:
        return ""
    return p.strip().lower().replace("/", "\\").rstrip("\\")


def _unquote_arg(val):
    """Antigravity stores tool args as JSON-encoded strings. Unwrap them."""
    if not isinstance(val, str):
        return val
    val = val.strip()
    if len(val) >= 2 and val[0] == '"' and val[-1] == '"':
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return val[1:-1]
    return val


def _conv_cwds(transcript: Path) -> set[str]:
    """All Cwd values that appear in tool calls inside this transcript."""
    cwds: set[str] = set()
    try:
        with open(transcript, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                for tc in (entry.get("tool_calls") or []):
                    args = tc.get("args") or {}
                    cwd = args.get("Cwd") or args.get("cwd")
                    cwd = _unquote_arg(cwd)
                    if isinstance(cwd, str):
                        n = _normalize(cwd)
                        if n:
                            cwds.add(n)
    except OSError:
        pass
    return cwds


def _conv_matches_repo(cwds: set[str], repo_root_n: str) -> bool:
    """True if any cwd is equal to, ancestor of, or descendant of the repo."""
    if not repo_root_n or not cwds:
        return False
    for cwd in cwds:
        if cwd == repo_root_n:
            return True
        if cwd.startswith(repo_root_n + "\\"):
            return True
        if repo_root_n.startswith(cwd + "\\"):
            return True
    return False


# ---------------------------------------------------------------------------
# Prompt extraction
# ---------------------------------------------------------------------------

def extract_user_prompt(content: str) -> str:
    """Pull the text between <USER_REQUEST>...</USER_REQUEST>. Fall back to
    stripping known auxiliary blocks if no wrapper is present."""
    if not isinstance(content, str):
        return ""
    m = USER_REQUEST_RE.search(content)
    if m:
        return m.group(1).strip()
    cleaned = AUX_BLOCK_RE.sub("", content)
    return cleaned.strip()


# ---------------------------------------------------------------------------
# Reading existing log to avoid duplicates
# ---------------------------------------------------------------------------

def get_logged_entry_ids(log_file: Path) -> set[str]:
    logged: set[str] = set()
    if not log_file.exists():
        return logged
    with open(log_file, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            eid = entry.get("entry_id", "")
            if eid:
                logged.add(eid)
    return logged


# ---------------------------------------------------------------------------
# Iterating user inputs
# ---------------------------------------------------------------------------

def iter_transcript_inputs(transcript: Path, conv_id: str,
                           cutoff: datetime | None):
    """Yield the user-typed prompts recorded in one transcript.jsonl."""
    with open(transcript, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if (entry.get("type") != "USER_INPUT"
                    or entry.get("source") != "USER_EXPLICIT"):
                continue

            ts = entry.get("created_at") or ""
            if cutoff and ts:
                try:
                    ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if ts_dt < cutoff:
                        continue
                except ValueError:
                    pass

            text = extract_user_prompt(entry.get("content", ""))
            if len(text) < 2:
                continue

            yield {
                "conv_id": conv_id,
                "step_index": int(entry.get("step_index", 0)),
                "timestamp": ts,
                "text": text,
            }


def iter_user_inputs(brain_dirs: list[Path], cutoff: datetime | None,
                     only_conv: str | None, repo_root_n: str):
    """Yield user-input dicts from every matching conversation transcript."""
    for brain in brain_dirs:
        for conv_dir in sorted(brain.iterdir()):
            if not conv_dir.is_dir():
                continue
            if only_conv and conv_dir.name != only_conv:
                continue
            transcript = (
                conv_dir / ".system_generated" / "logs" / "transcript.jsonl"
            )
            if not transcript.exists() or transcript.stat().st_size == 0:
                continue

            cwds = _conv_cwds(transcript)
            # If we have a repo root, skip convs that never touched it.
            if repo_root_n and not _conv_matches_repo(cwds, repo_root_n):
                continue

            yield from iter_transcript_inputs(transcript, conv_dir.name,
                                              cutoff)


# ---------------------------------------------------------------------------
# Emitting entries
# ---------------------------------------------------------------------------

def build_entry(msg: dict, repo: str, branch: str, commit: str,
                student: str, model: str = "gemini") -> dict:
    ts = msg["timestamp"]
    if ts.endswith("Z"):
        try:
            ts = (
                datetime.fromisoformat(ts.replace("Z", "+00:00"))
                .astimezone(VN_TZ)
                .isoformat()
            )
        except ValueError:
            pass

    return {
        "ts": ts or datetime.now(VN_TZ).isoformat(),
        "tool": "antigravity",
        "event": "UserPrompt",
        "entry_id": f"antigravity-{msg['conv_id']}-{msg['step_index']:05d}",
        "session_id": msg["conv_id"],
        "model": model,
        "repo": repo,
        "branch": branch,
        "commit": commit,
        "student": student,
        "prompt": msg["text"],
        "response_summary": "",
    }


# ---------------------------------------------------------------------------
# Antigravity 2.0 hook mode
# ---------------------------------------------------------------------------

def transcript_from_payload(data: dict) -> Path | None:
    """The transcript this hook invocation is about.

    Antigravity gives us `transcriptPath` outright; `conversationId` is only a
    fallback for payload shapes that leave the path out.
    """
    p = data.get("transcriptPath") or ""
    if p and Path(p).is_file():
        return Path(p)
    conv = data.get("conversationId") or ""
    if conv:
        for brain in get_brain_dirs():
            cand = (brain / conv / ".system_generated" / "logs"
                    / "transcript.jsonl")
            if cand.is_file():
                return cand
    return None


def log_from_hook(transcript: Path, data: dict) -> int:
    """Append every not-yet-logged prompt of this conversation; return how many.

    No time window and no repo filter: the payload already says which
    conversation and which workspace we are in, and `entry_id` dedup makes a
    full re-scan idempotent. PreInvocation fires once per user turn, so the
    prompt of turn N lands at turn N or N+1; whatever the final turn leaves
    behind is swept up by the pre-push `--auto` run.
    """
    conv_id = data.get("conversationId") or transcript.parents[2].name
    workspaces = [w for w in (data.get("workspacePaths") or []) if w]
    root = Path(workspaces[0]) if workspaces else Path.cwd()

    log_dir = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
    if not log_dir.is_absolute():
        log_dir = root / log_dir
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "session.jsonl"
    logged_ids = get_logged_entry_ids(log_file)

    repo, branch, commit, student = repo_context(root)
    model = data.get("modelName") or "gemini"

    new_entries = [
        e for e in (
            build_entry(msg, repo, branch, commit, student, model)
            for msg in iter_transcript_inputs(transcript, conv_id, None)
        )
        if e["entry_id"] not in logged_ids
    ]
    if not new_entries:
        return 0

    with open(log_file, "a", encoding="utf-8") as f:
        for e in new_entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    return len(new_entries)


def hook_mode() -> None:
    """PreInvocation entry point.

    The contract with Antigravity is: read JSON on stdin, print a JSON object
    on stdout, exit 0. Anything else surfaces as a hook failure inside the
    student's IDE, so every step here is allowed to fail silently — a missing
    log line is a much smaller problem than a broken editor.
    """
    try:
        raw = sys.stdin.buffer.read().decode("utf-8", errors="replace").strip()
        data = json.loads(raw) if raw else {}
        if not isinstance(data, dict):
            data = {}
        transcript = transcript_from_payload(data)
        if transcript:
            n = log_from_hook(transcript, data)
            if n:
                print(f"[antigravity-log] Logged {n} prompt(s).",
                      file=sys.stderr)
    except Exception:
        pass
    print("{}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract user prompts from Antigravity IDE transcripts"
                    " into .ai-log/session.jsonl."
    )
    parser.add_argument("--hook", action="store_true",
                        help="Antigravity 2.0 hook: read the PreInvocation"
                             " payload from stdin.")
    parser.add_argument("--auto", action="store_true",
                        help="Default mode: scan recent conversations.")
    parser.add_argument("--hours", type=int, default=24,
                        help="Window in hours when scanning (default: 24).")
    parser.add_argument("--all", action="store_true",
                        help="Ignore the time window; scan everything.")
    parser.add_argument("--conv-id",
                        help="Limit to a single conversation id.")
    parser.add_argument("--no-repo-filter", action="store_true",
                        help="Don't filter conversations by current repo.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be logged, don't write.")
    # Legacy positional args from old log_manual.py callers.
    parser.add_argument("summary", nargs="?", help=argparse.SUPPRESS)
    parser.add_argument("model", nargs="?", help=argparse.SUPPRESS)
    args = parser.parse_args()

    if args.hook:
        hook_mode()
        return

    # Legacy manual mode: `log_antigravity.py "my summary" gemini`
    if args.summary and not (args.auto or args.conv_id or args.all):
        _legacy_log(args.summary, args.model or "gemini")
        return

    brain_dirs = get_brain_dirs()
    if not brain_dirs:
        print("[antigravity-log] No Antigravity brain/ directory found "
              f"(checked {', '.join(str(p) for p in BRAIN_CANDIDATES)}).",
              file=sys.stderr)
        sys.exit(0)

    log_dir = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "session.jsonl"
    logged_ids = get_logged_entry_ids(log_file)

    cutoff = None
    if not args.all:
        cutoff = datetime.now(tz=VN_TZ) - timedelta(hours=args.hours)

    repo_root_n = "" if args.no_repo_filter else _normalize(str(Path.cwd()))

    repo, branch, commit, student = repo_context()

    new_entries: list[dict] = []
    for msg in iter_user_inputs(brain_dirs, cutoff, args.conv_id, repo_root_n):
        entry = build_entry(msg, repo, branch, commit, student)
        if entry["entry_id"] in logged_ids:
            continue
        new_entries.append(entry)
        logged_ids.add(entry["entry_id"])

    if not new_entries:
        scope = "all" if args.all else f"{args.hours}h"
        repo_note = "any repo" if args.no_repo_filter else f"repo={repo_root_n or '(unknown)'}"
        print(f"[antigravity-log] No new prompts ({repo_note}, window={scope}).",
              file=sys.stderr)
        sys.exit(0)

    if args.dry_run:
        print(f"\n[antigravity-log] DRY RUN — would log "
              f"{len(new_entries)} entries:\n")
        for e in new_entries:
            preview = e["prompt"].replace("\n", " ")[:120]
            print(f"  [{e['ts'][:19]}] {preview}")
        sys.exit(0)

    with open(log_file, "a", encoding="utf-8") as f:
        for e in new_entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"[antigravity-log] Logged {len(new_entries)} prompt(s) from "
          f"Antigravity IDE.", file=sys.stderr)


# ---------------------------------------------------------------------------
# Legacy manual mode (kept for back-compat with log_manual.py callers and the
# old .agents/rules instructions). New rules tell the AI not to call this.
# ---------------------------------------------------------------------------

def _legacy_log(summary: str, model: str) -> None:
    ts = datetime.now(VN_TZ).isoformat()
    entry = {
        "ts": ts,
        "tool": "antigravity",
        "event": "TaskComplete",
        "entry_id": f"antigravity-{datetime.now(VN_TZ).strftime('%Y%m%d-%H%M%S')}",
        "model": model,
        "repo": git("git remote get-url origin").split("/")[-1].replace(".git", ""),
        "branch": git("git rev-parse --abbrev-ref HEAD"),
        "commit": git("git rev-parse --short HEAD"),
        "student": git("git config user.email") or os.environ.get(
            "USERNAME", os.environ.get("USER", "unknown")),
        "prompt": summary[:1000],
        "response_summary": f"[Antigravity] {summary[:500]}",
    }
    log_dir = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
    log_dir.mkdir(exist_ok=True)
    with open(log_dir / "session.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"[antigravity-log] Logged manual: {summary[:80]}...", file=sys.stderr)


if __name__ == "__main__":
    main()
