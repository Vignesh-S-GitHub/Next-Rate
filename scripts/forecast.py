#!/usr/bin/env python3
"""NextRate transparent next-session *experimental* bullion outlook.

This model is an explainable, volatility-banded momentum baseline, NOT a
validated trading signal or guarantee. It cannot predict city retail prices.
Forecasts are issued using only observations available at creation time.
Each issued forecast is archived (never retroactively altered) and scored
only when a matching dated *future* IBJA observation becomes available.
"""
from __future__ import annotations

import json
import math
import statistics
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
IST = ZoneInfo("Asia/Kolkata")
LATEST = ROOT / "data/latest.json"
HISTORY = ROOT / "data/history.json"
FORECAST = ROOT / "data/forecast.json"
ARCHIVE = ROOT / "data/forecast_history.json"
KEYS = {
    "gold24": ("gold24_inr_10g", "24K gold", "10 g", 100, .015, .008),
    "gold22": ("gold22_inr_10g", "22K gold", "10 g", 100, .015, .008),
    "silver": ("silver999_inr_kg", "Silver 999", "1 kg", 500, .028, .012),
}


def read_json(path: Path, default=None):
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


# IBJA-published commodity exchange holidays for 2026 (not all office
# holidays). Few festival dates can change; review annually.
# https://www.ibjarates.com/pdf/List-of-Holidays/List-of-Holidays-2026.pdf
IBJA_2026_EXCHANGE_HOLIDAYS = frozenset({
    "2026-01-15", "2026-01-26", "2026-02-15", "2026-03-03",
    "2026-03-21", "2026-03-26", "2026-03-31", "2026-04-03",
    "2026-04-14", "2026-05-01", "2026-05-27", "2026-06-26",
    "2026-08-15", "2026-09-14", "2026-10-02", "2026-10-20",
    "2026-11-08", "2026-11-24", "2026-12-25",
})
IBJA_HOLIDAY_SOURCE = "https://www.ibjarates.com/pdf/List-of-Holidays/List-of-Holidays-2026.pdf"


def next_weekday(day: date) -> date:
    d = day + timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d


def next_ibja_publication_day(day: date) -> date:
    d = next_weekday(day)
    while d.isoformat() in IBJA_2026_EXCHANGE_HOLIDAYS:
        d = next_weekday(d)
    return d


def nearest(value: float, step: int) -> int:
    return max(step, int(math.floor(value / step + .5)) * step)


def floor_step(value: float, step: int) -> int:
    return max(step, int(math.floor(value / step)) * step)


def ceil_step(value: float, step: int) -> int:
    return max(step, int(math.ceil(value / step)) * step)


def clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def prepare_history(latest: dict, history: dict, as_of: date):
    items = {}
    for row in history.get("india", []):
        if not isinstance(row, dict):
            continue
        try:
            day = date.fromisoformat(row["date"])
        except (ValueError, KeyError, TypeError):
            continue
        if day > as_of:
            continue
        if all(isinstance(row.get(v[0]), (int, float)) and row[v[0]] > 0
               for v in KEYS.values()):
            items[row["date"]] = row.copy()
    last = latest.get("india") or {}
    if "date" not in last:
        return [], None
    try:
        anchor = date.fromisoformat(last["date"])
    except (ValueError, TypeError):
        return [], None
    if anchor > as_of or (as_of - anchor).days > 5:
        return [], None
    # The actively published IBJA session is the anchor, even if history
    # contains an older AM rate for the same day.
    if not all(isinstance(last.get(v[0]), (int, float)) and last[v[0]] > 0
               for v in KEYS.values()):
        return [], None
    items[last["date"]] = last.copy()
    rows = [items[k] for k in sorted(items)]
    return rows[-90:], last


def metal_forecast(rows: list, anchor: dict, code: str):
    key, label, unit, step, min_band, max_shift = KEYS[code]
    series = [r[key] for r in rows]
    returns = [(b - a) / a for a, b in zip(series, series[1:]) if a > 0]
    window = returns[-min(7, len(returns)):]
    if len(window) < 2:
        return None
    median_move = statistics.median(window)
    # Deliberately damp trend; with fewer than 10 samples use 20% of recent
    # momentum rather than projecting the last full session's move.
    damp = .20 if len(rows) < 10 else .30
    shift = clip(median_move * damp, -max_shift, max_shift)
    recent_dispersion = statistics.median(abs(x) for x in window)
    # Heuristic scenario width. NOT a calibrated prediction interval.
    band_pct = clip(max(min_band, recent_dispersion * 2), min_band, .12)
    base = anchor[key]
    point = nearest(base * (1 + shift), step)
    low = floor_step(min(base, point) * (1 - band_pct), step)
    high = ceil_step(max(base, point) * (1 + band_pct), step)
    if high <= low:
        high = low + 2 * step
    expected_pct = round((point / base - 1) * 100, 2)
    # Do not overstate minute directional changes.
    direction = "Up" if expected_pct > .10 else "Down" if expected_pct < -.10 else "Mostly steady"
    return {
        "label": label,
        "unit": unit,
        "baseline": base,
        "estimate": point,
        "low": low,
        "high": high,
        "expected_change_pct": expected_pct,
        "direction": direction,
        "scenario_width_pct": round(band_pct * 100, 2),
        "history_returns_used": len(window),
        "description": "Volatility-banded, damped median of recent published IBJA changes.",
        "interval_calibrated": False,
    }


def generate(latest: dict, history: dict, now: datetime) -> dict:
    today = now.astimezone(IST).date()
    target = next_ibja_publication_day(today)
    output = {
        "schema_version": 1,
        "generated_at": now.isoformat(timespec="seconds"),
        "today_ist": today.isoformat(),
        "calendar_tomorrow": (today + timedelta(days=1)).isoformat(),
        "target_date": target.isoformat(),
        "target_type": "expected_IBJA_publication_day",
        "holiday_calendar_verified": target.year == 2026,
        "holiday_calendar_source": IBJA_HOLIDAY_SOURCE if target.year == 2026 else None,
        "market_closed_tomorrow": (today + timedelta(days=1)) != target,
        "status": "unavailable",
        "scope": "India national IBJA benchmark estimate; not city retail or jewellery pricing",
        "method": "Conservative, experimental momentum baseline with heuristic volatility range.",
        "validity": "Not a proven statistical confidence interval. Predictions may be wrong.",
        "source_url": "https://www.ibjarates.com/",
        "metals": {},
        "signal_summary": [],
    }
    rows, anchor = prepare_history(latest, history, today)
    if anchor is None:
        output["reason"] = "Last valid Indian benchmark is missing or over five days old."
        return output
    output["based_on_date"] = anchor["date"]
    output["based_on_session"] = anchor.get("session", "last")
    output["observations"] = len(rows)
    if len(rows) < 3:
        output["reason"] = "At least three dated IBJA observations are required."
        return output
    metals = {name: metal_forecast(rows, anchor, name) for name in KEYS}
    if any(m is None for m in metals.values()):
        output["reason"] = "Insufficient consistent IBJA changes for an estimate."
        return output
    output["status"] = "experimental"
    output["metals"] = metals
    output["validation"] = {
        "status": "not_backtested",
        "observations": len(rows),
        "description": "Live accuracy tracking begins with newly issued future forecasts; no historical success rate claimed."
    }
    output["signal_summary"] = [
        {
            "name": "Domestic published momentum",
            "details": "Uses up to seven successive IBJA rate changes. Recent direction is damped to avoid extrapolating full daily jumps.",
            "used_in_estimate": True,
        },
        {
            "name": "Uncertainty range",
            "details": "Uses historical absolute price movements with minimum widths of 1.5% for gold and 2.8% for silver. Heuristic, not calibrated.",
            "used_in_estimate": True,
        },
        {
            "name": "International references",
            "details": "International spot and USD/INR are shown on Markets as context, but not added to this forecast without a validated, time-aligned history.",
            "used_in_estimate": False,
        },
        {
            "name": "LBMA / COMEX / MCX",
            "details": "Official venue feeds are not connected. Their price changes are not assumed or invented.",
            "used_in_estimate": False,
        },
    ]
    return output


def score_archive(archive: list, history: dict, now: datetime):
    today = now.astimezone(IST).date()
    actuals = {r.get("date"): r for r in history.get("india", []) if isinstance(r, dict)}
    for item in archive:
        if item.get("evaluation"):
            continue
        target = item.get("target_date")
        try:
            if date.fromisoformat(target) > today:
                continue
        except (TypeError, ValueError):
            continue
        obs = actuals.get(target)
        if not obs or obs.get("session") != "PM":
            # Do not prematurely grade the next-day close from an AM observation.
            # Holidays and missing PM sessions remain unevaluated.
            continue
        outcomes = {}
        for name, config in KEYS.items():
            metal = item.get("metals", {}).get(name)
            actual = obs.get(config[0])
            if not metal or not isinstance(actual, (int, float)) or actual <= 0:
                continue
            estimate, baseline = metal["estimate"], metal["baseline"]
            outcomes[name] = {
                "actual": actual,
                "absolute_error_pct": round(abs(estimate - actual) / actual * 100, 3),
                "range_covered": metal["low"] <= actual <= metal["high"],
                "direction_correct": ((estimate - baseline >= 0) == (actual - baseline >= 0))
                                     if abs(estimate - baseline) > 0 else None,
            }
        if outcomes:
            item["evaluation"] = {
                "evaluated_at": now.isoformat(timespec="seconds"),
                "actual_date": target,
                "metals": outcomes,
            }
    return archive


def publish(now=None):
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    latest = read_json(LATEST)
    history = read_json(HISTORY)
    archive = read_json(ARCHIVE, {"schema_version": 1, "forecasts": []})
    records = archive.get("forecasts", [])
    scored = score_archive(records, history, now)
    fresh = generate(latest, history, now)
    if fresh["status"] == "experimental":
        # An immutable issuance is recorded for each new source session and target.
        issuance_key = ":".join([fresh["target_date"], fresh["based_on_date"],
                                 fresh["based_on_session"]])
        fresh["issuance_key"] = issuance_key
        if not any(v.get("issuance_key") == issuance_key for v in scored):
            scored.append({
                "issuance_key": issuance_key,
                "issued_at": now.isoformat(timespec="seconds"),
                "target_date": fresh["target_date"],
                "based_on_date": fresh["based_on_date"],
                "based_on_session": fresh["based_on_session"],
                "metals": fresh["metals"],
            })
        evaluated = [entry for entry in scored if entry.get("evaluation")]
        fresh["accuracy_tracking"] = {
            "evaluated_issuances": len(evaluated),
            "status": "collecting" if len(evaluated) < 10 else "available",
        }
        if len(evaluated) >= 10:
            for metal in KEYS:
                errors = [x["evaluation"]["metals"][metal]["absolute_error_pct"]
                          for x in evaluated if metal in x["evaluation"]["metals"]]
                if errors:
                    fresh["accuracy_tracking"][metal] = {
                        "mean_absolute_percentage_error": round(statistics.mean(errors), 2),
                        "sample_size": len(errors),
                    }
    # Preserve older issued predictions for retrospective scoring.
    archive["schema_version"] = 1
    archive["forecasts"] = scored[-300:]
    FORECAST.parent.mkdir(parents=True, exist_ok=True)
    FORECAST.write_text(json.dumps(fresh, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    ARCHIVE.write_text(json.dumps(archive, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Forecast", fresh["status"], "target", fresh["target_date"],
          "IBJA samples", fresh.get("observations"), "archived", len(scored))
    return fresh, archive


if __name__ == "__main__":
    try:
        publish()
    except Exception as exc:
        print("Forecast pipeline failed:", exc, file=sys.stderr)
        sys.exit(1)
