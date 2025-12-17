import pandas as pd
import psycopg2


def update_addresses():
    # Wczytaj dane
    df = pd.read_csv('sklepy_adresy_clean.csv', encoding='utf-8')

    # Połączenie z bazą
    conn = psycopg2.connect(
        host="localhost",
        database="dzik_db",
        user="###",
        password="###"
    )

    cursor = conn.cursor()
    updated = 0

    print(f"Aktualizuję {len(df)} rekordów...")

    for _, row in df.iterrows():
        cursor.execute(
            "UPDATE dzik_osmshop SET address = %s WHERE id = %s",
            (row['address'], int(row['id']))
        )
        if cursor.rowcount > 0:
            updated += 1

        if updated % 100 == 0:
            print(f"Zaktualizowano {updated} rekordów...")

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Zakończono! Zaktualizowano {updated} adresów")


if __name__ == "__main__":
    update_addresses()
