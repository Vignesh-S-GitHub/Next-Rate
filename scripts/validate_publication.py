#!/usr/bin/env python3
"""Reject internally inconsistent NextRate publications before push/deployment.

No external network calls. Source outages are allowed if the prior observation
and its original date are preserved. Freshness warnings are not fabricated data.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import date, datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
METALS = {
    "gold24": ("gold24_inr_10g", 10000, 1000000),
    "gold22": ("gold22_inr_10g", 10000, 1000000),
    "silver": ("silver999_inr_kg", 5000, 3000000),
}
EXPECTED_CITIES = {"Chennai", "Mumbai", "Delhi", "Bengaluru", "Hyderabad"}


def referenced_frontend_assets(html: str):
    """Return local script and stylesheet dependencies declared in HTML."""
    class Assets(HTMLParser):
        def __init__(self):
            super().__init__()
            self.paths = []

        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            value = (attrs.get("src") if tag == "script" else
                     attrs.get("href") if tag == "link" and
                     "stylesheet" in attrs.get("rel", "").lower().split() else None)
            if not value:
                return
            url = urlsplit(value)
            if url.scheme or url.netloc:
                return
            name = url.path.removeprefix("./")
            if not name or name.startswith("/") or ".." in Path(name).parts:
                raise ValueError("Invalid local frontend asset path")
            self.paths.append(name)

    parser = Assets()
    parser.feed(html)
    return parser.paths


def require(condition: bool, reason: str):
    if not condition:
        raise ValueError(reason)


def read(root: Path, name: str):
    path = root / "data" / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ValueError("Missing or malformed publication: " + str(path)) from exc


def valid_day(value, today: date):
    try:
        parsed = date.fromisoformat(value)
        return parsed <= today and parsed.year >= 2020
    except (ValueError, TypeError):
        return False


def price(value, lower: float, upper: float):
    return type(value) in (int, float) and math.isfinite(value) and lower < value < upper


def india_row(row: dict, today: date, complete=True):
    require(isinstance(row, dict), "Missing Indian bullion row")
    require(valid_day(row.get("date"), today), "Invalid or future-dated IBJA observation")
    require(row.get("session") in ("AM", "PM"), "Unlabelled IBJA session")
    populated = 0
    for field, lo, hi in METALS.values():
        value = row.get(field)
        if value is not None:
            require(price(value, lo, hi), "Impossible " + field)
            populated += 1
    require(populated == 3 if complete else populated >= 1, "Incomplete IBJA observation")
    a, b = row.get("gold24_inr_10g"), row.get("gold22_inr_10g")
    if a and b:
        require(.87 < b/a < .97, "IBJA gold purity ratio mismatch")
    return row


def verify(root: Path = ROOT, now: date | None = None, site=False):
    today = now or datetime.now(ZoneInfo("Asia/Kolkata")).date()
    latest, history = read(root, "latest.json"), read(root, "history.json")
    require(latest.get("schema_version") == history.get("schema_version") == 1,
            "Unexpected rates/history schema")
    india = india_row(latest.get("india"), today)
    require(isinstance(history.get("india"), list) and bool(history["india"]),
            "IBJA history is empty")
    for row in history["india"]:
        india_row(row, today, complete=False)
    dates = [row["date"] for row in history["india"]]
    require(dates == sorted(set(dates)), "Public history must contain unique ordered dates")
    matched = next((row for row in history["india"] if row["date"] == india["date"]), None)
    require(matched is not None, "Latest IBJA date is missing from history")
    require(matched["session"] == india["session"], "Latest/history session mismatch")
    for field, _, _ in METALS.values():
        require(matched.get(field) == india[field], "Latest/history price conflict: "+field)
    require(india["date"] == dates[-1], "Current IBJA quote trails public history")

    for symbol in ("XAU", "XAG"):
        item = latest.get("spot", {}).get(symbol)
        if item is None:
            continue
        require(price(item.get("usd_per_troy_ounce"), 0, 100000),
                "Invalid global spot price: "+symbol)
        try:
            stamp = datetime.fromisoformat(item["as_of"].replace("Z", "+00:00"))
        except (ValueError, AttributeError, KeyError) as exc:
            raise ValueError("Invalid global spot timestamp: "+symbol) from exc
        require(stamp.tzinfo is not None and stamp.date() <= today,
                "Future/undated global spot: "+symbol)

    fx = latest.get("fx")
    if fx:
        require(valid_day(fx.get("date"), today) and price(fx.get("inr_per_usd"), 20, 250),
                "Invalid USD/INR observation")

    pred = read(root, "forecast.json")
    require(pred.get("schema_version") == 1, "Forecast schema changed")
    require(pred.get("status") in ("experimental", "unavailable"),
            "Unknown forecast status")
    if pred.get("status") == "experimental":
        require(valid_day(pred.get("based_on_date"), today),
                "Forecast based on future/invalid date")
        require(pred["based_on_date"] == india["date"] and
                pred.get("based_on_session") == india["session"],
                "Forecast no longer matches latest verified IBJA observation")
        try:
            target = date.fromisoformat(pred["target_date"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("Invalid forecast target date") from exc
        require(target > date.fromisoformat(india["date"]) and
                (target - today).days <= 14,
                "Forecast target outside the upcoming publication window")
        for name, (field, _, _) in METALS.items():
            v = pred.get("metals", {}).get(name)
            require(isinstance(v, dict), "Forecast metal missing: "+name)
            require(v.get("baseline") == india[field], "Forecast baseline mismatch: "+name)
            require(all(price(v.get(k), 0, 10000000) for k in ("estimate", "low", "high")),
                    "Malformed forecast values: "+name)
            require(v["low"] < v["estimate"] < v["high"],
                    "Forecast range does not contain estimate: "+name)
            profile=v.get("range_profile")
            if profile is not None:
                require(isinstance(profile,dict) and profile.get("target_historical_coverage_pct")==50,
                        "Typical range has no declared historical coverage target: "+name)
                n=profile.get("holdout_samples")
                covered=profile.get("holdout_covered")
                require(type(n) is int and n>=12 and type(covered) is int and 0<=covered<=n,
                        "Invalid independent range evaluation counts: "+name)
                require(profile.get("holdout_coverage_pct")==round(covered/n*100,1),
                        "Range coverage disagrees with its test results: "+name)
                wide=v.get("wider_range",{})
                require(isinstance(wide,dict) and price(wide.get("low"),0,10000000) and
                        price(wide.get("high"),0,10000000) and
                        wide["low"]<=v["low"]<v["high"]<=wide["high"],
                        "Wider scenario is missing or narrower than typical range: "+name)

        if pred.get("forecast_mode") == "market_adjusted":
            model = pred.get("market_model", {})
            require(pred.get("model_version") == 4 and model.get("status") == "active" and
                    model.get("method") == "market_parity_v1", "Invalid market forecast mode")
            require(model.get("current_checked_at") == latest.get("checked_at"),
                    "Market model uses a different source snapshot")
            fx = model.get("fx", {})
            require(price(fx.get("reference"),20,250) and
                    fx.get("current") == latest.get("fx",{}).get("inr_per_usd") and
                    fx.get("current_date") == latest.get("fx",{}).get("date"),
                    "Market FX input disagrees with snapshot")
            for name, (field, _, _) in METALS.items():
                value=pred["metals"][name]
                inputs=model.get("inputs",{}).get(name,{})
                symbol="XAG" if name=="silver" else "XAU"
                quote=latest.get("spot",{}).get(symbol,{})
                require(inputs.get("symbol")==symbol and price(inputs.get("reference_usd_oz"),0,100000) and
                        inputs.get("current_usd_oz")==quote.get("usd_per_troy_ounce") and
                        inputs.get("current_as_of")==quote.get("as_of"),"Market metal input mismatch: "+name)
                metal_ratio=inputs["current_usd_oz"]/inputs["reference_usd_oz"]
                fx_ratio=fx["current"]/fx["reference"]
                require(value["estimate"]==math.floor(value["baseline"]*metal_ratio*fx_ratio+.5),
                        "Market projection formula mismatch: "+name)
                require(value.get("range_profile") is None and value.get("backtest",{}).get("status")=="forward_only",
                        "Market projection cannot claim a legacy historical backtest")
                drivers=value.get("drivers",{})
                expected={"metal_change_pct":(metal_ratio-1)*100,"fx_change_pct":(fx_ratio-1)*100,
                          "metal_contribution_inr":value["baseline"]*(metal_ratio-1),
                          "fx_contribution_inr":value["baseline"]*metal_ratio*(fx_ratio-1)}
                require(all(type(drivers.get(k)) in (int,float) and math.isfinite(drivers[k]) and
                            abs(drivers[k]-v)<.00001 for k,v in expected.items()),
                        "Market contribution mismatch: "+name)

    issued = read(root, "forecast_history.json")
    require(issued.get("schema_version") == 1 and isinstance(issued.get("forecasts"), list),
            "Malformed forecast issuance archive")
    keys = [item.get("issuance_key") for item in issued["forecasts"]]
    require(all(isinstance(k, str) and k for k in keys) and len(keys) == len(set(keys)),
            "Duplicate or missing forecast issuance keys")

    city = read(root, "cities.json")
    require(city.get("schema_version") == 1 and
            city.get("status") in ("ok", "partial", "source_unavailable"),
            "Malformed city snapshot")
    if city.get("status") == "ok":
        require(set(city.get("cities", {})) == EXPECTED_CITIES,
                "Successful city source lacks one of five cities")
    for metal in ("gold", "silver"):
        day = city.get("dates", {}).get(metal)
        require(day is None or valid_day(day, today), "Future-dated city quote: "+metal)
    for entry in city.get("cities", {}).values():
        require(isinstance(entry, dict), "Malformed city rate")
        for field, lo, hi in (("gold24_inr_g", 2500, 200000),
                              ("gold22_inr_g", 2200, 200000),
                              ("silver999_inr_kg", 10000, 3000000)):
            value = entry.get(field)
            require(value is None or price(value, lo, hi),
                    "Invalid city rate: "+field)

    funds = read(root, "funds.json")
    require(funds.get("schema_version") == 1 and
            funds.get("status") in ("ok", "unavailable"), "Malformed NAV snapshot")
    if funds["status"] == "ok":
        require(len(funds.get("funds", {})) >= 4, "Successful NAV source missing schemes")
    for item in funds.get("funds", {}).values():
        require(valid_day(item.get("nav_date"), today) and
                price(item.get("nav_inr_per_unit"), .01, 1000000),
                "Invalid or future-dated AMFI NAV")

    if site:
        for name in ("index.html", "app.js", "data-quality.js", "chart-ui.js",
                     "styles.css", "i18n.js", "features.js", "features.css",
                     "assets/nextrate-icon.svg", "assets/nextrate-icon.png",
                     "assets/apple-touch-icon.png", "assets/gold-bar.webp",
                     "assets/silver-bar.webp"):
            path = root / name
            require(path.exists() and path.stat().st_size > 0,
                    "Published site missing required asset: "+name)
        html = (root / "index.html").read_text(encoding="utf-8")
        require("data-quality.js" in html and "browser-notifications.js" not in html,
                "Site contains outdated or missing scripts")
        for name in referenced_frontend_assets(html):
            path = root / name
            require(path.is_file() and path.stat().st_size > 0,
                    "Published site missing required asset: "+name)

    summary = {
        "india": india["date"]+" "+india["session"],
        "history_days": len(dates),
        "forecast": pred["status"],
        "forecast_target": pred.get("target_date"),
        "spot": sorted(latest.get("spot", {})),
        "cities": city["status"],
        "nav": funds["status"],
    }
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--site", action="store_true")
    opts = parser.parse_args()
    try:
        result = verify(opts.root, site=opts.site)
    except ValueError as exc:
        print("PUBLICATION INVALID:", exc, file=sys.stderr)
        return 1
    print("PUBLICATION VALID:", json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
