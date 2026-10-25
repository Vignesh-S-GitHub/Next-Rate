import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from scripts import update_cities as cities

NOW=datetime(2026,10,25,10,tzinfo=timezone.utc)
CITY=["Chennai","Mumbai","Delhi","Bangalore","Hyderabad"]
def html_table(kind="gold",day="25 October 2026"):
    lines=["<html><h1>Rates</h1><p>"+day+"</p><table><tr><th>City</th><th>First</th><th>Second</th><th>Third</th></tr>"]
    for name in CITY:
        if kind=="gold":
            values=("<td>₹14,273</td><td>₹13,085</td><td>₹10,709</td>" if name=="Delhi"
                     else "<td>₹14,258</td><td>₹13,070</td><td>₹10,694</td>")
        else:
            values="<td>₹2,200</td><td>₹22,000</td><td>₹2,20,000</td>"
        lines.append(f"<tr><td>{name}</td>{values}</tr>")
    return "".join(lines)+"</table></html>"

class CityRateTests(unittest.TestCase):
    def test_exact_five_city_gold_rates_and_purity(self):
        stamp,rows=cities.extract_city_values(html_table(),"gold",NOW.date())
        self.assertEqual(stamp.isoformat(),"2026-10-25")
        self.assertEqual(rows["Chennai"],{"gold24_inr_g":14258,"gold22_inr_g":13070})
        self.assertEqual(rows["Delhi"]["gold24_inr_g"],14273)
        self.assertEqual(rows["Bengaluru"]["gold22_inr_g"],13070)

    def test_silver_kg_not_wrongly_treated_as_gram(self):
        stamp,rows=cities.extract_city_values(html_table("silver"),"silver",NOW.date())
        self.assertEqual(stamp.isoformat(),"2026-10-25")
        self.assertTrue(all(x["silver999_inr_kg"]==220000 for x in rows.values()))

    def test_missing_city_never_filled_using_a_national_figure(self):
        broken=html_table().replace("<tr><td>Hyderabad</td>","<tr><td>Jaipur</td>")
        with self.assertRaisesRegex(ValueError,"Incomplete"):
            cities.extract_city_values(broken,"gold",NOW.date())

    def test_wrong_22k_purity_is_rejected(self):
        broken=html_table().replace("₹13,070","₹17,070")
        with self.assertRaisesRegex(ValueError,"Incomplete"):
            cities.extract_city_values(broken,"gold",NOW.date())

    def test_rates_require_explicit_fresh_source_date(self):
        with self.assertRaises(ValueError):
            cities.extract_city_values(html_table(day="22 September 2026"),"gold",NOW.date())
        with self.assertRaises(ValueError):
            cities.extract_city_values(html_table(day="27 October 2026"),"gold",NOW.date())

    def test_unavailable_page_retains_dated_source_and_marks_not_live(self):
        with TemporaryDirectory() as tmp:
            dst=Path(tmp)/"cities.json"
            original={
                "schema_version":1,
                "as_of":"2026-10-25",
                "dates":{"gold":"2026-10-25","silver":"2026-10-25"},
                "cities":{"Chennai":{"gold24_inr_g":14258,"gold22_inr_g":13070,
                                     "silver999_inr_kg":220000}},
            }
            dst.write_text(json.dumps(original))
            with patch.object(cities,"FILE",dst),patch.object(cities,"download",side_effect=RuntimeError("offline")):
                updated=cities.update(NOW)
            self.assertEqual(updated["status"],"source_unavailable")
            self.assertEqual(updated["cities"]["Chennai"]["gold24_inr_g"],14258)
            self.assertEqual(updated["dates"]["gold"],"2026-10-25")

    def test_partial_source_updates_dont_fake_date_for_other_metal(self):
        with TemporaryDirectory() as tmp:
            dst=Path(tmp)/"cities.json"
            dst.write_text(json.dumps({
                "schema_version":1,"as_of":"2026-10-23",
                "dates":{"gold":"2026-10-23","silver":"2026-10-23"},
                "cities":{c:{"gold24_inr_g":14000,"gold22_inr_g":12800,
                             "silver999_inr_kg":225000} for c in cities.EXPECTED}
            }))
            def partial(url):
                if "silver" in url: raise RuntimeError("not connected")
                return html_table().encode("utf-8")
            with patch.object(cities,"FILE",dst),patch.object(cities,"download",side_effect=partial):
                result=cities.update(NOW)
            self.assertEqual(result["status"],"partial")
            self.assertEqual(result["dates"]["gold"],"2026-10-25")
            self.assertEqual(result["dates"]["silver"],"2026-10-23")
            self.assertEqual(result["cities"]["Chennai"]["silver999_inr_kg"],225000)

if __name__=="__main__":
    unittest.main()
