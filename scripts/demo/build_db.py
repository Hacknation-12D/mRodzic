"""Build the local demo SQLite database from the versioned profile export."""

import argparse
from contextlib import closing
import json
from pathlib import Path
import re
import sqlite3


HERE = Path(__file__).resolve().parent
DEFAULT_SOURCE = HERE.parents[1] / "src/dev/dummyData/mrodzic_compat_profiles_v1.json"
DEFAULT_DB = HERE / "mrodzic_compat.sqlite3"

# The compatibility export omits scenario titles and the sensitivity flag.
# Both come from README_INTEGRACJA.md.
SCENARIOS = {
    "P01": "Etat i duży płatnik",
    "P02": "JDG i zaległości",
    "P03": "Umowa zlecenia",
    "P04": "Studia",
    "P05": "Wcześniacze bliźnięta",
    "P06": "Adopcja",
    "P07": "Rodzina zastępcza",
    "P08": "Utrata dziecka",
    "P09": "Likwidacja pracodawcy",
    "P10": "Za życiem",
}


def read_rows(source):
    records = json.loads(source.read_text(encoding="utf-8-sig"))
    if not isinstance(records, list) or not records:
        raise ValueError("Expected a non-empty list of demo profiles")

    for record in records:
        profile_id = record["profileId"]
        slug = record["slug"]
        profile = record["profile"]
        if not re.fullmatch(r"P[0-9]{2}", profile_id) or not isinstance(slug, str) or not slug:
            raise ValueError(f"Invalid demo profile identifier or slug: {profile_id}")
        if profile.get("schemaVersion") != 1 or not profile.get("children"):
            raise ValueError(f"Invalid v1 profile: {profile_id}")
        first_name = profile["me"]["firstName"]
        city = profile["household"]["city"]
        if not all(isinstance(value, str) and value.strip() for value in (first_name, city)):
            raise ValueError(f"Missing demo login data for {profile_id}")
        label = f"{first_name} – {SCENARIOS.get(profile_id, slug)}"
        yield profile_id, slug, label, profile_id == "P08", json.dumps(profile, ensure_ascii=False, allow_nan=False)


def build_db(source=DEFAULT_SOURCE, db=DEFAULT_DB):
    with closing(sqlite3.connect(db)) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS demo_profiles (
                profile_id TEXT PRIMARY KEY NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                sensitive INTEGER NOT NULL CHECK(sensitive IN (0, 1)),
                profile_json TEXT NOT NULL
            )
        """)
        conn.execute("DELETE FROM demo_profiles")
        conn.executemany("INSERT INTO demo_profiles VALUES (?, ?, ?, ?, ?)", read_rows(source))
        return conn.execute("SELECT COUNT(*) FROM demo_profiles").fetchone()[0]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    print(f"Imported {build_db(args.source, args.db)} demo profiles into {args.db}")
