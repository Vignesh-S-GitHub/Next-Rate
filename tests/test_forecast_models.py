import math
import unittest
from scripts.forecast_models import estimate,walk_forward,errors

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

if __name__=="__main__":
    unittest.main()
