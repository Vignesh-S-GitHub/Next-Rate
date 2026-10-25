#!/usr/bin/env python3
"""City indicative gold/silver rates from dated publisher tables.

City indications are NOT verified jeweller checkout quotations.
IBJA's one-India national benchmark is separate from publisher city rates.
If the publisher is unavailable, preserve the last dated snapshot and show
its age explicitly rather than inventing a city premium.
"""
from __future__ import annotations
import json
import logging
import re
from datetime import datetime, date, timezone
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

try:
    from scripts.update_rates import download
except ModuleNotFoundError:
    from update_rates import download

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "data/cities.json"
IST = ZoneInfo("Asia/Kolkata")
SOURCE_GOLD = "https://www.goodreturns.in/gold-rates/"
SOURCE_SILVER = "https://www.goodreturns.in/silver-rates/"
CITIES = {"Chennai":"Chennai","Mumbai":"Mumbai","Delhi":"Delhi",
          "Bangalore":"Bengaluru","Bengaluru":"Bengaluru",
          "Hyderabad":"Hyderabad"}
EXPECTED = ("Chennai","Mumbai","Delhi","Bengaluru","Hyderabad")
LOG = logging.getLogger("nextrate.cities")
MONTHS = {name.lower():i for i,name in enumerate(("January","February","March","April",
           "May","June","July","August","September","October","November","December"),1)}

class TableRows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows=[]
        self.row=None
        self.cell=None
        self.fragments=[]
    def handle_starttag(self,tag,attrs):
        if tag=="tr": self.row=[]
        elif tag in ("td","th") and self.row is not None: self.cell=[]
        if tag in ("br","p","div","h1","h2","h3","span","li","section"):
            self.fragments.append(" ")
        if tag=="input":
            values=dict(attrs)
            if values.get("value"): self.fragments.extend([" ",values["value"]," "])
    def handle_data(self,data):
        self.fragments.append(data)
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ("td","th") and self.cell is not None and self.row is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell=None
        if tag=="tr" and self.row is not None:
            if self.row:self.rows.append(self.row)
            self.row=None

def date_from_publication(text: str, today: date):
    # Prefer the page's prominently displayed date, not a previous-day
    # historical comparison row. Require an actual date token in the source.
    match = re.search(r"\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b",
                      text,flags=re.I)
    if not match: raise ValueError("Publisher did not include a dated rate header")
    day=date(int(match[3]),MONTHS[match[2].lower()],int(match[1]))
    if day>today or (today-day).days>7:
        raise ValueError("City rate date is in future or older than 7 days")
    return day

def numeric(s):
    items=re.findall(r"\d[\d,]*(?:\.\d+)?",str(s).replace("\xa0"," "))
    return float(items[0].replace(",","")) if items else None

def extract_city_values(html: str, metal: str, today: date):
    if metal not in ("gold","silver"): raise ValueError("Unknown city metal")
    parser=TableRows()
    parser.feed(html)
    visible=" ".join(" ".join(parser.fragments).split())
    day=date_from_publication(visible,today)
    extracted={}
    for row in parser.rows:
        if len(row)<4:continue
        city=CITIES.get(row[0].strip())
        if city is None:continue
        nums=[numeric(cell) for cell in row[1:4]]
        if None in nums:continue
        if metal=="gold":
            a,b=nums[:2]
            if not (2500<a<200000 and 2200<b<a and .875<b/a<.965):
                continue
            candidate={"gold24_inr_g":int(round(a)), "gold22_inr_g":int(round(b))}
        else:
            gram10,gram100,kg=nums
            if not (100<gram10<50000 and 1000<gram100<500000
                    and 10000<kg<3000000 and abs(gram10*100-kg)<=kg*.02
                    and abs(gram100*10-kg)<=kg*.02):
                continue
            candidate={"silver999_inr_kg":int(round(kg))}
        old=extracted.get(city)
        if old is not None and old!=candidate:
            raise ValueError(f"Conflicting city rows for {city}")
        extracted[city]=candidate
    if set(extracted)!=set(EXPECTED):
        raise ValueError("Incomplete publisher city table: "+repr(sorted(extracted)))
    return day, extracted

def update(now: datetime | None=None):
    now=(now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    today=now.astimezone(IST).date()
    stored={}
    if FILE.exists():
        try:stored=json.loads(FILE.read_text(encoding="utf-8"))
        except (ValueError,OSError):stored={}
    old_date=stored.get("as_of") if stored.get("schema_version")==1 else None
    data={}
    errors=[]
    days={}
    for metal,url in (("gold",SOURCE_GOLD),("silver",SOURCE_SILVER)):
        try:
            day,values=extract_city_values(download(url).decode("utf-8",errors="replace"),
                                          metal,today)
            previous_metal_day=stored.get("dates",{}).get(metal,old_date)
            if previous_metal_day and day.isoformat()<previous_metal_day:
                raise ValueError(f"{metal} source date {day} older than stored {previous_metal_day}")
            data[metal]=values
            days[metal]=day.isoformat()
        except (ValueError,OSError,RuntimeError) as exc:
            errors.append(f"{metal}: {exc}")
            LOG.warning("City source %s unavailable: %s",metal,exc)
    previous=stored.get("cities",{})
    if data:
        assembled={}
        for city in EXPECTED:
            prior=previous.get(city,{})
            assembled[city]={
                "gold24_inr_g": (data.get("gold") or {}).get(city,{}).get("gold24_inr_g",
                                    prior.get("gold24_inr_g")),
                "gold22_inr_g": (data.get("gold") or {}).get(city,{}).get("gold22_inr_g",
                                    prior.get("gold22_inr_g")),
                "silver999_inr_kg": (data.get("silver") or {}).get(city,{}).get("silver999_inr_kg",
                                    prior.get("silver999_inr_kg")),
            }
        # A source may have updated a day before the other: separate each
        # price observation date so partial updates never get a fake timestamp.
        for metal in ("gold","silver"):
            if metal not in days:
                days[metal]=stored.get("dates",{}).get(metal,old_date)
        status="ok" if len(data)==2 else "partial"
    else:
        assembled=previous
        days=stored.get("dates",{"gold":old_date,"silver":old_date})
        status="source_unavailable"
    # Source name/date are always visible in the frontend.
    out={
        "schema_version":1,
        "status":status,
        "checked_at":now.isoformat(timespec="seconds"),
        "as_of":max([d for d in days.values() if d],default=old_date),
        "dates":days,
        "source":"Goodreturns indicative city rate tables",
        "source_urls":{"gold":SOURCE_GOLD,"silver":SOURCE_SILVER},
        "basis":"Publisher's indicative city rates. Excludes GST, making charges and seller premiums; not a jeweller checkout quote.",
        "cities":assembled,
    }
    FILE.parent.mkdir(parents=True,exist_ok=True)
    FILE.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    LOG.info("City rates %s gold %s silver %s; %d cities",status,days.get("gold"),
             days.get("silver"),len(assembled))
    return out

if __name__=="__main__":
    logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")
    update()
