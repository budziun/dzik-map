# compare_zabka_stores.py
import csv
import pandas as pd


def compare_zabka_stores():
    try:
        # Wczytanie plików CSV
        print("Wczytywanie plików...")

        # Plik z bazy danych (istniejące sklepy)
        existing_stores = pd.read_csv('sklepy_zabka.csv')
        print(f"Sklepy z bazy: {len(existing_stores)} rekordów")

        # Plik z Overpass API (wszystkie sklepy)
        all_stores = pd.read_csv('zabka_stores.csv')
        print(f"Sklepy z Overpass API: {len(all_stores)} rekordów")

        # Sprawdzenie nazw kolumn
        print(f"Kolumny w sklepy_zabka.csv: {list(existing_stores.columns)}")
        print(f"Kolumny w zabka_stores.csv: {list(all_stores.columns)}")

        # Utworzenie set-ów z osm_id dla porównania
        existing_osm_ids = set(existing_stores['osm_id'].astype(str))
        all_osm_ids = set(all_stores['osm_id'].astype(str))

        # Znalezienie nowych sklepów (są w all_stores ale nie w existing_stores)
        new_osm_ids = all_osm_ids - existing_osm_ids

        print(f"\nZnaleziono {len(new_osm_ids)} nowych sklepów Żabka")

        if len(new_osm_ids) > 0:
            # Filtrowanie nowych sklepów
            new_stores = all_stores[all_stores['osm_id'].astype(str).isin(new_osm_ids)]

            # Eksport nowych sklepów do CSV
            new_stores.to_csv('nowe_sklepy_zabka.csv', index=False, encoding='utf-8')
            print(f"Nowe sklepy zapisane do: nowe_sklepy_zabka.csv")

            # Wyświetlenie kilku przykładów
            print("\nPrzykłady nowych sklepów:")
            print(new_stores[['osm_id', 'name']].head(10))

            # Statystyki
            print(f"\nStatystyki nowych sklepów:")
            print(f"- Łączna liczba nowych: {len(new_stores)}")
            if 'name' in new_stores.columns:
                unique_names = new_stores['name'].nunique()
                print(f"- Unikalne nazwy: {unique_names}")
        else:
            print("Wszystkie sklepy z Overpass API są już w bazie danych!")

        # Sprawdzenie czy są sklepy w bazie, których nie ma w Overpass
        missing_in_overpass = existing_osm_ids - all_osm_ids
        if len(missing_in_overpass) > 0:
            print(f"\nUwaga: {len(missing_in_overpass)} sklepów z bazy nie znaleziono w Overpass API")
            missing_stores = existing_stores[existing_stores['osm_id'].astype(str).isin(missing_in_overpass)]
            missing_stores.to_csv('sklepy_brakujace_w_overpass.csv', index=False, encoding='utf-8')
            print("Brakujące sklepy zapisane do: sklepy_brakujace_w_overpass.csv")

    except Exception as e:
        print(f"Błąd: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    compare_zabka_stores()
