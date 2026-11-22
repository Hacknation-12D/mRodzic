"""Serve the SQLite demo profiles over HTTP for Expo web and native clients."""

import argparse
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlsplit

from build_db import build_db, DEFAULT_DB, DEFAULT_SOURCE


def identity(row):
    return json.loads(row["mobywatel_json"])


class DemoHandler(BaseHTTPRequestHandler):
    def respond(self, status, data=None):
        body = b"" if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def connect(self):
        # A separate read-only connection per request also works across handler threads.
        conn = sqlite3.connect(self.server.db_uri, uri=True)
        conn.row_factory = sqlite3.Row
        return closing(conn)

    def do_OPTIONS(self):
        self.respond(204)

    def do_GET(self):
        path = urlsplit(self.path).path
        with self.connect() as conn:
            if path == "/health":
                count = conn.execute("SELECT COUNT(*) FROM demo_profiles").fetchone()[0]
                return self.respond(200, {"status": "ok", "profiles": count})
            if path == "/api/demo-profiles":
                rows = conn.execute("SELECT profile_id, slug, label, sensitive FROM demo_profiles ORDER BY profile_id")
                return self.respond(200, {"profiles": [
                    {"profileId": row["profile_id"], "slug": row["slug"],
                     "label": row["label"], "sensitive": bool(row["sensitive"])}
                    for row in rows
                ]})
            match = re.fullmatch(r"/api/(demo-snapshot|mock/mobywatel)/(P[0-9]{2})", path)
            if match:
                row = conn.execute("SELECT * FROM demo_profiles WHERE profile_id = ?", (match[2],)).fetchone()
                if row:
                    profile = json.loads(row["profile_json"])
                    if match[1] == "mock/mobywatel":
                        return self.respond(200, identity(row))
                    return self.respond(200, {
                        "profileId": row["profile_id"], "slug": row["slug"], "appProfileV1": profile,
                    })
        self.respond(404, {"error": "Resource not found"})

    def do_POST(self):
        if urlsplit(self.path).path != "/api/demo-login":
            return self.respond(404, {"error": "Resource not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 <= length <= 4096:
                return self.respond(413, {"error": "Invalid body size"})
            request = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, UnicodeError, RecursionError):
            return self.respond(400, {"error": "Expected JSON object"})
        if not isinstance(request, dict) or request.keys() - {"profileId", "includeSensitive"}:
            return self.respond(400, {"error": "Expected profileId or includeSensitive"})
        if "profileId" in request and not isinstance(request["profileId"], str):
            return self.respond(400, {"error": "profileId must be a string"})
        include_sensitive = request.get("includeSensitive", False)
        if not isinstance(include_sensitive, bool):
            return self.respond(400, {"error": "includeSensitive must be a boolean"})

        with self.connect() as conn:
            if "profileId" in request:
                row = conn.execute("SELECT * FROM demo_profiles WHERE profile_id = ?", (request["profileId"],)).fetchone()
            else:
                row = conn.execute("""
                    SELECT * FROM demo_profiles WHERE sensitive = 0 OR ?
                    ORDER BY RANDOM() LIMIT 1
                """, (include_sensitive,)).fetchone()
        if row is None:
            return self.respond(404, {"error": "No matching demo profile"})
        profile = json.loads(row["profile_json"])
        self.respond(200, {
            "profileId": row["profile_id"], "appProfileV1": profile, "mobywatel": identity(row),
        })


def make_server(host, port, db):
    server = ThreadingHTTPServer((host, port), DemoHandler)
    server.db_uri = db.resolve().as_uri() + "?mode=ro"
    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    count = build_db(DEFAULT_SOURCE, args.db)
    with make_server(args.host, args.port, args.db) as server:
        print(f"Serving {count} SQLite demo profiles on http://{args.host}:{args.port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
