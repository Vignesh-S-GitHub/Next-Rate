"""Long-term storage safety tests: permanent archives, bounded web caches."""
import copy
import json
import unittest
from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts import archive_data as store


def ibja(day, delta=0, source="IBJA archive via TrackLivePrice"):
    return {
        "date": day, "session": "PM", "source": source,
        "source_url": ("https://www.ibjarates.com/"
                       if source.startswith("India Bullion") else "https://trackliveprice.com/methodology/"),
        "gold24_inr_10g": 140000+delta,
        "gold22_inr_10g": 128240+round(delta*.916),
        "silver999_inr_kg": 190000+delta,
    }


def forecast(index, year=2026):
    target = date(year, 1, 1)+timedelta(days=index)
    issued = target-timedelta(days=1)
    return {
        "issuance_key": f"v2:{target.isoformat()}:x:PM",
        "issued_at": issued.isoformat()+"T19:00:00+00:00",
        "target_date": target.isoformat(),
        "based_on_date": issued.isoformat(),
        "based_on_session": "PM",
        "metals": {"gold24": {"estimate": 140000+index, "baseline": 140000,
                             "low": 137000, "high": 143000}},
    }


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2)+"\n", encoding="utf-8")


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.data = Path(self.tmp.name)/"data"
        self.data.mkdir()
        self.annual = self.data/"archive"

    def seed(self, india=None, forecasts=None, spot=None, fx=None):
        write_json(self.data/"history.json", {
            "schema_version": 1, "india": india or [],
            "spot": spot or {"XAU": [], "XAG": []}, "fx": fx or [],
        })
        write_json(self.data/"forecast_history.json", {
            "schema_version": 1, "forecasts": forecasts or [],
        })
        if india:
            write_json(self.data/"latest.json", {"schema_version":1,
                                                 "india": india[-1]})

    def test_first_migration_keeps_all_380_days_and_compacts_120(self):
        start=date(2025,11,15)
        india=[ibja((start+timedelta(days=i)).isoformat(),i)
               for i in range(380)]
        archived_forecasts=[forecast(i,2025) for i in range(150)]
        self.seed(india, archived_forecasts)
        manifest=store.update_storage(self.data)
        frontend=json.loads((self.data/"history.json").read_text())
        preds=json.loads((self.data/"forecast_history.json").read_text())
        self.assertEqual(len(frontend["india"]),120)
        self.assertEqual(len(preds["forecasts"]),90)
        self.assertEqual(manifest["totals"]["ibja"],380)
        self.assertEqual(manifest["totals"]["forecasts"],150)
        self.assertTrue((self.annual/"ibja"/"2025.json").exists())
        self.assertTrue((self.annual/"ibja"/"2026.json").exists())
        all_history=store.complete_history(frontend,self.annual)
        self.assertEqual(len(all_history["india"]),380)
        all_predictions=store.complete_forecasts(preds,self.annual)
        self.assertEqual(len(all_predictions["forecasts"]),150)
        self.assertEqual(all_predictions["forecasts"][0]["metals"],
                         archived_forecasts[0]["metals"])

    def test_repeat_run_is_idempotent_with_no_dropped_old_dates(self):
        self.seed([ibja("2026-10-20"), ibja("2026-10-21"), ibja("2026-10-23")])
        first=store.update_storage(self.data)
        raw=(self.annual/"ibja"/"2026.json").read_bytes()
        second=store.update_storage(self.data)
        self.assertEqual(raw,(self.annual/"ibja"/"2026.json").read_bytes())
        self.assertEqual(first,second)
        self.assertEqual(second["totals"]["ibja"],3)

    def test_restore_more_years_even_when_recent_snapshot_is_empty(self):
        all_rows=[ibja("2024-12-30"),ibja("2025-01-01"),
                  ibja("2026-10-23")]
        self.seed(all_rows)
        store.update_storage(self.data)
        self.seed([])
        new=store.update_storage(self.data)
        self.assertEqual(new["totals"]["ibja"],3)
        h=json.loads((self.data/"history.json").read_text())
        self.assertEqual(len(h["india"]),3)

    def test_original_official_pm_rate_outweighs_rounded_reprint(self):
        official=ibja("2026-10-23",630,"India Bullion and Jewellers Association (IBJA)")
        older=ibja("2026-10-23",620)
        self.seed([official])
        store.update_storage(self.data)
        self.seed([older])
        store.update_storage(self.data)
        full=store.complete_history({"india":[],"spot":{},"fx":[]},self.annual)
        self.assertEqual(full["india"][-1]["gold24_inr_10g"],
                         official["gold24_inr_10g"])
        self.assertEqual(full["india"][-1]["session"],"PM")

    def test_am_never_replaces_a_published_pm(self):
        pm=ibja("2026-10-23")
        self.seed([pm])
        store.update_storage(self.data)
        am={**pm,"session":"AM","gold24_inr_10g":140300}
        self.seed([am])
        store.update_storage(self.data)
        rows=store.complete_history({"india":[],"spot":{},"fx":[]},
                                    self.annual)["india"]
        self.assertEqual(rows[0]["session"],"PM")
        self.assertEqual(rows[0]["gold24_inr_10g"],140000)

    def test_duplicate_spot_timestamps_are_kept_only_once(self):
        spot={"XAU":[{
            "date":"2026-10-25","as_of":"2026-10-25T06:54:38+00:00",
            "usd_per_troy_ounce":4000.1
        }], "XAG":[]}
        self.seed([ibja("2026-10-23")],spot=spot)
        self.assertEqual(store.update_storage(self.data)["totals"]["spot-xau"],1)
        self.assertEqual(store.update_storage(self.data)["totals"]["spot-xau"],1)

    def test_original_forecast_issued_values_cannot_be_rewritten(self):
        item=forecast(30)
        self.seed([ibja("2026-10-23")],[item])
        store.update_storage(self.data)
        bad=copy.deepcopy(item)
        bad["metals"]["gold24"]["estimate"]+=777
        self.seed([ibja("2026-10-23")],[bad])
        with self.assertRaisesRegex(ValueError,"rewrite"):
            store.update_storage(self.data)
        canon=store.complete_forecasts({"forecasts":[]},self.annual)
        self.assertEqual(canon["forecasts"][0]["metals"],item["metals"])

    def test_actual_scoring_enriches_original_forecast_without_replacing_it(self):
        p=forecast(26)
        self.seed([ibja("2026-10-23")],[p])
        store.update_storage(self.data)
        graded=copy.deepcopy(p)
        graded["evaluation"]={"actual_date":p["target_date"],"metals":{"gold24":{"actual":140100}}}
        self.seed([ibja("2026-10-23")],[graded])
        store.update_storage(self.data)
        all_=store.complete_forecasts({"forecasts":[]},self.annual)["forecasts"]
        self.assertEqual(all_[0]["evaluation"],graded["evaluation"])
        self.assertEqual(all_[0]["issued_at"],p["issued_at"])

    def test_corrupted_shard_is_detected_before_recent_file_compaction(self):
        self.seed([ibja("2026-10-23")])
        store.update_storage(self.data)
        shard=self.annual/"ibja"/"2026.json"
        shard.write_bytes(shard.read_bytes().replace(b"140000",b"160000"))
        before=(self.data/"history.json").read_bytes()
        with self.assertRaisesRegex(ValueError,"hash mismatch"):
            store.validate_manifest(self.annual)
        self.assertEqual((self.data/"history.json").read_bytes(),before)

    def test_snapshot_retains_full_daily_fx_and_gold_source_timestamps(self):
        spot={"XAU":[{"as_of":"2026-10-25T06:54:38+00:00",
                     "date":"2026-10-25","usd_per_troy_ounce":3996.9}],
              "XAG":[]}
        fx=[{"date":"2026-10-25","inr_per_usd":94.76}]
        self.seed([ibja("2026-10-23")],spot=spot,fx=fx)
        out=store.update_storage(self.data)
        self.assertEqual(out["totals"]["spot-xau"],1)
        self.assertEqual(out["totals"]["fx"],1)
        restored=store.complete_history({"india":[],"spot":{},"fx":[]},self.annual)
        self.assertEqual(restored["spot"]["XAU"][0]["as_of"],
                         "2026-10-25T06:54:38+00:00")
        self.assertEqual(restored["fx"][0]["inr_per_usd"],94.76)


if __name__ == "__main__":
    unittest.main()
