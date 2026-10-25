#!/usr/bin/env python3
"""Long-term, lossless annual storage for NextRate's published market observations.

Canonical records live in data/archive/<kind>/<year>.json and are never aged
out. Lightweight data/history.json and forecast_history.json are cache views
only; rebuilding them cannot delete their original annual observations.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import tempfile
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
YEARLY = DATA / "archive"
RECENT_IBJA = 120
RECENT_FX = 120
RECENT_SPOT = 120
RECENT_FORECAST = 90
LOG = logging.getLogger("nextrate.archive")
KINDS = ("ibja", "fx", "spot-xau", "spot-xag", "forecasts")
IBJA_FIELDS = ("gold24_inr_10g", "gold22_inr_10g", "silver999_inr_kg")


def get_json(path: Path, default=None):
    if not path.exists():
        return default if default is not None else {}
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def as_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d\d-\d\d", value):
        raise ValueError(f"Invalid published date: {value!r}")
    return date.fromisoformat(value)


def row_identity(kind: str, row: dict) -> str:
    if not isinstance(row, dict):
        raise ValueError(f"{kind} row is not an object")
    if kind in ("ibja", "fx"):
        key = row.get("date")
        as_date(key)
    elif kind.startswith("spot-"):
        key = row.get("as_of")
        if not isinstance(key, str) or len(key) < 19:
            raise ValueError("Spot source quote lacks as_of timestamp")
        as_date(key[:10])
    elif kind == "forecasts":
        key = row.get("issuance_key")
        as_date(row.get("target_date"))
        if not isinstance(key, str) or not key.strip():
            # Pre-v2 issued forecasts also have issuance_key. Do not synthesize
            # IDs that could overwrite distinct historical predictions.
            raise ValueError("Forecast issuance lacks immutable key")
    else:
        raise ValueError(f"Unknown archive kind: {kind}")
    if not isinstance(key, str):
        raise ValueError("Missing record key")
    return key


def row_year(kind: str, row: dict) -> str:
    if kind == "forecasts":
        return row["target_date"][:4]
    return row_identity(kind, row)[:4]


def ibja_quality(row: dict) -> tuple[int, int, int]:
    source = str(row.get("source", "")).lower()
    # A directly published IBJA rate is more reliable than a rounded
    # third-party historical reprint. Never downgrade directly captured PM.
    direct = 1 if "association (ibja)" in source or row.get("source_url") == "https://www.ibjarates.com/" else 0
    session = 1 if row.get("session") == "PM" else 0
    coverage = sum(row.get(field) is not None for field in IBJA_FIELDS)
    return session, direct, coverage


def check_row(kind: str, row: dict):
    row_identity(kind, row)
    if kind == "ibja":
        if row.get("session") not in ("AM", "PM"):
            raise ValueError("IBJA row is missing AM/PM session")
        values = []
        for key, low, high in (
            ("gold24_inr_10g", 10000, 1000000),
            ("gold22_inr_10g", 10000, 1000000),
            ("silver999_inr_kg", 5000, 3000000),
        ):
            value = row.get(key)
            if value is not None:
                if type(value) is not int or not low < value < high:
                    raise ValueError("Invalid " + key)
                values.append(key)
        if not values:
            raise ValueError("IBJA row has no verified numeric metals")
        a = row.get("gold24_inr_10g")
        b = row.get("gold22_inr_10g")
        if a and b and not .87 < b/a < .97:
            raise ValueError("Inconsistent 22K to 24K ratio")
    elif kind == "fx":
        value = row.get("inr_per_usd")
        if not isinstance(value, (int, float)) or not 20 < value < 250:
            raise ValueError("Invalid USD/INR")
    elif kind.startswith("spot-"):
        value = row.get("usd_per_troy_ounce")
        if not isinstance(value, (int, float)) or not 0 < value < 1_000_000:
            raise ValueError("Invalid international spot quote")
    elif kind == "forecasts":
        if not isinstance(row.get("metals"), dict) or not row["metals"]:
            raise ValueError("Forecast without original metal predictions")


def resolve_duplicate(kind: str, older: dict, newer: dict):
    """Preserve original observations; only controlled enrichment permitted."""
    if older == newer:
        return older
    if kind == "ibja":
        prior_quality, next_quality = ibja_quality(older), ibja_quality(newer)
        if next_quality[:2] != prior_quality[:2]:
            preferred, secondary = (newer, older) if next_quality[:2] > prior_quality[:2] else (older, newer)
        else:
            preferred, secondary = older, newer
        combined = dict(preferred)
        for name in IBJA_FIELDS:
            old_val, new_val = older.get(name), newer.get(name)
            if old_val is not None and new_val is not None:
                tolerance = 10 if name == "silver999_inr_kg" else 2
                if abs(old_val-new_val) > tolerance:
                    # More authoritative new PM source can correct rounded
                    # archive values; never overwrite direct PM with AM.
                    if next_quality[:2] <= prior_quality[:2]:
                        LOG.warning("Retained prior %s %s (conflicting new quote)", older["date"], name)
                    else:
                        LOG.info("Upgraded %s %s with higher-quality source", older["date"], name)
            # Never turn an AM-only gold value into an invented PM quote.
            if (name not in combined and name in secondary
                    and preferred.get("session") == secondary.get("session")):
                combined[name] = secondary[name]
        # If same-quality snapshots disagree, retain the original immutable
        # closing value and record source differences in workflow logs.
        check_row(kind, combined)
        return combined
    if kind == "forecasts":
        immutable = ("issuance_key", "issued_at", "target_date",
                     "based_on_date", "based_on_session", "metals")
        if any(older.get(k) != newer.get(k) for k in immutable):
            raise ValueError("Attempt to rewrite an already-issued forecast")
        if older.get("evaluation") and newer.get("evaluation") and older["evaluation"] != newer["evaluation"]:
            raise ValueError("Conflicting graded forecast; human review needed")
        if not older.get("evaluation") and newer.get("evaluation"):
            return {**older, "evaluation": newer["evaluation"]}
        return older
    if kind == "fx":
        # Different daily publishers can define different FX fixings; keep
        # first observed reference, never merge them into a false ticker.
        return older
    # Same source quote timestamp is an immutable observation, not a newer tick.
    old_val = older.get("usd_per_troy_ounce")
    new_val = newer.get("usd_per_troy_ounce")
    if old_val != new_val:
        LOG.warning("Preserved existing spot quote at %s with conflicting value", row_identity(kind, older))
    return older


def merge_rows(kind: str, existing: list, incoming: list) -> list:
    merged = {}
    for row in existing + incoming:
        check_row(kind, row)
        key = row_identity(kind, row)
        merged[key] = resolve_duplicate(kind, merged[key], row) if key in merged else dict(row)
    # Forecast keys start with v1:, v2:, etc.; date order must be explicit.
    if kind == "forecasts":
        return sorted(merged.values(), key=lambda r: (r["target_date"], r.get("issued_at", ""), r["issuance_key"]))
    return sorted(merged.values(), key=lambda r: row_identity(kind, r))


def load_years(archive_dir: Path = YEARLY) -> dict:
    collected = {name: [] for name in KINDS}
    for kind in KINDS:
        folder = archive_dir / kind
        if not folder.exists():
            continue
        for path in sorted(folder.glob("*.json")):
            if not re.fullmatch(r"20\d{2}\.json", path.name):
                raise ValueError("Unexpected annual filename: " + str(path))
            payload = get_json(path)
            if (payload.get("schema_version") != 1 or payload.get("kind") != kind
                    or payload.get("year") != int(path.stem) or not isinstance(payload.get("records"), list)):
                raise ValueError("Malformed annual archive: " + str(path))
            rows = payload["records"]
            keys = [row_identity(kind, r) for r in rows]
            if len(set(keys)) != len(keys) or any(row_year(kind, r) != path.stem for r in rows):
                raise ValueError("Duplicate or misfiled annual record: " + str(path))
            if rows != merge_rows(kind, [], rows):
                raise ValueError("Annual records are not sorted: " + str(path))
            collected[kind] += rows
    return collected


def complete_history(history: dict, root: Path = YEARLY) -> dict:
    """Reconstruct full historical series for chronological model validation."""
    archives = load_years(root)
    result = dict(history)
    result["india"] = merge_rows("ibja", archives["ibja"], history.get("india", []))
    result["fx"] = merge_rows("fx", archives["fx"], history.get("fx", []))
    current_spot = history.get("spot", {})
    result["spot"] = {
        k: merge_rows("spot-"+k.lower(), archives["spot-"+k.lower()], current_spot.get(k, []))
        for k in ("XAU", "XAG")
    }
    return result


def complete_forecasts(forecasts: dict, root: Path = YEARLY) -> dict:
    archive = load_years(root)
    result = dict(forecasts)
    result["forecasts"] = merge_rows("forecasts", archive["forecasts"], forecasts.get("forecasts", []))
    return result


def atomic_write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return False
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".pending-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            out.write(content)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    return True


def json_payload(obj, compact=True):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":") if compact else None,
                      indent=None if compact else 2) + "\n"


def write_archive(history: dict, forecasts: dict, root: Path = YEARLY,
                  existing: dict | None = None):
    archives = existing if existing is not None else load_years(root)
    source = {
        "ibja": history.get("india", []),
        "fx": history.get("fx", []),
        "spot-xau": history.get("spot", {}).get("XAU", []),
        "spot-xag": history.get("spot", {}).get("XAG", []),
        "forecasts": forecasts.get("forecasts", []),
    }
    shards = []
    changes = 0
    for kind in KINDS:
        full = merge_rows(kind, archives[kind], source[kind])
        grouped = defaultdict(list)
        for row in full:
            grouped[row_year(kind, row)].append(row)
        for year, records in sorted(grouped.items()):
            payload = {"schema_version": 1, "kind": kind,
                       "year": int(year), "records": records}
            path = root / kind / f"{year}.json"
            body = json_payload(payload)
            if atomic_write(path, body):
                changes += 1
            shards.append({
                "file": f"{kind}/{year}.json",
                "records": len(records),
                "first": row_identity(kind, records[0]) if kind != "forecasts" else records[0]["target_date"],
                "last": row_identity(kind, records[-1]) if kind != "forecasts" else records[-1]["target_date"],
                "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
            })
    manifest = {
        "schema_version": 1,
        "policy": "permanent annual retention; never prune archive records automatically",
        "recent_india": RECENT_IBJA,
        "recent_spot": RECENT_SPOT,
        "recent_fx": RECENT_FX,
        "recent_forecasts": RECENT_FORECAST,
        "series": shards,
        "totals": {
            kind: sum(r["records"] for r in shards if r["file"].startswith(kind+"/"))
            for kind in KINDS
        },
    }
    if atomic_write(root / "manifest.json", json_payload(manifest, compact=False)):
        changes += 1
    return manifest, changes


def validate_manifest(root: Path = YEARLY):
    manifest = get_json(root / "manifest.json")
    if manifest.get("schema_version") != 1:
        raise ValueError("Missing long-term archive manifest")
    tracked = set()
    for item in manifest.get("series", []):
        relative = item["file"]
        if relative in tracked or "/" not in relative or ".." in relative:
            raise ValueError("Duplicate/invalid shard in manifest")
        tracked.add(relative)
        path = root / relative
        body = path.read_bytes()
        if hashlib.sha256(body).hexdigest() != item["sha256"]:
            raise ValueError("Annual archive hash mismatch: " + relative)
        obj = json.loads(body)
        if len(obj.get("records", [])) != item["records"]:
            raise ValueError("Annual archive count mismatch: " + relative)
    disk = {f"{p.parent.name}/{p.name}" for kind in KINDS
            for p in (root/kind).glob("*.json")} if root.exists() else set()
    if tracked != disk:
        raise ValueError(f"Manifest does not index every shard: missing={disk-tracked}, extra={tracked-disk}")
    load_years(root)
    return manifest


def update_storage(data: Path = DATA, annual: Path | None = None):
    annual = annual or data/"archive"
    history_path = data/"history.json"
    forecast_path = data/"forecast_history.json"
    latest_path = data/"latest.json"
    if not history_path.exists() or not forecast_path.exists():
        raise FileNotFoundError("History and issued-forecast snapshots required")
    history = get_json(history_path)
    issued = get_json(forecast_path)
    if history.get("schema_version") != 1 or issued.get("schema_version") != 1:
        raise ValueError("Unsupported input snapshot schema")
    if (annual / "manifest.json").exists():
        validate_manifest(annual)
    existing = load_years(annual)
    # Read original snapshots, existing immutable years and latest observed
    # India row before changing even one compact public file.
    latest = get_json(latest_path)
    if latest.get("india"):
        direct = latest["india"]
        history = {**history, "india": history.get("india", [])+[direct]}
    full = {
        "india": merge_rows("ibja", existing["ibja"], history.get("india", [])),
        "fx": merge_rows("fx", existing["fx"], history.get("fx", [])),
        "spot": {sym: merge_rows("spot-"+sym.lower(),
                               existing["spot-"+sym.lower()],
                               history.get("spot", {}).get(sym, []))
                 for sym in ("XAU", "XAG")},
    }
    full_issued = {
        "forecasts": merge_rows("forecasts", existing["forecasts"], issued.get("forecasts", []))
    }
    manifest, changed = write_archive(full, full_issued, annual, existing)
    verified = validate_manifest(annual)
    if verified != manifest:
        raise ValueError("Annual archive validation failed before compaction")
    # The public files are *caches*, not canonical storage.
    recent = {
        **history, "schema_version": 1,
        "india": full["india"][-RECENT_IBJA:],
        "spot": {sym: full["spot"][sym][-RECENT_SPOT:] for sym in ("XAU","XAG")},
        "fx": full["fx"][-RECENT_FX:],
        "storage": {
            "type": "recent-cache",
            "archive_manifest": "archive/manifest.json",
            "note": "Older dated observations preserved in yearly GitHub archive.",
        },
    }
    compact_forecast = {
        **issued, "schema_version": 1,
        "forecasts": full_issued["forecasts"][-RECENT_FORECAST:],
        "storage": {"type": "recent-cache", "archive_manifest": "archive/manifest.json"},
    }
    atomic_write(history_path, json_payload(recent, compact=False))
    atomic_write(forecast_path, json_payload(compact_forecast, compact=False))
    LOG.info("Verified long-term archive: %s annual shards, %d changed; %s total rows",
             len(manifest["series"]), changed, manifest["totals"])
    return manifest


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    update_storage()
