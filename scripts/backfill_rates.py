#!/usr/bin/env python3
"""Conservative IBJA PM history backfill, with explicit secondary-source credit.

TrackLivePrice republishes a dated IBJA time series under an attribution licence.
Never create missing values, predict historical sessions, or replace the
higher-precision IBJA observations already captured by NextRate.
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from zoneinfo import ZoneInfo

from scripts.update_rates import download, validate_rates

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / "data" / "history.json"
LATEST = ROOT / "data" / "latest.json"
IST = ZoneInfo("Asia/Kolkata")
BASE = "https://trackliveprice.com"
URLS = {
    "gold24_inr_10g": (BASE + "/api/gold/999.json", "gold", "999", 10),
    "gold22_inr_10g": (BASE + "/api/gold/916.json", "gold", "916", 10),
    "silver999_inr_kg": (BASE + "/api/silver.json", "silver", "999", 1000),
}
LIMIT = 365
LOG = logging.getLogger("nextrate.backfill")


def get_close_values(doc: dict, metal: str, purity: str, multiplier: int,
                     today: date) -> dict:
    """Parse series and restore rupees per published IBJA base unit.

    Source rates are INR/gram. Silver historical INR/kg values reconstructed
    from two-decimal INR/g have at most INR 5 rounding ambiguity.
    """
    if not isinstance(doc, dict) or doc.get("metal") != metal or doc.get("purity") != purity:
        raise ValueError("History feed has a different metal/purity")
    if doc.get("unit") != "INR per gram" or doc.get("source") != "IBJA":
        raise ValueError("History source and unit did not match advertised IBJA")
    if not isinstance(doc.get("rows"), list):
        raise ValueError("No dated historical rows")
    values = {}
    for item in doc["rows"]:
        if not isinstance(item, dict):
            continue
        try:
            day = date.fromisoformat(item["date"])
        except (TypeError, ValueError, KeyError):
            continue
        if day > today or day.year < 2020 or day.weekday() >= 5:
            continue
        # Only actual published PM observations; historical AM-only entries
        # are not silently relabelled as closing rates.
        point = item.get("pm")
        if point is None:
            continue
        try:
            dec = Decimal(str(point))
            if not dec.is_finite() or dec <= 0:
                continue
            value = int((dec * multiplier).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        except (InvalidOperation, ValueError, TypeError):
            continue
        if not (10000 < value < 1000000) and metal == "gold":
            continue
        if not (5000 < value < 3000000) and metal == "silver":
            continue
        values[day.isoformat()] = value
    if len(values) < 20:
        raise ValueError("History series contains fewer than 20 valid PM closes")
    return values


def combine_history(history: dict, published_latest: dict, archives: dict,
                    now: datetime) -> tuple[dict, int, int]:
    existing = {
        row["date"]: dict(row)
        for row in history.get("india", [])
        if isinstance(row, dict) and isinstance(row.get("date"), str)
    }
    if published_latest:
        existing[published_latest["date"]] = dict(published_latest)
    known_last = date.fromisoformat(published_latest["date"]) if published_latest else now.astimezone(IST).date()
    candidate_dates = set().union(*(set(feed.keys()) for feed in archives.values())) if archives else set()
    conflicts = 0
    imported = 0
    for day in sorted(candidate_dates):
        if date.fromisoformat(day) >= known_last:
            continue  # never overtake a verified latest PM close
        new_values = {key: rows[day] for key, rows in archives.items() if day in rows}
        if not new_values:
            continue
        known = existing.get(day, {})
        # Our current official IBJA observations have INR-1 precision, whereas
        # the archived silver INR/g input was rounded to hundredths.
        tolerances = {
            "gold24_inr_10g": 2,
            "gold22_inr_10g": 2,
            "silver999_inr_kg": 10,
        }
        if any(field in known and abs(known[field] - v) > tolerances[field]
               for field, v in new_values.items()):
            conflicts += 1
            LOG.warning("Skipped conflicting historical date %s", day)
            continue
        result = {**known}
        if not result:
            result = {
                "date": day,
                "session": "PM",
                "source": "IBJA archive via TrackLivePrice",
                "source_url": BASE + "/methodology/",
                "source_precision": "INR 1 per 10g gold; silver converted from two-decimal INR/g",
            }
        for key, value in new_values.items():
            result.setdefault(key, value)
        if all(key in result for key in ("gold24_inr_10g","gold22_inr_10g","silver999_inr_kg")):
            if not validate_rates(result):
                conflicts += 1
                continue
        if day not in existing:
            imported += 1
        existing[day] = result
    output = {**history, "schema_version": 1,
              "india": [existing[k] for k in sorted(existing)][-LIMIT:]}
    output["backfill"] = {
        "source": "TrackLivePrice archive of IBJA rates",
        "source_url": BASE + "/methodology/",
        "last_checked_at": now.isoformat(timespec="seconds"),
        "imported_new_dates": imported,
        "conflicting_dates_skipped": conflicts,
        "series_available": sorted(archives),
        "historical_closes": len(output["india"]),
        "note": "Backfilled PM rates, not live streaming; independent IBJA latest quote takes priority.",
    }
    return output, imported, conflicts


def backfill(now: datetime | None = None) -> dict:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    if not LATEST.exists() or not HISTORY.exists():
        raise RuntimeError("Run update_rates.py before historical backfill")
    latest = json.loads(LATEST.read_text(encoding="utf-8"))
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    archives = {}
    for key, (url, metal, purity, multiplier) in URLS.items():
        try:
            raw = json.loads(download(url))
            parsed = get_close_values(raw, metal, purity, multiplier,
                                      now.astimezone(IST).date())
            archives[key] = parsed
            LOG.info("Accepted %d dated %s PM closes",len(parsed),key)
        except Exception as exc:
            LOG.warning("Archive source unavailable for %s: %s", key, exc)
    if not archives:
        LOG.warning("Historical backfill unavailable; original verified history retained")
        return history
    result, imported, conflicts = combine_history(
        history, latest.get("india"), archives, now)
    if imported or result != history:
        HISTORY.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
    LOG.info("PM backfill complete: %d new historical dates; %d rejected conflicts; %d total",
             imported, conflicts, len(result["india"]))
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")
    backfill()
