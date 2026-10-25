import unittest
from datetime import datetime, timezone
from scripts.backfill_rates import get_close_values, combine_history

NOW=datetime(2026,10,25,12,tzinfo=timezone.utc)

def payload(metal,purity,values):
    return {"metal":metal,"purity":purity,"unit":"INR per gram",
            "source":"IBJA","rows":[{"date":f"2026-09-{i:02d}",
              "close":v,"pm":v,"am":None} for i,v in enumerate(values,1)]}

class BackfillTests(unittest.TestCase):
    def test_restores_gram_to_correct_ibja_unit(self):
        values=[14000+i*3.1 for i in range(30)]
        hist=get_close_values(payload("gold","999",values),"gold","999",10,NOW.date())
        self.assertEqual(hist["2026-09-01"],140000)
        self.assertEqual(hist["2026-09-09"],140248)
    def test_silver_rounded_gram_precision(self):
        val=[194.415+i*.17 for i in range(30)]
        hist=get_close_values(payload("silver","999",val),"silver","999",1000,NOW.date())
        self.assertEqual(hist["2026-09-01"],194415)
    def test_wrong_purity_not_used_as_22k(self):
        with self.assertRaises(ValueError):
            get_close_values(payload("gold","999",[14000]*21),"gold","916",10,NOW.date())
    def test_am_only_sessions_never_become_pm_closes(self):
        p=payload("gold","999",[14000]*21)
        for r in p["rows"]:r["pm"]=None
        with self.assertRaisesRegex(ValueError,"fewer"):
            get_close_values(p,"gold","999",10,NOW.date())
    def test_preserves_current_accurate_source_and_skips_conflict(self):
        official={"date":"2026-10-23","session":"PM",
                  "gold24_inr_10g":141630,
                  "gold22_inr_10g":129733,
                  "silver999_inr_kg":194415}
        prior={"date":"2026-10-22","session":"PM",
               "gold24_inr_10g":142694,
               "gold22_inr_10g":130708,
               "silver999_inr_kg":199777}
        h={"schema_version":1,"india":[prior],"spot":{},"fx":[]}
        a={"gold24_inr_10g":{"2026-10-22":120000,"2026-10-21":144105},
           "gold22_inr_10g":{"2026-10-22":130708,"2026-10-21":132000},
           "silver999_inr_kg":{"2026-10-22":199780,"2026-10-21":206780}}
        out,imported,conflicts=combine_history(h,official,a,NOW)
        self.assertEqual(out["india"][-1]["date"],"2026-10-23")
        self.assertEqual(out["india"][-1]["gold24_inr_10g"],141630)
        self.assertEqual(out["india"][0]["gold24_inr_10g"],144105)
        self.assertEqual(imported,1)
        self.assertEqual(conflicts,1)
        self.assertEqual(out["india"][1]["gold24_inr_10g"],142694)
        self.assertEqual(out["india"][1]["silver999_inr_kg"],199777)
    def test_partial_missing_916_keeps_only_observed_field(self):
        official={"date":"2026-10-23","session":"PM",
                  "gold24_inr_10g":141630,"gold22_inr_10g":129733,
                  "silver999_inr_kg":194415}
        h={"india":[],"schema_version":1}
        out,_,_=combine_history(h,official,{"gold24_inr_10g":{"2026-10-22":142694},
                                            "silver999_inr_kg":{"2026-10-22":199777}},NOW)
        prev=out["india"][0]
        self.assertNotIn("gold22_inr_10g",prev)
        self.assertEqual(prev["session"],"PM")
if __name__=="__main__":
    unittest.main()
