# export_zabka_shops.py
import psycopg2
import csv

# Konfiguracja bazy danych
DB_CONFIG = {
    'host': 'localhost',
    'database': 'dzik_db',
    'user': 'dzik_user',
    'password': 'django_dzik'
}


def export_zabka_shops():
    try:
        # Połączenie z bazą
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Zapytanie o wszystkie sklepy Żabka (różne warianty pisowni)
        query = """
        SELECT id, osm_id, name, chain, latitude, longitude, address
        FROM dzik_osmshop 
        WHERE LOWER(name) LIKE '%żabka%' 
           OR LOWER(name) LIKE '%zabka%'
           OR LOWER(chain) LIKE '%żabka%'
           OR LOWER(chain) LIKE '%zabka%'
        ORDER BY id
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        print(f"Znaleziono {len(rows)} sklepów Żabka")

        if len(rows) == 0:
            print("Brak rekordów do eksportu!")
            return

        # Eksport do CSV
        with open('sklepy_zabka.csv', 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            # Nagłówki
            writer.writerow(['id', 'osm_id', 'name', 'chain', 'latitude', 'longitude', 'address'])

            # Dane
            for row in rows:
                writer.writerow(row)

        print(f"Eksport zakończony: sklepy_zabka.csv")
        print(f"Wyeksportowano {len(rows)} rekordów")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Błąd: {e}")


if __name__ == "__main__":
    export_zabka_shops()
