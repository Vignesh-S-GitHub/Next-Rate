import unittest
from datetime import datetime,timezone
from scripts.update_funds import parse_nav_report,SCHEMES

NOW=datetime(2026,10,25,6,tzinfo=timezone.utc)
SAMPLE="""
Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date
140088;INF204KB17I5;-;Nippon India ETF Gold BeES;Direct Plan;;116.0136;23-Oct-2026
113049;INF179KC1981;-;HDFC Gold ETF;;Growth Option;119.9108;23-Oct-2026
111954;INF200KA16D8;-;SBI Gold ETF;Regular Plan;Growth;119.6861;23-Oct-2026
120685;INF109K01U92;-;ICICI Prudential Gold ETF FOF;Direct Plan;Growth;44.7772;23-Oct-2026
149758;INF204KC1402;-;Nippon India Silver ETF;Direct Plan;;184.3876;23-Oct-2026
150556;INF179KC1DI2;-;HDFC Silver ETF;;Growth Option;184.3954;23-Oct-2026
"""
class AMFITests(unittest.TestCase):
    def test_real_report_layout_and_scheme_codes(self):
        data=parse_nav_report(SAMPLE,NOW)
        self.assertEqual(len(data),len(SCHEMES))
        self.assertEqual(data["goldbees"]["nav_inr_per_unit"],116.0136)
        self.assertEqual(data["silveretf"]["nav_date"],"2026-10-23")
        self.assertEqual(data["goldfund"]["quote_type"],"NAV, not exchange trading price")
    def test_wrong_name_is_not_spoofed(self):
        content=SAMPLE.replace("Nippon India ETF Gold BeES","Fake ETF")
        with self.assertRaisesRegex(ValueError,"Scheme name mismatch"):
            parse_nav_report(content,NOW)
    def test_future_nav_is_rejected(self):
        content=SAMPLE.replace("23-Oct-2026","27-Oct-2026")
        with self.assertRaisesRegex(ValueError,"future NAV"):
            parse_nav_report(content,NOW)
    def test_old_nav_is_rejected(self):
        content=SAMPLE.replace("23-Oct-2026","01-Jan-2026")
        with self.assertRaisesRegex(ValueError,"Stale"):
            parse_nav_report(content,NOW)
    def test_missing_schemes_not_fabricated(self):
        with self.assertRaisesRegex(ValueError,"matching"):
            parse_nav_report(SAMPLE.splitlines()[2]+"\n",NOW)

if __name__=="__main__":
    unittest.main()
