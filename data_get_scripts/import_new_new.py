# import_new_zabka_stores_final.py
import psycopg2
import csv
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'database': 'dzik_db',
    'user': '####',
    'password': '####'
}



def import_new_stores():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()

        # Przygotuj zapytanie INSERT z wszystkimi wymaganymi kolumnami
        insert_query = """
        INSERT INTO dzik_osmshop (osm_id, name, chain, latitude, longitude, address, last_updated, is_active, shop_template_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (osm_id) DO NOTHING
        """

        imported_count = 0
        error_count = 0
        duplicate_count = 0
        current_time = datetime.now()

        with open('arhelan_stores.csv', 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)

            for row_num, row in enumerate(reader, 1):
                try:
                    # Sprawdź czy rekord już istnieje
                    cursor.execute("SELECT COUNT(*) FROM dzik_osmshop WHERE osm_id = %s", (row['osm_id'],))
                    exists = cursor.fetchone()[0] > 0

                    if exists:
                        duplicate_count += 1
                        if duplicate_count <= 10:
                            print(f"Rekord {row['osm_id']} już istnieje - pomijam")
                        continue

                    # Przygotuj dane z wartościami domyślnymi dla wymaganych pól
                    address = row['address'] if row['address'] and row['address'] != 'Brak adresu' else 'Brak adresu'

                    # Wstaw nowy rekord ze wszystkimi wymaganymi polami
                    cursor.execute(insert_query, (
                        row['osm_id'],  # osm_id (NOT NULL)
                        row['name'],  # name (NOT NULL)
                        row['chain'],  # chain (NOT NULL)
                        float(row['latitude']),  # latitude (NOT NULL)
                        float(row['longitude']),  # longitude (NOT NULL)
                        address,  # address (NOT NULL) - używamy "Brak adresu" jeśli puste
                        current_time,  # last_updated (NOT NULL)
                        True,  # is_active (NOT NULL) - domyślnie True dla nowych sklepów
                        None  # shop_template_id (NULLABLE)
                    ))

                    imported_count += 1

                    if imported_count % 50 == 0:
                        print(f"Zaimportowano {imported_count} sklepów...")

                except psycopg2.Error as db_error:
                    error_count += 1
                    if error_count <= 5:
                        print(f"Błąd bazy danych dla rekordu {row['osm_id']}: {db_error}")
                    continue

                except Exception as e:
                    error_count += 1
                    if error_count <= 5:
                        print(f"Błąd dla rekordu {row['osm_id']} (wiersz {row_num}): {e}")
                        print(f"Dane: {row}")
                    continue

        print(f"\n=== PODSUMOWANIE ===")
        print(f"Pomyślnie zaimportowano: {imported_count} nowych sklepów")
        print(f"Duplikaty (pominięte): {duplicate_count}")
        print(f"Błędy: {error_count}")

        # Sprawdź ile z nowych sklepów ma adres
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN address != 'Brak adresu' THEN 1 END) as with_address,
                COUNT(CASE WHEN address = 'Brak adresu' THEN 1 END) as without_address
            FROM dzik_osmshop 
            WHERE last_updated >= %s
        """, (current_time.date(),))

        stats = cursor.fetchone()
        if stats:
            print(f"Z dziś zaimportowanych sklepów:")
            print(f"  - Z adresem: {stats[1]}")
            print(f"  - Bez adresu: {stats[2]}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Błąd główny: {e}")


if __name__ == "__main__":
    import_new_stores()
