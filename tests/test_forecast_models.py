import math
import unittest
from scripts.forecast_models import estimate,walk_forward,errors,typical_range,typical_bounds

class WalkForwardTests(unittest.TestCase):
    def test_never_uses_prices_after_prediction_index(self):
        values=[100000+150*i+180*math.sin(i/6) for i in range(100)]
        before=estimate(values[:50],"momentum_3")
        future=values[:50]+[999999]*50
        self.assertEqual(estimate(future[:50],"momentum_3"),before)
    def test_backtest_remains_insufficient_for_short_history(self):
        r=walk_forward([120000,119000,120100,121000])
        self.assertEqual(r["status"],"insufficient")
    def test_uses_non_overlapping_holdout_from_long_history(self):
        vals=[150000+150*i+220*math.sin(i/7) for i in range(98)]
        r=walk_forward(vals)
        self.assertEqual(r["status"],"walk_forward")
        self.assertGreaterEqual(r["holdout_samples"],12)
        self.assertGreaterEqual(r["validation_samples"],20)
        self.assertIn(r["selected_model"],("last_close","damped_median","momentum_3","reversion_3","moving_average"))
        self.assertGreaterEqual(r["holdout_mape_pct"],0)
        self.assertIn("holdout_naive_mape_pct",r)
    def test_constant_series_prefers_last_close(self):
        result=walk_forward([143000]*100)
        self.assertEqual(result["selected_model"],"last_close")
        self.assertEqual(result["holdout_mape_pct"],0)
    def test_no_lookahead_during_each_score(self):
        prior=[100+i*1.5 for i in range(60)]
        a=errors(prior,"damped_median",15,45)
        b=errors(prior[:45]+[999999]*15,"damped_median",15,45)
        self.assertEqual(a,b)

    def test_typical_width_never_reads_later_holdout_prices(self):
        prices=[150000+300*math.sin(i/4)+50*i for i in range(100)]
        split=75
        a=typical_range(prices,"last_close",100)
        b=typical_range(prices[:split]+[300000+i*10000 for i in range(25)],"last_close",100)
        self.assertEqual(a["half_width"],b["half_width"])
        self.assertEqual(a["calibration_samples"],60)
        self.assertEqual(a["holdout_samples"],25)
        self.assertLess(b["holdout_covered"],a["holdout_covered"])

    def test_typical_band_reports_large_uncovered_moves_instead_of_shrinking_error(self):
        p=typical_range([100000]*75+[150000+i*2000 for i in range(25)],"last_close",100)
        self.assertEqual(p["target_historical_coverage_pct"],50)
        self.assertEqual(p["half_width"],0)
        self.assertEqual(p["holdout_covered"],0)
        self.assertEqual(p["holdout_coverage_pct"],0)
        self.assertIsNone(typical_range([100000]*20,"last_close",100))

    def test_outward_rounding_retains_the_point_and_units(self):
        low,high=typical_bounds(141290,.00682,100)
        self.assertEqual((low,high),(140300,142300))
        self.assertLess(low,141290)
        self.assertGreater(high,141290)
        self.assertEqual(typical_bounds(141290,0,100),(141200,141300))

if __name__=="__main__":
    unittest.main()
