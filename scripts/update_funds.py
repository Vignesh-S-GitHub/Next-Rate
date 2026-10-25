#!/usr/bin/env python3
"""Update dated AMFI NAV references for selected Indian gold/silver funds.

NAV is *not* an ETF exchange execution price, nor equivalent to a gram of
physical gold. This collector never labels it an exchange-traded last price.
"""
from __future__ import annotations

import json
import logging
import math
import re
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"data"/"funds.json"
SOURCE="https://portal.amfiindia.com/spages/NAVAll.txt"
SOURCE_PAGE="https://www.amfiindia.com/net-asset-value/nav-download"
IST=ZoneInfo("Asia/Kolkata")
LOG=logging.getLogger("nextrate.funds")

# Stable AMFI scheme codes, never auto-select similarly named IDCW/other plans.
SCHEMES={
    "goldbees": (140088,"Nippon India ETF Gold BeES","Gold ETF"),
    "hdfcgold": (113049,"HDFC Gold ETF","Gold ETF"),
    "sbigold": (111954,"SBI Gold ETF","Gold ETF"),
    "goldfund": (120685,"ICICI Prudential Gold ETF FOF","Gold Fund"),
    "silveretf": (149758,"Nippon India Silver ETF","Silver ETF"),
    "hdfcsilver": (150556,"HDFC Silver ETF","Silver ETF"),
}

def parse_nav_report(report: str, now: datetime) -> dict:
    """Parse AMFI's 8-column semicolon-separated NAVAll.txt report."""
    now_ist=now.astimezone(IST).date()
    by_code={v[0]:k for k,v in SCHEMES.items()}
    data={}
    for line in report.splitlines():
        row=line.strip().lstrip("\ufeff").split(";")
        if len(row)!=8 or not row[0].isdigit():
            continue
        code=int(row[0])
        if code not in by_code:
            continue
        key=by_code[code]
        expected=SCHEMES[key]
        if row[3].strip().casefold()!=expected[1].casefold():
            raise ValueError("Scheme name mismatch for "+str(code))
        try:
            nav=float(row[6])
            observed=datetime.strptime(row[7].strip(),"%d-%b-%Y").date()
        except (ValueError,TypeError) as exc:
            raise ValueError("Invalid date or NAV for "+str(code)) from exc
        if not math.isfinite(nav) or not (0.01<nav<1_000_000):
            raise ValueError("Invalid NAV for "+str(code))
        if observed>now_ist or (now_ist-observed).days>10:
            raise ValueError("Stale or future NAV for "+str(code)+": "+observed.isoformat())
        data[key]={
            "scheme_code":code,
            "name":expected[1],
            "kind":expected[2],
            "nav_inr_per_unit":round(nav,4),
            "nav_date":observed.isoformat(),
            "source":"AMFI published NAV",
            "source_url":SOURCE_PAGE,
            "quote_type":"NAV, not exchange trading price",
        }
    if len(data)<4:
        raise ValueError("Only "+str(len(data))+" matching up-to-date NAVs")
    return data


def retrieve() -> str:
    err=None
    for attempt in range(3):
        try:
            req=Request(SOURCE,headers={"User-Agent":"NextRate/1.0 (market reference NAV; GitHub Next-Rate)","Accept":"text/plain,*/*;q=0.5"})
            with urlopen(req,timeout=30) as response:
                body=response.read(5_000_001)
                if len(body)>5_000_000:
                    raise ValueError("NAV report unexpectedly large")
                return body.decode("utf-8-sig",errors="replace")
        except (OSError,ValueError) as exc:
            err=exc
            if attempt<2:time.sleep(attempt+1)
    raise RuntimeError("AMFI NAV download unavailable: "+str(err))


def update(now:datetime|None=None):
    now=(now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    old={}
    if OUTPUT.exists():
        try:old=json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (ValueError,OSError):old={}
    try:
        funds=parse_nav_report(retrieve(),now)
        result={
            "schema_version":1,
            "checked_at":now.isoformat(timespec="seconds"),
            "source":SOURCE_PAGE,
            "status":"ok",
            "funds":funds,
        }
        LOG.info("AMFI NAVs: %s",", ".join(k+"="+str(v["nav_inr_per_unit"]) for k,v in funds.items()))
    except Exception as exc:
        LOG.warning("AMFI update failed; dated existing NAVs retained: %s",exc)
        result={
            "schema_version":1,
            "checked_at":now.isoformat(timespec="seconds"),
            "source":SOURCE_PAGE,
            "status":"unavailable",
            "funds":old.get("funds",{}) if old.get("schema_version")==1 else {},
        }
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    content=json.dumps(result,indent=2,ensure_ascii=False)+"\n"
    if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8")!=content:
        OUTPUT.write_text(content,encoding="utf-8")
    return result


if __name__=="__main__":
    logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")
    try:update()
    except Exception as exc:
        LOG.error("Fund update failed: %s",exc)
        sys.exit(1)
