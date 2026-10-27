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
            return (ROOT / urlsplit(url).path.removeprefix('/Next-Rate/')).read_bytes()

        with patch.object(smoke_site, 'fetch', side_effect=fetch):
            result = smoke_site.check('https://example.test/Next-Rate/')
        self.assertGreaterEqual(result['served_assets'], 24)


if __name__ == '__main__':
    unittest.main()
