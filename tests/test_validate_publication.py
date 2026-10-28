import copy
import json
import unittest
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts.validate_publication import verify, referenced_frontend_assets

DAY = date(2026, 10, 25)
INDIA = {"date": "2026-10-23", "session": "PM",
         "gold24_inr_10g": 141630, "gold22_inr_10g": 129733,
         "silver999_inr_kg": 194415}


def fixture():
    return {
        "latest.json": {"schema_version": 1, "india": dict(INDIA), "spot": {}, "fx": None},
        "history.json": {"schema_version": 1, "india": [dict(INDIA)]},
        "forecast.json": {"schema_version": 1, "status": "experimental",
                          "based_on_date": INDIA["date"], "based_on_session": "PM",
                          "target_date": "2026-10-26", "metals": {
                              name: {"baseline": INDIA[field], "estimate": INDIA[field],
                                     "low": INDIA[field]*.95, "high": INDIA[field]*1.05}
                              for name, field in
                              [("gold24", "gold24_inr_10g"), ("gold22", "gold22_inr_10g"),
                               ("silver", "silver999_inr_kg")]}},
        "forecast_history.json": {"schema_version": 1, "forecasts": []},
        "cities.json": {"schema_version": 1, "status": "source_unavailable",
                        "dates": {"gold": None, "silver": None}, "cities": {}},
        "funds.json": {"schema_version": 1, "status": "unavailable", "funds": {}},
    }


class PublicationTests(unittest.TestCase):
    def test_declared_scripts_and_styles_are_discovered(self):
        html = '<script src="./weights.js?v=1"></script><link rel="stylesheet" href="./styles.css?v=2">'
        self.assertEqual(referenced_frontend_assets(html), ["weights.js", "styles.css"])

    def test_site_validation_rejects_a_missing_declared_script(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "data").mkdir()
            for name, body in fixture().items():
                (root / "data" / name).write_text(json.dumps(body))
            for name in ("app.js", "data-quality.js", "chart-ui.js", "styles.css", "i18n.js", "features.js", "features.css", "assets/nextrate-icon.svg", "assets/nextrate-icon.png", "assets/apple-touch-icon.png", "assets/gold-bar.webp", "assets/silver-bar.webp"):
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("x")
            (root / "index.html").write_text('<script src="data-quality.js"></script><script src="weights.js?v=1"></script>')
            with self.assertRaisesRegex(ValueError, 'missing required asset: weights.js'):
                verify(root, now=DAY, site=True)

    def validate(self, change=None):
        with TemporaryDirectory() as folder:
            data = Path(folder)/"data"
            data.mkdir()
            docs = copy.deepcopy(fixture())
            if change:
                change(docs)
            for name, body in docs.items():
                (data/name).write_text(json.dumps(body), encoding="utf-8")
            return verify(Path(folder), now=DAY)

    def test_paired_conversion_is_checked_independently_of_daily_fx(self):
        def change(docs):
            latest=docs["latest.json"]
            latest["checked_at"]="2026-10-25T12:00:00Z"
            latest["spot"]={symbol:{"usd_per_troy_ounce":amount,"as_of":latest["checked_at"]}
                            for symbol,amount in [("XAU",4000),("XAG",50)]}
            latest["forecast_fx"]={"inr_per_usd":96,"inr_per_troy_ounce":384000,"usd_per_troy_ounce":4000,
                "quote_as_of":latest["checked_at"],"date":"2026-10-25","source_url":"https://gold-api.com/docs",
                "rate_timing":"conversion_quote_not_fx_tick"}
            pred=docs["forecast.json"]
            pred.update(model_version=4,forecast_mode="market_adjusted")
            pred["market_model"]={"status":"active","method":"market_parity_v1","current_checked_at":latest["checked_at"],
                "fx":{"reference":95,"current":96,"current_date":"2026-10-25","kind":"indicative_conversion",
                      "current_quote_as_of":latest["checked_at"],"fx_tick_timestamp_verified":False,"source_url":"https://gold-api.com/docs"},"inputs":{}}
            for name,value in pred["metals"].items():
                symbol="XAG" if name=="silver" else "XAU"
                amount=latest["spot"][symbol]["usd_per_troy_ounce"]
                pred["market_model"]["inputs"][name]={"symbol":symbol,"reference_usd_oz":amount,"current_usd_oz":amount,"current_as_of":latest["checked_at"]}
                value.update(estimate=int(value["baseline"]*96/95+.5),range_profile=None,backtest={"status":"forward_only"},
                    drivers={"metal_change_pct":0,"fx_change_pct":(96/95-1)*100,"metal_contribution_inr":0,"fx_contribution_inr":value["baseline"]*(96/95-1)})
        self.validate(change)
        def bad(docs):
            change(docs)
            docs["latest.json"]["forecast_fx"]["inr_per_troy_ounce"]*=10
        with self.assertRaisesRegex(ValueError,"Conversion units"):
            self.validate(bad)

    def test_valid_publication_with_optional_provider_outages(self):
        self.assertEqual(self.validate()["forecast"], "experimental")

    def test_future_dated_ibja_rejected(self):
        with self.assertRaisesRegex(ValueError, "future-dated"):
            self.validate(lambda d: d["latest.json"]["india"].update(date="2026-10-26"))

    def test_latest_history_conflict_rejected(self):
        with self.assertRaisesRegex(ValueError, "price conflict"):
            self.validate(lambda d: d["history.json"]["india"][0].update(
                gold24_inr_10g=143000))

    def test_forecast_baseline_conflict_rejected(self):
        with self.assertRaisesRegex(ValueError, "baseline mismatch"):
            self.validate(lambda d: d["forecast.json"]["metals"]["gold24"].update(
                baseline=150000))

    def test_future_city_quote_rejected(self):
        with self.assertRaisesRegex(ValueError, "Future-dated city"):
            self.validate(lambda d: d["cities.json"]["dates"].update(
                gold="2026-10-26"))

    def test_duplicate_issuance_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.validate(lambda d: d["forecast_history.json"].update(forecasts=[
                {"issuance_key": "v1:x"}, {"issuance_key": "v1:x"}]))

    def test_corrupt_spot_rejected_without_inventing_number(self):
        with self.assertRaisesRegex(ValueError, "Invalid global spot price"):
            self.validate(lambda d: d["latest.json"].update(
                spot={"XAU": {"usd_per_troy_ounce": -1,
                              "as_of": "2026-10-24T10:00:00+00:00"}}))

    def test_range_coverage_cannot_claim_more_hits_than_were_measured(self):
        def corrupt(d):
            d["forecast.json"]["metals"]["gold24"]["range_profile"]={
                "target_historical_coverage_pct":50,"holdout_samples":20,
                "holdout_covered":10,"holdout_coverage_pct":99}
        with self.assertRaisesRegex(ValueError,"Range coverage disagrees"):
            self.validate(corrupt)


if __name__ == "__main__":
    unittest.main()
