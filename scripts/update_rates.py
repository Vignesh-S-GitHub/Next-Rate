#!/usr/bin/env python3
"""Collect attributable market observations for NextRate.

Only source-backed rates are published. Do not turn spot conversions into retail
prices or call an indicative spot quote an LBMA/COMEX/MCX settlement.
"""
from __future__ import annotations

import json
import logging
import math
import re
import sys
import time
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo
# Share the already-reviewed IBJA commodity holiday calendar with forecasts.
try:
    from scripts.forecast import IBJA_2026_EXCHANGE_HOLIDAYS
except ModuleNotFoundError:
    from forecast import IBJA_2026_EXCHANGE_HOLIDAYS

ROOT = Path(__file__).resolve().parents[1]
LATEST = ROOT / "data" / "latest.json"
HISTORY = ROOT / "data" / "history.json"
IST = ZoneInfo("Asia/Kolkata")
IBJA_URL = "https://www.ibjarates.com/"
SPOT_URL = "https://api.gold-api.com/price/"
FX_URLS = (
    "https://api.frankfurter.dev/v2/rate/usd/inr",
    "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR",
    "https://open.er-api.com/v6/latest/USD",
)
USER_AGENT = "NextRate/1.0 (+https://github.com/Vignesh-S-GitHub/Next-Rate; daily market reference)"
LOG = logging.getLogger("nextrate")


class RowExtractor(HTMLParser):
    """Extract rendered table cells without reusing the site's HTML content."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.fragments = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []
        elif tag in ("br", "p", "div", "li"):
            self.fragments.append(" ")

    def handle_data(self, data):
        self.fragments.append(data)
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            value = " ".join("".join(self.cell).split())
            self.row.append(value)
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if any(self.row):
                self.rows.append(self.row)
            self.row = None


def download(url: str) -> bytes:
    last_error = None
    for attempt in range(3):
        try:
            req = Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
                "Cache-Control": "no-cache",
            })
            with urlopen(req, timeout=25) as response:
                body = response.read(1_500_001)
                if len(body) > 1_500_000:
                    raise ValueError("Unexpectedly large response")
                return body
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt != 2:
                time.sleep(attempt + 1)
    raise RuntimeError("Request failed for " + url + ": " + str(last_error))


def integer(value: str):
    cleaned = str(value).replace(",", "").replace("₹", "").strip()
    if re.fullmatch(r"\d{3,8}(?:\.0+)?", cleaned):
        return int(float(cleaned))
    return None


def validate_rates(row: dict):
    gold24 = row.get("gold24_inr_10g")
    gold22 = row.get("gold22_inr_10g")
    silver = row.get("silver999_inr_kg")
    if not all(isinstance(v, int) for v in (gold24, gold22, silver)):
        return False
    return (10000 < gold24 < 1000000 and
            0.87 < gold22 / gold24 < 0.97 and
            5000 < silver < 3000000)


def dated_rows(html: str, parser: RowExtractor):
    matches = []
    for i, row in enumerate(parser.rows):
        joined = " ".join(row)
        m = re.search(r"\b(\d{1,2}/\d{1,2}/20\d{2})\b", joined)
        if not m:
            continue
        try:
            day = datetime.strptime(m.group(1), "%d/%m/%Y").date()
        except ValueError:
            continue
        rest = joined[m.end():]
        nums = [integer(x) for x in re.findall(r"\b\d[\d,]{3,8}\b", rest)]
        nums = [n for n in nums if n is not None]
        if len(nums) < 6:
            continue
        item = {
            "date": day.isoformat(),
            "session": "AM",
            "gold24_inr_10g": nums[0],
            "gold22_inr_10g": nums[2],
            "silver999_inr_kg": nums[5],
        }
        if validate_rates(item):
            matches.append((i, item))
    # Fallback for pages where the dated historical table is not represented by <tr>.
    if not matches:
        text = " ".join(" ".join(parser.fragments).split())
        rg = r"(\d{1,2}/\d{1,2}/20\d{2})\s+(\d{4,8})\s+(\d{4,8})\s+(\d{4,8})\s+(\d{4,8})\s+(\d{4,8})\s+(\d{4,8})"
        for i, m in enumerate(re.finditer(rg, text)):
            try:
                day = datetime.strptime(m.group(1), "%d/%m/%Y").date()
            except ValueError:
                continue
            nums = list(map(int, m.groups()[1:]))
            item = {
                "date": day.isoformat(), "session": "AM",
                "gold24_inr_10g": nums[0],
                "gold22_inr_10g": nums[2],
                "silver999_inr_kg": nums[5],
            }
            if validate_rates(item):
                matches.append((i, item))
    # IBJA displays separate AM and PM historical sections. When a date occurs
    # twice, the latter section is PM; never infer price movements from row order.
    seen = {}
    for _, row in matches:
        day = row["date"]
        if day in seen:
            row["session"] = "PM"
        seen[day] = row
    return seen


def current_session_rows(parser: RowExtractor):
    numbers = {}
    for row in parser.rows:
        if len(row) < 2:
            continue
        label = re.sub(r"\s+", " ", row[0]).lower().strip()
        key = None
        if re.fullmatch(r"gold\s*999", label):
            key = "gold24_inr_10g"
        elif re.fullmatch(r"gold\s*916", label):
            key = "gold22_inr_10g"
        elif re.fullmatch(r"silver\s*999", label):
            key = "silver999_inr_kg"
        if key:
            # HTML has AM and PM columns. Blank PM is a normal pre-close state.
            numbers[key] = [integer(c) for c in row[1:3]]
    result = {}
    for idx, session in ((0, "AM"), (1, "PM")):
        row = {name: (vals[idx] if len(vals) > idx else None)
               for name, vals in numbers.items()}
        if validate_rates(row):
            result[session] = row
    return result


def parse_ibja(html: str, now: datetime):
    parser = RowExtractor()
    parser.feed(html)
    history = dated_rows(html, parser)
    today = now.astimezone(IST).date()
    today_iso = today.isoformat()
    # Use a timestamped historical session whenever it exists.
    if today_iso in history:
        current = history[today_iso].copy()
    else:
        # Only infer today's date from the site's current AM/PM table during
        # normal publication hours on weekdays. The schedule runs after close.
        current = None
        today_rows = current_session_rows(parser)
        local = now.astimezone(IST)
        # The undated AM/PM table may still contain the last working day's
        # rates. Never re-label that table as a new publication on a known
        # exchange holiday or after a prolonged source outage.
        last_dated = date.fromisoformat(max(history)) if history else None
        prior_recent = last_dated is not None and (today-last_dated).days <= 4
        if (local.weekday() < 5 and today_iso not in IBJA_2026_EXCHANGE_HOLIDAYS
                and (local.hour >= 13) and today_rows and prior_recent):
            session = "PM" if local.hour >= 18 and "PM" in today_rows else "AM"
            if session in today_rows:
                current = {
                    "date": today_iso,
                    "session": session,
                    **today_rows[session],
                }
    if current is not None:
        history[today_iso] = current
    if not history:
        raise ValueError("IBJA source has no valid, dated market observations")
    most_recent = max(history)
    if current is None:
        current = history[most_recent]
    published_date = date.fromisoformat(current["date"])
    if published_date > today or (today - published_date).days > 14:
        raise ValueError("IBJA observation date out of expected range")
    current = dict(current)
    current.update({
        "source": "India Bullion and Jewellers Association (IBJA)",
        "source_url": IBJA_URL,
        "retrieved_at": now.isoformat(timespec="seconds"),
        "gst_included": False,
        "making_charges_included": False,
        "geography": "India national reference, not city retail",
    })
    LOG.info("IBJA %s %s: gold999=%s gold916=%s silver999=%s (%d history days)",
             current["date"], current["session"],
             current["gold24_inr_10g"], current["gold22_inr_10g"],
             current["silver999_inr_kg"], len(history))
    return current, sorted(history.values(), key=lambda x: x["date"])


def parse_spot(body: bytes, symbol: str, now: datetime):
    item = json.loads(body)
    if item.get("symbol") != symbol or item.get("currency", "USD") != "USD":
        raise ValueError("Unexpected spot quote symbol or currency")
    raw = item.get("price")
    price = float(raw)
    if not math.isfinite(price) or price <= 0:
        raise ValueError("Invalid spot price")
    stamp = item.get("updatedAt")
    if not stamp:
        raise ValueError("Spot source provided no quote timestamp")
    as_of = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    if as_of.tzinfo is None:
        raise ValueError("Spot timestamp missing timezone")
    age = (now - as_of).total_seconds()
    if age < -600 or age > 7 * 86400:
        raise ValueError("Spot observation timestamp is stale or in the future")
    return {
        "usd_per_troy_ounce": round(price, 4),
        "as_of": as_of.isoformat(timespec="seconds"),
        "retrieved_at": now.isoformat(timespec="seconds"),
        "source": "Gold API indicative spot",
        "source_url": "https://gold-api.com/docs",
    }


def parse_fx(body: bytes, now: datetime):
    item = json.loads(body)
    if not isinstance(item, dict):
        raise ValueError("Malformed currency response")
    source = "Frankfurter daily FX reference"
    link = "https://frankfurter.dev/"
    if item.get("result") == "success" and item.get("base_code") == "USD":
        # Open ExchangeRate-API fallback. This endpoint requires attribution
        # when the USD/INR rate appears in the app.
        source = "ExchangeRate-API open access"
        link = "https://www.exchangerate-api.com"
        value = float(item["rates"]["INR"])
        day = datetime.fromtimestamp(int(item["time_last_update_unix"]), timezone.utc).date()
    elif item.get("base", "").upper() == "USD" and item.get("quote", "").upper() == "INR":
        # Frankfurter v2 single-pair response
        value = float(item["rate"])
        day = date.fromisoformat(item["date"])
    elif item.get("base", "").upper() == "USD" and isinstance(item.get("rates"), dict):
        # Frankfurter v1 latest (ECB daily reference)
        value = float(item["rates"]["INR"])
        day = date.fromisoformat(item["date"])
    else:
        raise ValueError("Unexpected FX response structure")
    local_today = now.astimezone(IST).date()
    if not math.isfinite(value) or not (20 < value < 250):
        raise ValueError("Invalid INR exchange rate")
    if day > local_today or (local_today - day).days > 10:
        raise ValueError("FX reference out of publication window: " + day.isoformat() + " vs " + local_today.isoformat())
    return {
        "inr_per_usd": round(value, 5),
        "date": day.isoformat(),
        "retrieved_at": now.isoformat(timespec="seconds"),
        "source": source,
        "source_url": link,
    }


def load(path: Path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def append_history(old: list, fresh: list, keys: tuple):
    by_key = {}
    for item in old + fresh:
        if not isinstance(item, dict) or not all(k in item for k in keys):
            continue
        key = tuple(item[k] for k in keys)
        by_key[key] = item
    return sorted(by_key.values(), key=lambda item: tuple(item[k] for k in keys))[-180:]


def refresh(now=None):
    now = now or datetime.now(timezone.utc)
    now = now.astimezone(timezone.utc)
    latest = load(LATEST)
    history = load(HISTORY)
    snapshot = {
        "schema_version": 1,
        "checked_at": now.isoformat(timespec="seconds"),
        "india": latest.get("india"),
        "spot": latest.get("spot", {}),
        "fx": latest.get("fx"),
        "sources_checked": {},
    }
    records = {
        **history,
        "schema_version": 1,
        "india": history.get("india", []),
        "spot": history.get("spot", {}),
        "fx": history.get("fx", []),
    }
    succeeded = 0
    try:
        html = download(IBJA_URL).decode("utf-8", errors="replace")
        india, observed = parse_ibja(html, now)
        snapshot["india"] = india
        records["india"] = append_history(records["india"], observed, ("date",))
        snapshot["sources_checked"]["ibja"] = "ok"
        succeeded += 1
    except Exception as exc:
        snapshot["sources_checked"]["ibja"] = "unavailable"
        LOG.warning("IBJA unavailable: %s", exc)
    for symbol in ("XAU", "XAG"):
        try:
            spot = parse_spot(download(SPOT_URL + symbol), symbol, now)
            snapshot["spot"][symbol] = spot
            rows = records["spot"].get(symbol, [])
            records["spot"][symbol] = append_history(rows, [{
                "date": now.astimezone(IST).date().isoformat(),
                **spot,
            }], ("as_of",))
            snapshot["sources_checked"][symbol.lower()] = "ok"
            succeeded += 1
        except Exception as exc:
            snapshot["sources_checked"][symbol.lower()] = "unavailable"
            LOG.warning("%s spot unavailable: %s", symbol, exc)
    fx_errors = []
    for url in FX_URLS:
        try:
            fx = parse_fx(download(url), now)
            snapshot["fx"] = fx
            records["fx"] = append_history(records["fx"], [fx], ("date",))
            snapshot["sources_checked"]["usd_inr"] = "ok"
            LOG.info("USD/INR %s via %s: %s", fx["date"], fx["source"], fx["inr_per_usd"])
            succeeded += 1
            break
        except Exception as exc:
            fx_errors.append(str(exc))
            LOG.warning("FX endpoint rejected %s: %s", url.split("/")[2], exc)
    else:
        snapshot["sources_checked"]["usd_inr"] = "unavailable"
        LOG.warning("USD/INR all providers unavailable: %s", " | ".join(fx_errors))
    if succeeded == 0:
        raise RuntimeError("All data sources unavailable; preserved existing published snapshot")
    LATEST.parent.mkdir(parents=True, exist_ok=True)
    LATEST.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    HISTORY.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    LOG.info("Wrote market data: %d/4 sources succeeded", succeeded)
    return snapshot, records


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        refresh()
    except Exception as exc:
        LOG.error("Refresh failed: %s", exc)
        sys.exit(1)
