import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime, timezone
from scripts.update_rates import parse_ibja, parse_spot, parse_fx, source_sessions, archive_source_sessions

SAMPLE = """
<html><body>
<table><tr><th>Purity</th><th>AM</th><th>PM</th></tr>
<tr><td>Gold 999</td><td>141448</td><td>141630</td></tr>
<tr><td>Gold 916</td><td>129566</td><td>129733</td></tr>
<tr><td>Silver 999</td><td>195027</td><td>194415</td></tr>
</table>
<h2>Previous 30 Days</h2>
<table>
<tr><td>23/10/2026</td><td>141448</td><td>140882</td><td>129566</td><td>106086</td><td>82747</td><td>195027</td><td>55916</td></tr>
<tr><td>22/10/2026</td><td>143152</td><td>142579</td><td>131127</td><td>107364</td><td>83744</td><td>200748</td><td>56858</td></tr>
</table>
<table>
<tr><td>23/10/2026</td><td>141630</td><td>141063</td><td>129733</td><td>106223</td><td>82854</td><td>194415</td><td>55743</td></tr>
<tr><td>22/10/2026</td><td>142694</td><td>142123</td><td>130708</td><td>107021</td><td>83476</td><td>199777</td><td>56347</td></tr>
</table></body></html>
"""


class RatesTests(unittest.TestCase):
    def test_late_pm_collection_recovers_both_open_and_close(self):
        doc = SAMPLE.replace("23/10/2026", "22/10/2026")
        now = datetime(2026, 10, 23, 14, tzinfo=timezone.utc)
        current, _ = parse_ibja(doc, now)
        rows = [r for r in source_sessions(doc, current, now) if r["date"] == "2026-10-23"]
        self.assertEqual([r["session"] for r in rows], ["AM", "PM"])
        self.assertEqual(rows[0]["gold24_inr_10g"], 141448)
        self.assertEqual(rows[1]["gold24_inr_10g"], 141630)

    def test_am_recovery_does_not_invent_an_early_pm_observation(self):
        doc = SAMPLE.replace("23/10/2026", "22/10/2026")
        now = datetime(2026, 10, 23, 8, tzinfo=timezone.utc)
        current, _ = parse_ibja(doc, now)
        rows = [r for r in source_sessions(doc, current, now) if r["date"] == "2026-10-23"]
        self.assertEqual([r["session"] for r in rows], ["AM"])

    def test_session_recovery_on_weekend_keeps_explicit_prior_dates(self):
        now = datetime(2026, 10, 24, 14, tzinfo=timezone.utc)
        current, _ = parse_ibja(SAMPLE, now)
        rows = source_sessions(SAMPLE, current, now)
        self.assertNotIn("2026-10-24", [r["date"] for r in rows])
        self.assertEqual({r["session"] for r in rows if r["date"] == "2026-10-23"}, {"AM", "PM"})

    def test_recovered_sessions_cannot_silently_rehash_a_corrupted_archive(self):
        now = datetime(2026, 10, 24, 14, tzinfo=timezone.utc)
        current, _ = parse_ibja(SAMPLE, now)
        with TemporaryDirectory() as folder:
            annual = Path(folder)
            archive_source_sessions(SAMPLE, current, now, annual)
            shard = annual / "ibja/2026.json"
            original = shard.read_text()
            broken = original.replace('141630', '141631')
            self.assertNotEqual(original, broken)
            shard.write_text(broken)
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                archive_source_sessions(SAMPLE, current, now, annual)
            self.assertEqual(shard.read_text(), broken)

    def test_weekend_uses_dated_prior_close(self):
        current, history = parse_ibja(SAMPLE, datetime(2026, 10, 24, 12, tzinfo=timezone.utc))
        self.assertEqual(current["date"], "2026-10-23")
        self.assertEqual(current["session"], "PM")
        self.assertEqual(current["gold24_inr_10g"], 141630)
        self.assertEqual(current["gold22_inr_10g"], 129733)
        self.assertEqual(current["silver999_inr_kg"], 194415)
        self.assertEqual(len(history), 2)

    def test_current_session_during_business_day(self):
        doc = SAMPLE.replace("23/10/2026", "22/10/2026")
        current, _ = parse_ibja(doc, datetime(2026, 10, 23, 14, tzinfo=timezone.utc))
        self.assertEqual(current["date"], "2026-10-23")
        self.assertEqual(current["session"], "PM")

    def test_exchange_holiday_keeps_real_previous_dated_close(self):
        doc = SAMPLE.replace("23/10/2026", "19/10/2026").replace(
            "22/10/2026", "16/10/2026")
        result, history = parse_ibja(
            doc, datetime(2026, 10, 20, 14, tzinfo=timezone.utc))
        self.assertEqual(result["date"], "2026-10-19")
        self.assertEqual(result["session"], "PM")
        self.assertNotIn("2026-10-20", [row["date"] for row in history])

    def test_prolonged_stale_page_does_not_fabricate_today(self):
        doc = SAMPLE.replace("23/10/2026", "13/10/2026").replace(
            "22/10/2026", "12/10/2026")
        result, history = parse_ibja(
            doc, datetime(2026, 10, 23, 14, tzinfo=timezone.utc))
        self.assertEqual(result["date"], "2026-10-13")
        self.assertFalse(any(row["date"] == "2026-10-23" for row in history))

    def test_spot_preserves_real_timestamp(self):
        now = datetime(2026, 10, 24, 14, tzinfo=timezone.utc)
        data = {"symbol": "XAU", "currency": "USD", "price": 4102.5, "updatedAt": "2026-10-23T17:30:00Z"}
        result = parse_spot(json.dumps(data).encode(), "XAU", now)
        self.assertEqual(result["usd_per_troy_ounce"], 4102.5)
        self.assertTrue(result["as_of"].startswith("2026-10-23"))

    def test_spot_rejects_wrong_symbol(self):
        now = datetime(2026, 10, 24, tzinfo=timezone.utc)
        data = {"symbol": "XAG", "currency": "USD", "price": 51.2, "updatedAt": "2026-10-23T17:30:00Z"}
        with self.assertRaises(ValueError):
            parse_spot(json.dumps(data).encode(), "XAU", now)

    def test_fx_legacy_provider(self):
        now = datetime(2026, 10, 24, 14, tzinfo=timezone.utc)
        data = b'{"date":"2026-10-23","base":"USD","rates":{"INR":93.211}}'
        result = parse_fx(data, now)
        self.assertEqual(result["inr_per_usd"], 93.211)

    def test_fx_open_fallback(self):
        now = datetime(2026, 10, 24, 14, tzinfo=timezone.utc)
        data = b'{"result":"success","base_code":"USD","time_last_update_unix":1792800000,"rates":{"INR":93.215}}'
        result = parse_fx(data, now)
        self.assertEqual(result["source"], "ExchangeRate-API open access")
        self.assertEqual(result["inr_per_usd"], 93.215)

    def test_fx(self):
        now = datetime(2026, 10, 24, 14, tzinfo=timezone.utc)
        result = parse_fx(b'{"date":"2026-10-23","base":"USD","quote":"INR","rate":83.2711}', now)
        self.assertEqual(result["inr_per_usd"], 83.2711)


if __name__ == "__main__":
    unittest.main()
