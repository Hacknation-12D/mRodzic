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
    "P01": "Etat, zasiłek wypłaca pracodawca",
    "P02": "Własna firma z zaległościami w ZUS",
    "P03": "Umowa zlecenie od niedawna",
    "P04": "Studentka bez ubezpieczenia",
    "P05": "Bliźnięta urodzone przedwcześnie",
    "P06": "Adopcja 6-latka",
    "P07": "Rodzina zastępcza",
    "P08": "Utrata dziecka",
    "P09": "Utrata pracy w ciąży (firma zamknięta)",
    "P10": "Dziecko z ciężką chorobą (program „Za życiem”)",
}


# Obowiązkowe dane każdego rodzica: nazwisko, data urodzenia, PESEL i pełny adres zamieszkania.
REQUIRED_IDENTITY = ("firstName", "lastName", "birthDate", "pesel", "street", "houseNumber", "postalCode", "city")
PESEL_WEIGHTS = (1, 3, 7, 9, 1, 3, 7, 9, 1, 3)


def pesel_birth_date(pesel):
    yy, mm, dd = int(pesel[0:2]), int(pesel[2:4]), pesel[4:6]
    for offset, century in ((80, 1800), (0, 1900), (20, 2000), (40, 2100), (60, 2200)):
        if offset < mm <= offset + 12:
            return f"{century + yy}-{mm - offset:02d}-{dd}"
    return None


def check_identity(parent, who):
    missing = [key for key in REQUIRED_IDENTITY if not (isinstance(parent.get(key), str) and parent[key].strip())]
    if missing:
        raise ValueError(f"{who}: missing {', '.join(missing)}")
    pesel = parent["pesel"]
    if not re.fullmatch(r"[0-9]{11}", pesel):
        raise ValueError(f"{who}: PESEL must have 11 digits")
    checksum = (10 - sum(w * int(d) for w, d in zip(PESEL_WEIGHTS, pesel)) % 10) % 10
    female = int(pesel[9]) % 2 == 0
    if checksum != int(pesel[10]) or pesel_birth_date(pesel) != parent["birthDate"] or female != (parent.get("gender") == "female"):
        raise ValueError(f"{who}: PESEL does not match the checksum, date of birth or sex")
    if not re.fullmatch(r"[0-9]{2}-[0-9]{3}", parent["postalCode"]):
        raise ValueError(f"{who}: postal code must be 00-000")


def pesel_valid(pesel, birth_date, sex=None):
    if not isinstance(pesel, str) or not re.fullmatch(r"[0-9]{11}", pesel):
        return False
    checksum = (10 - sum(w * int(d) for w, d in zip(PESEL_WEIGHTS, pesel)) % 10) % 10
    if checksum != int(pesel[10]) or pesel_birth_date(pesel) != birth_date:
        return False
    return sex not in ("female", "male") or (int(pesel[9]) % 2 == 0) == (sex == "female")


def check_child(child, who):
    """Dane dziecka zgodne z rejestrem: w drodze – bez ubezpieczenia/PESEL/aktu; urodzone – PESEL i akt; martwe – bez PESEL."""
    if child.get("status") == "expected":
        for key in ("insured", "pesel", "birthRegistry"):
            if key in child:
                raise ValueError(f"{who}: an unborn child cannot have {key}")
    elif child.get("loss"):
        if "insured" in child:
            raise ValueError(f"{who}: a lost child is not insured")
        if child["loss"].get("kind") == "stillbirth" and "pesel" in child:
            raise ValueError(f"{who}: a stillborn child has no PESEL")
    else:
        if not pesel_valid(child.get("pesel"), child.get("birthDate"), child.get("sex")):
            raise ValueError(f"{who}: PESEL missing or not matching the date of birth / sex")
        if not child.get("birthRegistry"):
            raise ValueError(f"{who}: birth certificate (birthRegistry) missing")


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
        me = profile["me"]
        for role, parent in (("me", me), ("partner", profile.get("partner"))):
            if parent is not None:
                check_identity(parent, f"{profile_id} {role}")
        for child in profile["children"]:
            check_child(child, f"{profile_id} {child.get('id')}")
        first_name = me["firstName"]
        label = f"{first_name} – {SCENARIOS.get(profile_id, slug)}"
        # Dane „z mObywatela” pokazywane przy logowaniu pochodzą z profilu (adres zamieszkania → miejscowość).
        mobywatel = {"firstName": first_name, "lastName": me["lastName"], "birthDate": me["birthDate"], "city": me["city"]}
        yield (profile_id, slug, label, profile_id == "P08",
               json.dumps(profile, ensure_ascii=False, allow_nan=False), json.dumps(mobywatel, ensure_ascii=False))


def build_db(source=DEFAULT_SOURCE, db=DEFAULT_DB):
    with closing(sqlite3.connect(db)) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        # The table is rebuilt from the export every time, so recreating it also migrates older files.
        conn.execute("DROP TABLE IF EXISTS demo_profiles")
        conn.execute("""
            CREATE TABLE demo_profiles (
                profile_id TEXT PRIMARY KEY NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                sensitive INTEGER NOT NULL CHECK(sensitive IN (0, 1)),
                profile_json TEXT NOT NULL,
                mobywatel_json TEXT NOT NULL
            )
        """)
        conn.executemany("INSERT INTO demo_profiles VALUES (?, ?, ?, ?, ?, ?)", read_rows(source))
        return conn.execute("SELECT COUNT(*) FROM demo_profiles").fetchone()[0]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    print(f"Imported {build_db(args.source, args.db)} demo profiles into {args.db}")
