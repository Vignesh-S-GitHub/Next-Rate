import json
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from scripts.schedule_refresh import decide, record, session_health

DAY = date(2026, 10, 26)
NOW = datetime(2026, 10, 26, 14, 30, tzinfo=timezone.utc)  # 20:00 IST
QUOTE = {"date": DAY.isoformat(), "session": "PM", "gold24_inr_10g": 141710,
         "gold22_inr_10g": 129806, "silver999_inr_kg": 194479}


class SchedulerTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        (self.root / "data/archive/ibja").mkdir(parents=True)
        self.latest = {"checked_at": "2026-10-26T14:00:00+00:00", "india": dict(QUOTE),
                       "sources_checked": {"ibja": "ok"}}
        self.rows = [{**QUOTE, "session": "AM"}, dict(QUOTE)]
        self.save()

    def save(self):
        (self.root / "data/latest.json").write_text(json.dumps(self.latest))
        (self.root / "data/archive/ibja/2026.json").write_text(json.dumps({"records": self.rows}))

    def test_scheduled_retry_is_required_without_a_real_timer_receipt(self):
        r = decide(self.root, NOW)
        self.assertTrue(r["refresh"])
        self.assertEqual((r["date"], r["session"]), (DAY.isoformat(), "PM"))
        self.assertIn("no successful timer", r["reason"])

    def test_push_success_cannot_certify_the_timer(self):
        record(self.root, DAY, "PM", NOW, trigger="push", run_id="1234")
        self.assertTrue(decide(self.root, NOW)["refresh"])

    def test_successful_timer_publication_is_idempotent(self):
        record(self.root, DAY, "PM", NOW, trigger="schedule", run_id="1234")
        self.assertFalse(decide(self.root, NOW)["refresh"])

    def test_source_failure_is_retried_even_after_an_earlier_success(self):
        record(self.root, DAY, "PM", NOW, trigger="schedule", run_id="1234")
        self.latest["sources_checked"]["ibja"] = "unavailable"
        self.save()
        self.assertTrue(decide(self.root, NOW)["refresh"])

    def test_check_before_cutoff_does_not_skip_the_evening_fetch(self):
        self.latest["checked_at"] = "2026-10-26T12:46:34+00:00"  # 18:16 IST
        self.save()
        self.assertFalse(session_health(self.root, DAY, "PM", now=NOW)[0])
        self.assertTrue(decide(self.root, NOW)["refresh"])

    def test_morning_and_evening_use_distinct_due_times(self):
        before = datetime(2026, 10, 26, 7, 44, tzinfo=timezone.utc)
        opening = datetime(2026, 10, 26, 7, 45, tzinfo=timezone.utc)
        before_close = datetime(2026, 10, 26, 13, 44, tzinfo=timezone.utc)
        close = datetime(2026, 10, 26, 13, 45, tzinfo=timezone.utc)
        self.assertFalse(decide(self.root, before)["refresh"])
        self.assertEqual(decide(self.root, opening)["session"], "AM")
        self.assertEqual(decide(self.root, before_close)["session"], "AM")
        self.assertEqual(decide(self.root, close)["session"], "PM")

    def test_am_snapshot_cannot_certify_a_pm_close(self):
        self.latest["india"]["session"] = "AM"
        self.save()
        self.assertFalse(session_health(self.root, DAY, "PM", now=NOW)[0])

    def test_pm_run_must_preserve_the_opening_archive_too(self):
        self.rows = [dict(QUOTE)]
        self.save()
        self.assertFalse(session_health(self.root, DAY, "PM", now=NOW)[0])
        with self.assertRaises(ValueError):
            record(self.root, DAY, "PM", NOW, trigger="schedule", run_id="1234")

    def test_missing_or_future_source_timestamps_require_recovery(self):
        for stamp in (None, "broken", "2026-10-27T14:00:00+00:00"):
            self.latest["checked_at"] = stamp
            self.save()
            self.assertTrue(decide(self.root, NOW)["refresh"])

    def test_closed_day_preserves_the_real_price_date(self):
        sunday = date(2026, 10, 25)
        now = datetime(2026, 10, 25, 14, 30, tzinfo=timezone.utc)
        self.latest["checked_at"] = "2026-10-25T14:00:00+00:00"
        self.latest["india"]["date"] = "2026-10-23"
        self.save()
        record(self.root, sunday, "PM", now, trigger="schedule", run_id="1234")
        self.assertFalse(decide(self.root, now)["refresh"])
        self.assertEqual(self.latest["india"]["date"], "2026-10-23")

    def test_retired_project_has_no_active_workflows_timers_or_database_bindings(self):
        root = Path(__file__).resolve().parents[1]
        self.assertEqual(list((root / ".github/workflows").glob("*.y*ml")), [])
        self.assertTrue((root / "docs/reference/pages.yml.example").exists())
        worker = json.loads((root / "cloudflare/nextrate-scheduler/wrangler.jsonc").read_text())
        self.assertEqual(worker["triggers"]["crons"], [])
        self.assertEqual(worker["d1_databases"], [])

    def test_explicit_manual_refresh_exercises_the_complete_pipeline(self):
        self.assertTrue(decide(self.root, NOW, requested=True)["refresh"])


if __name__ == "__main__":
    unittest.main()
