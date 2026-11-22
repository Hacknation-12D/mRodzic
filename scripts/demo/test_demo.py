import http.client
import json
from contextlib import closing
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
from threading import Thread
import unittest

from build_db import build_db, DEFAULT_SOURCE
from mock_server import make_server


class DemoIntegrationTest(unittest.TestCase):
    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.db = Path(tmp.name) / "demo.sqlite3"
        self.source = Path(tmp.name) / "fixture.json"
        self.records = json.loads(DEFAULT_SOURCE.read_text(encoding="utf-8"))
        build_db(DEFAULT_SOURCE, self.db)
        self.server = make_server("127.0.0.1", 0, self.db)
        thread = Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(thread.join)
        self.addCleanup(self.server.shutdown)

    def request(self, path, payload=None):
        with closing(http.client.HTTPConnection(*self.server.server_address, timeout=5)) as client:
            if payload is None:
                client.request("GET", path)
            else:
                client.request("POST", path, json.dumps(payload), {"Content-Type": "application/json"})
            response = client.getresponse()
            return response.status, json.load(response)

    def test_every_fixture_survives_sqlite_and_failed_reimport(self):
        self.assertEqual(build_db(DEFAULT_SOURCE, self.db), len(self.records))
        self.source.write_text(json.dumps(self.records + self.records[:1]), encoding="utf-8")
        with self.assertRaises(sqlite3.IntegrityError):
            build_db(self.source, self.db)
        status, listing = self.request("/api/demo-profiles")
        self.assertEqual(status, 200)
        self.assertEqual([p["profileId"] for p in listing["profiles"]], [r["profileId"] for r in self.records])
        for record in self.records:
            profile_id, profile = record["profileId"], record["profile"]
            status, login = self.request("/api/demo-login", {"profileId": profile_id})
            self.assertEqual(status, 200)
            self.assertEqual(login["profileId"], profile_id)
            self.assertEqual(login["appProfileV1"], profile)
            self.assertEqual(login["mobywatel"], {
                "firstName": profile["me"]["firstName"], "lastName": record["mobywatel"]["lastName"],
                "birthDate": record["mobywatel"]["birthDate"], "city": profile["household"]["city"],
            })
            status, snapshot = self.request(f"/api/demo-snapshot/{profile_id}")
            self.assertEqual(status, 200)
            self.assertEqual(snapshot["appProfileV1"], profile)

    def test_sensitive_profile_requires_explicit_opt_in(self):
        sensitive = next(r for r in self.records if r["profileId"] == "P08")
        self.source.write_text(json.dumps([sensitive]), encoding="utf-8")
        build_db(self.source, self.db)
        self.assertEqual(self.request("/api/demo-login", {})[0], 404)
        self.assertEqual(self.request("/api/demo-login", {"includeSensitive": "true"})[0], 400)
        self.assertEqual(self.request("/api/demo-login", {"includeSensitive": True})[1]["profileId"], "P08")


if __name__ == "__main__":
    unittest.main()
