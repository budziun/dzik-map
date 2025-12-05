#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Zastępuje wszystkie sklepy Stokrotka w bazie danymi z pliku CSV.
1. Usuwa rekordy z chain='stokrotka'
2. Wstawia wszystkie rekordy z CSV
"""

import argparse
from pathlib import Path
import pandas as pd
import psycopg2
import psycopg2.extras as extras


# ----------------------------------------------------------------------
def parse_args():
    p = argparse.ArgumentParser(
        description="Zastąp wszystkie sklepy Stokrotka danymi z CSV."
    )
    p.add_argument("--csv",      default="stokrotka_stores.csv",
                   help="Plik CSV ze sklepami Stokrotka")
    p.add_argument("--host",     default="localhost")
    p.add_argument("--db",       default="dzik_db")
    p.add_argument("--user",     default="dzik_user")
    p.add_argument("--password", default="django_dzik")
    p.add_argument("--chain",    default="stokrotka",
                   help="Wartość kolumny 'chain' usuwanej i wstawianej sieci")
    return p.parse_args()


# ----------------------------------------------------------------------
def delete_existing_chain(chain_name: str, conn):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM dzik_osmshop WHERE chain = %s;", (chain_name,))
        deleted = cur.rowcount
        conn.commit()
    return deleted


# ----------------------------------------------------------------------
def bulk_insert_new(df: pd.DataFrame, conn):
    insert_sql = """
        INSERT INTO dzik_osmshop
            (osm_id, name, chain, latitude, longitude, address,
             last_updated, is_active)
        VALUES
            (%(osm_id)s, %(name)s, %(chain)s, %(latitude)s, %(longitude)s,
             %(address)s, NOW(), %(is_active)s);
    """

    rows = []
    for _, row in df.iterrows():
        rows.append({
            "osm_id":   row["osm_id"],
            "name":     row["name"],
            "chain":    row["chain"],
            "latitude": None if pd.isna(row["latitude"])  else float(row["latitude"]),
            "longitude": None if pd.isna(row["longitude"]) else float(row["longitude"]),
            "address":  row["address"],
            "is_active": True
        })

    with conn.cursor() as cur:
        extras.execute_batch(cur, insert_sql, rows, page_size=1_000)
        inserted = len(rows)
        conn.commit()
    return inserted


# ----------------------------------------------------------------------
def main():
    args = parse_args()
    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise FileNotFoundError(f"Brak pliku {csv_path}")

    df = pd.read_csv(csv_path, encoding="utf-8").drop_duplicates(subset=["osm_id"])
    print(f"Wczytano {len(df):,} unikalnych sklepów z pliku {csv_path}")

    try:
        with psycopg2.connect(
            host=args.host,
            database=args.db,
            user=args.user,
            password=args.password
        ) as conn:

            print(f"Usuwam wszystkie sklepy chain = '{args.chain}' …")
            deleted = delete_existing_chain(args.chain, conn)
            print(f"✔ Usunięto {deleted:,} starych rekordów")

            print(f"Dodaję {len(df):,} nowych sklepów …")
            inserted = bulk_insert_new(df, conn)
            print(f"✔ Dodano {inserted:,} nowych rekordów")

            print("✔ Operacja zakończona pomyślnie!")
            print(f"  - Usunięto : {deleted:,}")
            print(f"  - Dodano   : {inserted:,}")

    except psycopg2.Error as e:
        print(f"Błąd bazy danych: {e}")
        raise


# ----------------------------------------------------------------------
if __name__ == "__main__":
    main()
