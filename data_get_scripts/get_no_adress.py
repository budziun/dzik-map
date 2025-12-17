# export_empty_addresses.py
import psycopg2
import csv

# Konfiguracja bazy danych
DB_CONFIG = {
    'host': 'localhost',
    'database': 'dzik_db',
    'user': '####',
    'password': '####'
}


def export_shops_without_address():
    try:
        # Połączenie z bazą
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Zapytanie o sklepy bez adresu
        query = """
        SELECT id, osm_id, name, chain, latitude, longitude, address
        FROM dzik_osmshop 
        WHERE address IS NULL 
           OR address = '' 
           OR address = 'Brak adresu'
        ORDER BY id
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        print(f"Znaleziono {len(rows)} sklepów bez adresu")

        if len(rows) == 0:
            print("Brak rekordów do eksportu!")
            return

        # Eksport do CSV
        with open('sklepy_bez_adresu.csv', 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            # Nagłówki
            writer.writerow(['id', 'osm_id', 'name', 'chain', 'latitude', 'longitude', 'address'])

            # Dane
            for row in rows:
                writer.writerow(row)

        print(f"Eksport zakończony: sklepy_bez_adresu.csv")
        print(f"Wyeksportowano {len(rows)} rekordów")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Błąd: {e}")


if __name__ == "__main__":
    export_shops_without_address()
