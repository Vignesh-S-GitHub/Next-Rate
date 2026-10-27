import copy
import unittest
from datetime import date, datetime, timezone
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path
from scripts import forecast


SAMPLE = [
    {"date": "2026-10-19", "session": "PM", "gold24_inr_10g": 145944,
     "gold22_inr_10g": 133685, "silver999_inr_kg": 208750},
    {"date": "2026-10-21", "session": "PM", "gold24_inr_10g": 144105,
     "gold22_inr_10g": 132000, "silver999_inr_kg": 206783},
    {"date": "2026-10-22", "session": "PM", "gold24_inr_10g": 142694,
     "gold22_inr_10g": 130708, "silver999_inr_kg": 199777},
    {"date": "2026-10-23", "session": "PM", "gold24_inr_10g": 141630,
     "gold22_inr_10g": 129733, "silver999_inr_kg": 194415},
]
NOW = datetime(2026, 10, 24, 19, tzinfo=timezone.utc)  # Sunday 25 October IST


class ForecastTests(unittest.TestCase):
    def latest(self):
        return {"india": {**SAMPLE[-1], "source": "IBJA"}, "spot": {}, "fx": None}

    def history(self):
        return {"india": copy.deepcopy(SAMPLE)}

    def test_independent_accuracy_counts_unique_target_days_of_current_model(self):
        def scored(version, target, session, error):
            return {
                "model_version": version, "target_date": target,
                "based_on_date": "2026-10-23", "based_on_session": session,
                "issued_at": "2026-10-23T13:00:00+00:00",
                "evaluation": {"metals": {"gold24": {"absolute_error_pct": error}}},
            }
        issued = [
            scored(forecast.MODEL_VERSION-1, "2026-10-26", "PM", 9),
            scored(forecast.MODEL_VERSION, "2026-10-26", "AM", 4),
            scored(forecast.MODEL_VERSION, "2026-10-26", "PM", 1),
            scored(forecast.MODEL_VERSION, "2026-10-27", "PM", 2),
        ]
        selected = forecast.independent_evaluations(issued, forecast.MODEL_VERSION)
        self.assertEqual(len(selected), 2)
        self.assertEqual(selected[0]["evaluation"]["metals"]["gold24"]["absolute_error_pct"], 1)
        self.assertEqual([item["target_date"] for item in selected],
                         ["2026-10-26", "2026-10-27"])

    def test_calendar_weekends_do_not_invent_ibja_saturday_sunday(self):
        self.assertEqual(forecast.next_weekday(date(2026, 10, 23)), date(2026, 10, 26))
        self.assertEqual(forecast.next_weekday(date(2026, 10, 24)), date(2026, 10, 26))
        self.assertEqual(forecast.next_weekday(date(2026, 10, 25)), date(2026, 10, 26))
        self.assertEqual(forecast.next_weekday(date(2026, 10, 26)), date(2026, 10, 27))

    def test_2026_official_commodity_holidays_are_skipped(self):
        self.assertEqual(
            forecast.next_ibja_publication_day(date(2026, 11, 23)),
            date(2026, 11, 25),
        )
        self.assertEqual(
            forecast.next_ibja_publication_day(date(2026, 12, 24)),
            date(2026, 12, 28),
        )
        self.assertEqual(
            forecast.next_ibja_publication_day(date(2026, 10, 25)),
            date(2026, 10, 26),
        )

    def test_2027_without_official_calendar_is_marked_unverified(self):
        rows = []
        for row in SAMPLE:
            shifted = dict(row)
            shifted["date"] = row["date"].replace("2026", "2027")
            rows.append(shifted)
        latest = {"india": rows[-1]}
        history = {"india": rows}
        now = datetime(2027, 10, 24, 19, tzinfo=timezone.utc)
        pred = forecast.generate(latest, history, now)
        self.assertEqual(pred["status"], "unavailable")
        self.assertFalse(pred["holiday_calendar_verified"])
        self.assertIn("holiday calendar", pred["reason"])

    def test_sunday_forecast_is_dated_monday_and_sourced_friday(self):
        result = forecast.generate(self.latest(), self.history(), NOW)
        self.assertEqual(result["status"], "experimental")
        self.assertEqual(result["today_ist"], "2026-10-25")
        self.assertEqual(result["calendar_tomorrow"], "2026-10-26")
        self.assertEqual(result["target_date"], "2026-10-26")
        self.assertEqual(result["based_on_date"], "2026-10-23")
        self.assertFalse(result["market_closed_tomorrow"])
        self.assertFalse(result["market_closed_tomorrow"])
        self.assertEqual(result["observations"], 4)
        self.assertFalse(result["metals"]["gold24"]["interval_calibrated"])

    def test_forecast_never_claims_a_calibrated_probability(self):
        result = forecast.generate(self.latest(), self.history(), NOW)
        self.assertEqual(result["signal_summary"][0]["name"], "Selected historical price model")
        self.assertIn("last-close", result["signal_summary"][0]["details"])
        self.assertEqual(set(result["metals"]), {"gold24", "gold22", "silver"})
        for metal, p in result["metals"].items():
            self.assertLess(p["low"], p["estimate"])
            self.assertLess(p["estimate"], p["high"])
            self.assertGreater(p["low"], 0)
            self.assertLess(abs(p["expected_change_pct"]), 2)
            self.assertFalse(p["interval_calibrated"])
            self.assertIn(p["direction"], ("Up", "Down", "Mostly steady"))
        self.assertEqual(result["validation"]["status"], "not_backtested")

    def test_yesterday_estimate_is_not_used_to_predict_yesterday(self):
        today = datetime(2026, 10, 26, 15, tzinfo=timezone.utc)
        snapshot = self.latest()
        snapshot["india"]["date"] = "2026-10-27"
        result = forecast.generate(snapshot, self.history(), today)
        self.assertEqual(result["status"], "unavailable")

    def test_refresh_before_today_source_keeps_today_as_forecast_target(self):
        today = datetime(2026, 10, 26, 3, tzinfo=timezone.utc)
        result = forecast.generate(self.latest(), self.history(), today)
        self.assertEqual(result["status"], "experimental")
        self.assertEqual(result["target_date"], "2026-10-26")
        self.assertEqual(result["based_on_date"], "2026-10-23")

    def test_fresh_today_source_targets_the_next_publication(self):
        today = datetime(2026, 10, 26, 10, tzinfo=timezone.utc)
        latest = self.latest()
        latest["india"]["date"] = "2026-10-26"
        self.assertEqual(forecast.generate(latest, self.history(), today)["target_date"], "2026-10-27")

    def test_history_after_source_date_does_not_leak_into_forecast(self):
        a = self.history()
        a["india"].append({"date": "2026-10-29", "session": "PM",
                            "gold24_inr_10g": 999999, "gold22_inr_10g": 920000,
                            "silver999_inr_kg": 999999})
        observed = forecast.generate(self.latest(), a, NOW)
        base = forecast.generate(self.latest(), self.history(), NOW)
        self.assertEqual(observed["metals"], base["metals"])

    def test_requires_real_history_not_placeholder_forecasts(self):
        data = self.history()
        data["india"] = data["india"][-2:]
        result = forecast.generate(self.latest(), data, NOW)
        self.assertEqual(result["status"], "unavailable")
        self.assertIn("three", result["reason"])

    def test_expired_reference_unavailable(self):
        now = datetime(2026, 11, 3, 10, tzinfo=timezone.utc)
        result = forecast.generate(self.latest(), self.history(), now)
        self.assertEqual(result["status"], "unavailable")

    def test_actual_is_compared_only_after_matching_target_date(self):
        estimate = forecast.generate(self.latest(), self.history(), NOW)
        archive = [{
            "issuance_key": "2026-10-26:2026-10-23:PM",
            "issued_at": NOW.isoformat(),
            "target_date": "2026-10-26",
            "based_on_date": "2026-10-23",
            "based_on_session": "PM",
            "metals": estimate["metals"],
        }]
        sunday = forecast.score_archive(copy.deepcopy(archive), self.history(), NOW)
        self.assertNotIn("evaluation", sunday[0])
        actual = {**SAMPLE[-1], "date": "2026-10-26", "gold24_inr_10g": 140120}
        hist = self.history()
        hist["india"].append(actual)
        monday = datetime(2026, 10, 26, 15, tzinfo=timezone.utc)
        scored = forecast.score_archive(sunday, hist, monday)
        self.assertEqual(scored[0]["evaluation"]["actual_date"], "2026-10-26")
        self.assertEqual(scored[0]["evaluation"]["metals"]["gold24"]["actual"], 140120)
        self.assertGreater(scored[0]["evaluation"]["metals"]["gold24"]["absolute_error_pct"], 0)
        # Scoring is immutable if the run repeats.
        again = forecast.score_archive(copy.deepcopy(scored), hist, monday)
        self.assertEqual(again[0]["evaluation"], scored[0]["evaluation"])

    def test_am_quote_is_not_counted_as_finished_day_for_scoring(self):
        issued = forecast.generate(self.latest(), self.history(), NOW)
        prediction = [{
            "target_date": "2026-10-26",
            "based_on_date": "2026-10-23",
            "issued_at": NOW.isoformat(),
            "metals": issued["metals"],
        }]
        am = {**SAMPLE[-1], "date": "2026-10-26", "session": "AM",
              "gold24_inr_10g": 139900}
        hist = self.history()
        hist["india"].append(am)
        monday = datetime(2026, 10, 26, 15, tzinfo=timezone.utc)
        pending = forecast.score_archive(prediction, hist, monday)
        self.assertNotIn("evaluation", pending[0])
        hist["india"][-1] = {**am, "session": "PM"}
        evaluated = forecast.score_archive(pending, hist, monday)
        self.assertIn("evaluation", evaluated[0])

    def test_same_day_or_undated_issuance_is_never_scored_as_prediction(self):
        issued = forecast.generate(self.latest(), self.history(), NOW)
        actual = {**SAMPLE[-1], "date": "2026-10-26", "session": "PM"}
        hist = self.history()
        hist["india"].append(actual)
        base = {"model_version": forecast.MODEL_VERSION, "target_date": "2026-10-26",
                "based_on_date": "2026-10-23", "metals": issued["metals"]}
        for timestamp in ("2026-10-25T18:30:00Z", "2026-10-26T12:00:00", None):
            row = {**base, "issued_at": timestamp}
            self.assertFalse(forecast.prospective_issuance(row))
            self.assertNotIn("evaluation", forecast.score_archive([row], hist,
                datetime(2026, 10, 26, 15, tzinfo=timezone.utc))[0])
            row["evaluation"] = {"metals": {"gold24": {"absolute_error_pct": 0}}}
            self.assertEqual(forecast.independent_evaluations([row], forecast.MODEL_VERSION), [])

    def test_archive_keeps_first_forecast_for_same_source_session(self):
        with TemporaryDirectory() as tmp:
            p=Path(tmp)
            latest=p / "latest.json"
            history=p / "history.json"
            pred=p / "forecast.json"
            archive=p / "forecast_history.json"
            latest.write_text(__import__("json").dumps(self.latest()))
            history.write_text(__import__("json").dumps(self.history()))
            with patch.object(forecast, "LATEST", latest), \
                 patch.object(forecast, "HISTORY", history), \
                 patch.object(forecast, "FORECAST", pred), \
                 patch.object(forecast, "ARCHIVE", archive):
                _, first = forecast.publish(NOW)
                _, second = forecast.publish(NOW)
                self.assertEqual(len(first["forecasts"]), 1)
                self.assertEqual(len(second["forecasts"]), 1)
                self.assertEqual(first["forecasts"][0]["issued_at"],
                                 second["forecasts"][0]["issued_at"])


if __name__ == "__main__":
    unittest.main()
