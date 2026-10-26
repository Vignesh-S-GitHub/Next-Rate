#!/usr/bin/env python3
"""Post-deployment HTTP smoke test against the real published NextRate site.

Checks HTTP delivery of the homepage, JS/CSS, all six data feeds and icons,
then runs the same cross-file data validation as the pre-publish gate.
Retries while GitHub Pages / CDN propagates the newly deployed artifact.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

try:
    from scripts.validate_publication import verify
except ModuleNotFoundError:
    from validate_publication import verify

DEFAULT_URL = "https://vignesh-s-github.github.io/Next-Rate/"
ASSETS = (
    "index.html", "app.js", "data-quality.js", "chart-ui.js", "features.js",
    "styles.css", "features.css", "i18n.js",
    "assets/nextrate-icon.svg", "assets/nextrate-icon.png",
    "assets/apple-touch-icon.png", "assets/gold-bar.webp", "assets/silver-bar.webp",
    "data/latest.json", "data/history.json", "data/forecast.json",
    "data/forecast_history.json", "data/cities.json", "data/funds.json",
)


def fetch(url: str):
    request = Request(url, headers={"User-Agent": "NextRate-production-smoke/1.0",
                                    "Cache-Control": "no-cache"})
    with urlopen(request, timeout=20) as result:
        if result.status != 200:
            raise RuntimeError("Unexpected HTTP status " + str(result.status))
        data = result.read(3_000_001)
        if not data or len(data) > 3_000_000:
            raise ValueError("Missing or overlarge site asset: "+url)
        return data


def check(url: str):
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        for asset in ASSETS:
            # Query parameters avoid a stale CDN cache but never change the
            # relative pathname of the file being checked.
            data = fetch(urljoin(url, asset)+"?smoke="+str(int(time.time())))
            path = root/asset
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        index = (root/"index.html").read_text(encoding="utf-8")
        if "data-quality.js?v=20261025-production1" not in index:
            raise ValueError("Live HTML still points to an older NextRate build")
        if "nextrate-icon.svg?v=20261026" not in index:
            raise ValueError("Live HTML still points to the old logo")
        for tab in ('data-route="home"', 'data-route="markets"',
                    'data-route="compare"', 'data-route="insights"',
                    'data-route="tools"'):
            if tab not in index:
                raise ValueError("Missing navigation route: "+tab)
        outcome = verify(root, site=True)
        outcome["served_assets"] = len(ASSETS)
        outcome["html_sha256"] = hashlib.sha256((root/"index.html").read_bytes()).hexdigest()[:16]
        return outcome


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--attempts", type=int, default=5)
    args = parser.parse_args()
    if not (args.url.startswith("https://") and args.url.endswith("/")):
        parser.error("Expected an HTTPS site base URL ending in /")
    for attempt in range(1, args.attempts+1):
        try:
            report=check(args.url)
            print("LIVE SITE VERIFIED:", json.dumps(report))
            return 0
        except (OSError, ValueError, RuntimeError, UnicodeDecodeError,
                json.JSONDecodeError) as exc:
            print(f"Site smoke attempt {attempt}/{args.attempts}: {exc}",
                  file=sys.stderr)
            if attempt < args.attempts:
                time.sleep(7)
    return 1


if __name__ == "__main__":
    sys.exit(main())
