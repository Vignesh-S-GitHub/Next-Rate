"""Cross-runtime checks against the established Python market/model rules."""
import json
import subprocess
import unittest
from datetime import datetime, timezone
from pathlib import Path
from scripts.forecast import generate
from scripts.archive_data import complete_history
from scripts.update_rates import parse_ibja, source_sessions
from test_update_rates import SAMPLE

ROOT = Path(__file__).resolve().parents[1]

def node_json(code, value):
    result = subprocess.run(['node', '--input-type=module', '-e', code], input=json.dumps(value),
                            text=True, capture_output=True, cwd=ROOT, check=True)
    return json.loads(result.stdout)

class CloudflareParityTests(unittest.TestCase):
    def test_forecast_math_and_holiday_rules_match_python(self):
        latest=json.loads((ROOT/'data/latest.json').read_text())
        history=complete_history(json.loads((ROOT/'data/history.json').read_text()))
        for stamp in ['2026-10-26T17:16:06+00:00','2026-10-27T04:00:00+00:00','2026-12-31T14:00:00+00:00']:
            now=datetime.fromisoformat(stamp)
            expected=generate(latest,history,now)
            actual=node_json('''import {generate} from './cloudflare/nextrate-scheduler/forecast.mjs';
                let text='';for await(const s of process.stdin)text+=s;
                const p=JSON.parse(text);console.log(JSON.stringify(generate(p.latest,p.history.india,p.now)));''',
                {'latest':latest,'history':history,'now':stamp})
            actual['generated_at']=expected['generated_at']
            self.assertEqual(actual,expected)

    def test_short_and_long_trending_models_match_python(self):
        from datetime import timedelta
        import math
        for n in (8, 60, 100, 365):
            now=datetime(2026,10,26,14,tzinfo=timezone.utc)
            rows=[]
            for i in range(n):
                gold=round(100000+i*55+math.sin(i)*1100)
                rows.append({'date':(now.date()-timedelta(days=n-1-i)).isoformat(),
                             'session':'PM','gold24_inr_10g':gold,
                             'gold22_inr_10g':round(gold*.916), 'silver999_inr_kg':round(gold*1.7)})
            expected=generate({'india':rows[-1]},{'india':rows},now)
            actual=node_json("""import {generate} from './cloudflare/nextrate-scheduler/forecast.mjs';
                let t='';for await(const s of process.stdin)t+=s;const p=JSON.parse(t);
                console.log(JSON.stringify(generate({india:p.rows.at(-1)},p.rows,p.now)));""",
                {'rows':rows,'now':now.isoformat()})
            actual['generated_at']=expected['generated_at']
            def normalize(value):
                if isinstance(value,float): return round(value,10)
                if isinstance(value,list): return [normalize(x) for x in value]
                if isinstance(value,dict): return {k:normalize(v) for k,v in value.items()}
                return value
            self.assertEqual(normalize(actual),normalize(expected))

    def test_dated_source_parser_recovers_exact_same_am_pm_values(self):
        now=datetime(2026,10,26,14,tzinfo=timezone.utc)
        current,_=parse_ibja(SAMPLE,now)
        expected=source_sessions(SAMPLE,current,now)
        actual=node_json('''import {parseIBJA} from './cloudflare/nextrate-scheduler/market.mjs';
            let t='';for await(const s of process.stdin)t+=s;const p=JSON.parse(t);
            console.log(JSON.stringify(parseIBJA(p.html,p.now).rows));''', {'html':SAMPLE,'now':now.isoformat()})
        normalize=lambda rows: sorted([{k:r[k] for k in ('date','session','gold24_inr_10g','gold22_inr_10g','silver999_inr_kg')} for r in rows],key=lambda r:r['date']+r['session'])
        self.assertEqual(normalize(actual),normalize(expected))

if __name__=='__main__':unittest.main()
