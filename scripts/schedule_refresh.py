#!/usr/bin/env python3
"""Decide/recheck AM/PM refreshes and record actual scheduled publications.

Price timestamps, successful deployment, and a genuine schedule event are all
required. A code-push run cannot certify that the timer worked.
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

try:
    from scripts.forecast import IBJA_2026_EXCHANGE_HOLIDAYS
    from scripts.update_rates import validate_rates
except ModuleNotFoundError:
    from forecast import IBJA_2026_EXCHANGE_HOLIDAYS
    from update_rates import validate_rates

ROOT = Path(__file__).resolve().parents[1]
IST = ZoneInfo("Asia/Kolkata")
CUTOFF = {"AM": time(13, 15), "PM": time(19, 15)}


def read(path, default=None):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else ({} if default is None else default)
    except (OSError, ValueError):
        return {} if default is None else default


def closed(day):
    return day.weekday() >= 5 or day.isoformat() in IBJA_2026_EXCHANGE_HOLIDAYS


def session_health(root, day, session, now=None):
    latest = read(root / "data/latest.json")
    quote = latest.get("india") or {}
    if not isinstance(quote, dict):
        return False, "Invalid source observation"
    expected = datetime.combine(day, CUTOFF[session], IST)
    try:
        stamp = datetime.fromisoformat(latest["checked_at"].replace("Z", "+00:00"))
        at = now or datetime.now(timezone.utc)
        fresh = stamp.tzinfo is not None and expected <= stamp <= at+timedelta(minutes=5)
        quote_day = date.fromisoformat(quote["date"])
    except (ValueError, TypeError, KeyError, AttributeError):
        return False, "Missing or invalid source/check timestamp"
    if not fresh:
        return False, "No source check after this session's collection time"
    checks = latest.get("sources_checked")
    if not isinstance(checks, dict) or checks.get("ibja") != "ok" or not validate_rates(quote):
        return False, "IBJA did not pass its source/price checks"
    if quote_day > day:
        return False, "A different day's observation cannot certify this session"
    if closed(day):
        return True, "Market closed; original source date retained"
    archive = read(root / f"data/archive/ibja/{day.year}.json").get("records", [])
    if not isinstance(archive, list):
        return False, "Invalid opening/closing archive"
    required = ("AM", "PM") if session == "PM" else ("AM",)
    captured = {r.get("session") for r in archive if isinstance(r, dict) and r.get("date") == day.isoformat() and validate_rates(r)}
    if quote_day != day or (session == "PM" and quote.get("session") != "PM"):
        return False, "Expected dated IBJA session is not published in the snapshot"
    if not set(required).issubset(captured):
        return False, "Opening/closing source observations missing from the annual archive"
    return True, "Dated source session and opening/closing archive verified"


def decide(root=ROOT, now=None, session=None, day=None, requested=False):
    local = (now or datetime.now(timezone.utc)).astimezone(IST)
    if requested and not session:
        return {"refresh": True, "session": "", "date": local.date().isoformat(),
                "reason": "Explicit code-push/manual refresh"}
    day = day or local.date()
    if session not in (None, "AM", "PM"):
        raise ValueError("Session must be AM or PM")
    if session is None:
        session = "PM" if local.time() >= CUTOFF["PM"] else "AM"
    due = datetime.combine(day, CUTOFF[session], IST)
    if local < due:
        return {"refresh": False, "session": session, "date": day.isoformat(),
                "reason": "Before the session's collection time"}
    healthy, reason = session_health(root, day, session, now=local)
    receipts = read(root / "data/refresh_status.json").get("sessions")
    receipt = receipts.get(day.isoformat()+":"+session, {}) if isinstance(receipts, dict) else {}
    if not isinstance(receipt, dict):
        receipt = {}
    certified = (receipt.get("trigger") == "schedule" and receipt.get("published") is True
                 and receipt.get("target_date") == day.isoformat() and receipt.get("session") == session
                 and str(receipt.get("run_id", "")).isdigit())
    try:
        completed = datetime.fromisoformat(receipt.get("completed_at", "").replace("Z", "+00:00"))
        certified = certified and completed.tzinfo is not None and due <= completed <= local+timedelta(minutes=5)
    except (ValueError, TypeError, AttributeError):
        certified = False
    if healthy and certified:
        reason = "Already collected and published by a verified scheduled run"
    elif healthy:
        reason = "Source data exists, but this session has no successful timer/deployment receipt"
    return {"refresh": not (healthy and certified), "session": session,
            "date": day.isoformat(), "reason": reason}


def record(root, day, session, now=None, trigger="", run_id=""):
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    healthy, reason = session_health(root, day, session, now=now)
    if not healthy:
        raise ValueError(reason)
    path = root / "data/refresh_status.json"
    status = read(path, {"schema_version": 1, "sessions": {}})
    sessions = status.get("sessions")
    if not isinstance(sessions, dict):
        sessions = {}
    latest = read(root / "data/latest.json")
    sessions[day.isoformat()+":"+session] = {
        "target_date": day.isoformat(), "session": session, "trigger": trigger,
        "run_id": str(run_id), "completed_at": now.isoformat(timespec="seconds"),
        "published": True, "quote_date": latest["india"]["date"],
        "quote_session": latest["india"]["session"], "market_closed": closed(day),
    }
    # Operational receipts are bounded; permanent price archives are untouched.
    oldest = (day-timedelta(days=30)).isoformat()
    status["sessions"] = {k:v for k,v in sessions.items() if k[:10] >= oldest}
    status["schema_version"] = 1
    path.write_text(json.dumps(status, indent=2)+"\n", encoding="utf-8")
    return status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--requested", action="store_true")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--record", action="store_true")
    args = parser.parse_args()
    session = os.environ.get("NEXT_RATE_REQUESTED_SESSION") or None
    raw_day = os.environ.get("NEXT_RATE_REQUESTED_DATE")
    day = date.fromisoformat(raw_day) if raw_day else None
    if args.verify or args.record:
        if not session:
            print("No scheduled session requested; ordinary publication checks apply")
            return 0
        day = day or datetime.now(IST).date()
        healthy, reason = session_health(ROOT, day, session)
        if not healthy:
            raise ValueError(reason)
        if args.record:
            record(ROOT, day, session, trigger=os.environ.get("GITHUB_EVENT_NAME", ""),
                   run_id=os.environ.get("GITHUB_RUN_ID", ""))
        print("SESSION VERIFIED:", day, session, reason)
        return 0
    outcome = decide(ROOT, session=session, day=day, requested=args.requested)
    print(json.dumps(outcome))
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as f:
            f.write("refresh="+str(outcome["refresh"]).lower()+"\n")
            f.write("session="+outcome["session"]+"\n")
            f.write("date="+outcome["date"]+"\n")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("## NextRate session check\n\n")
            f.write(f"- Session: {outcome['date']} {outcome['session']} (IST)\n")
            f.write(f"- Trigger: {os.environ.get('GITHUB_EVENT_NAME', 'local')}\n")
            f.write(f"- Refresh required: {outcome['refresh']}\n- Reason: {outcome['reason']}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
