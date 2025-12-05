import pandas as pd
import requests
import time
from concurrent.futures import ThreadPoolExecutor
import os
import csv


def get_address_geoapify(lat, lng, api_key):
    """Pobiera adres z Geoapify"""
    try:
        url = f"https://api.geoapify.com/v1/geocode/reverse"
        params = {
            'lat': lat,
            'lon': lng,
            'apiKey': api_key
        }

        response = requests.get(url, params=params, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data['features']:
                return data['features'][0]['properties']['formatted']
        return None

    except Exception as e:
        print(f"Błąd dla {lat}, {lng}: {e}")
        return None


def process_shop(row, geoapify_key):
    """Przetwarza jeden rekord sklepu"""
    lat, lng = row['latitude'], row['longitude']

    # Sprawdź czy współrzędne są prawidłowe
    if pd.isna(lat) or pd.isna(lng):
        return row['id'], row, "Brak współrzędnych"

    # Pobierz adres z Geoapify
    address = get_address_geoapify(lat, lng, geoapify_key)

    return row['id'], row, address or "Nie znaleziono adresu"


def save_result_to_csv(row, new_address, output_file):
    """Zapisuje wynik do CSV"""
    # Skopiuj wszystkie dane z oryginalnego wiersza
    result_row = row.copy()
    result_row['new_address'] = new_address

    # Sprawdź czy plik istnieje
    file_exists = os.path.exists(output_file)

    with open(output_file, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = list(result_row.index)
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        # Zapisz nagłówek tylko jeśli plik nie istnieje
        if not file_exists:
            writer.writeheader()

        # Zapisz wiersz
        writer.writerow(result_row.to_dict())


def main():
    # Wczytaj dane
    try:
        df = pd.read_csv('sklepy_bez_adresu.csv', encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv('sklepy_bez_adresu.csv', encoding='cp1250', errors='replace')

    # DODAJ TE LINIE:
    MAX_RECORDS = 500
    df = df.head(MAX_RECORDS)

    print(f"Wczytano {len(df)} rekordów (ograniczono do {MAX_RECORDS})")

    # Klucz API Geoapify
    GEOAPIFY_KEY = "6e09231231f44fa0956d2dcf0aab2404"

    output_file = 'sklepy_z_adresami_live.csv'

    # Usuń plik wyjściowy jeśli istnieje (żeby zacząć od nowa)
    if os.path.exists(output_file):
        os.remove(output_file)

    processed = 0
    success_count = 0
    batch_size = 50  # Zmniejszony batch dla lepszego rate limiting

    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:i + batch_size]
        print(f"Przetwarzam batch {i // batch_size + 1}/{(len(df) - 1) // batch_size + 1}")

        # Przetwarzanie pojedynczo (bez ThreadPoolExecutor dla lepszej kontroli)
        for _, row in batch.iterrows():
            try:
                shop_id, original_row, new_address = process_shop(row, GEOAPIFY_KEY)

                # Zapisz od razu do CSV
                save_result_to_csv(original_row, new_address, output_file)

                processed += 1

                if new_address not in ["Nie znaleziono adresu", "Brak współrzędnych"]:
                    success_count += 1

                # Pokazuj postęp co 10 rekordów
                if processed % 10 == 0:
                    print(
                        f"Przetworzono {processed}/{len(df)} | Udane: {success_count} ({success_count / processed * 100:.1f}%)")

                # Rate limiting - 1 zapytanie na sekundę
                time.sleep(1)

            except Exception as e:
                print(f"Błąd przetwarzania rekordu {row['id']}: {e}")
                # Zapisz rekord z błędem
                save_result_to_csv(row, "Błąd przetwarzania", output_file)
                processed += 1

        print(f"Ukończono batch {i // batch_size + 1}")

    # Statystyki końcowe
    print(f"\nZakończono!")
    print(f"Przetworzono rekordów: {processed}/{len(df)}")
    print(f"Uzupełniono adresów: {success_count}")
    print(f"Procent sukcesu: {success_count / processed * 100:.1f}%")
    print(f"Wyniki zapisane w: {output_file}")


if __name__ == "__main__":
    main()
