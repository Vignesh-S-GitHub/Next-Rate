import copy
import json
import unittest
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts.validate_publication import verify

DAY = date(2026, 10, 25)
INDIA = {"date": "2026-10-23", "session": "PM",
         "gold24_inr_10g": 141630, "gold22_inr_10g": 129733,
         "silver999_inr_kg": 194415}


def fixture():
    return {
        "latest.json": {"schema_version": 1, "india": INDIA, "spot": {}, "fx": None},
        "history.json": {"schema_version": 1, "india": [INDIA]},
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


if __name__ == "__main__":
    unittest.main()
