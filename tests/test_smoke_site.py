import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

from scripts import smoke_site


ROOT = Path(__file__).resolve().parents[1]


class LiveAssetTests(unittest.TestCase):
    def test_every_html_script_is_checked_and_missing_script_fails(self):
        fetched = []

        def fetch(url):
            path = urlsplit(url).path.removeprefix('/Next-Rate/')
            fetched.append(path)
            if path == 'weights.js':
                raise OSError('missing asset')
            return (ROOT / path).read_bytes()

        with patch.object(smoke_site, 'fetch', side_effect=fetch):
            with self.assertRaisesRegex(OSError, 'missing asset'):
                smoke_site.check('https://example.test/Next-Rate/')
        self.assertIn('weights.js', fetched)

    def test_valid_site_checks_every_script_and_stylesheet(self):
        def fetch(url):
            if url.endswith('/bundle.json'):
                import json
                documents={p.name:json.loads(p.read_text()) for p in (ROOT/'data').glob('*.json') if p.name in {'latest.json','history.json','forecast.json','forecast_history.json','cities.json','funds.json'}}
                return json.dumps({'schema_version':1,'revision':1,'documents':documents}).encode()
            return (ROOT / urlsplit(url).path.removeprefix('/Next-Rate/')).read_bytes()

        with patch.object(smoke_site, 'fetch', side_effect=fetch):
            result = smoke_site.check('https://example.test/Next-Rate/')
        self.assertGreaterEqual(result['served_assets'], 24)


if __name__ == '__main__':
    unittest.main()
