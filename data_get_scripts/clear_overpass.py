#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ekstrahuje sklepy z pliku export.json (Overpass/OSM)
i zapisuje do pliku CSV w formacie:
id,osm_id,name,chain,latitude,longitude,address
"""

import json
import csv
from pathlib import Path

INPUT_FILE  = Path("export.json")          # źródło danych OSM
OUTPUT_CSV  = Path("arhelan_stores.csv") # wynikowy plik CSV
CHAIN_SLUG  = "arhelan"                  # wartość kolumny 'chain'
KEYWORD     = "Arhelan"                  # szukany fragment nazwy

# ------------------------------------------------------------------ #
def extract_address(tags: dict) -> str:
    """Buduje jedną zwięzłą kolumnę 'address'."""
    street = tags.get("addr:street", "")
    house  = tags.get("addr:housenumber", "")
    city   = tags.get("addr:city", "")
    parts  = [p for p in [f"{street} {house}".strip(), city] if p]
    return ", ".join(parts) if parts else ""

# ------------------------------------------------------------------ #
def main() -> None:
    with INPUT_FILE.open(encoding="utf-8") as fh:
        data = json.load(fh)

    rows = []
    for el in data.get("elements", []):
        name = el.get("tags", {}).get("name", "")
        if KEYWORD not in name:
            continue

        # współrzędne
        lat, lon = el.get("lat"), el.get("lon")
        if lat is None and el["type"] in {"way", "relation"} and "center" in el:
            lat = el["center"]["lat"]
            lon = el["center"]["lon"]

        address = extract_address(el.get("tags", {})) or "Brak adresu"

        rows.append({
            "osm_id"   : f'{el["type"]}/{el["id"]}',
            "name"     : name,
            "chain"    : CHAIN_SLUG,
            "latitude" : lat or "",
            "longitude": lon or "",
            "address"  : address
        })

    if not rows:
        print("⚠ Nie znaleziono obiektów")
        return

    fieldnames = ["id", "osm_id", "name", "chain", "latitude", "longitude", "address"]
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for idx, row in enumerate(rows, start=1):
            writer.writerow({"id": idx, **row})

    print(f"✔ Zapisano {len(rows)} rekordów do pliku {OUTPUT_CSV}")

# ------------------------------------------------------------------ #
if __name__ == "__main__":
    main()
