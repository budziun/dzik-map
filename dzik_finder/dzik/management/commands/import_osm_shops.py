# dzik/management/commands/import_osm_shops.py
from django.core.management.base import BaseCommand
from django.db import transaction
import requests
import time
from dzik.models import OSMShop, Shop


class Command(BaseCommand):
    help = 'Import shops from OpenStreetMap'

    def add_arguments(self, parser):
        parser.add_argument('--region', type=str, default='warszawa')
        parser.add_argument('--test-run', action='store_true', help='Test with limited data')

    def handle(self, *args, **options):
        region = options['region']
        test_run = options['test_run']

        regions = {
            'warszawa': (52.14, 20.87, 52.37, 21.27),  # Szerszy obszar
            'krakow': (49.9, 19.8, 50.1, 20.2),
            'poland': (49.0, 14.1, 55.0, 24.2),
        }

        if region not in regions:
            self.stdout.write(self.style.ERROR(f'Nieznany region: {region}'))
            return

        self.import_shops_for_region(regions[region], test_run)

    def import_shops_for_region(self, bounds, test_run=False):
        south, west, north, east = bounds

        if test_run:
            timeout = 60
            # Dla testu używaj mniejszego obszaru
            center_lat = (south + north) / 2
            center_lon = (west + east) / 2
            south = center_lat - 0.05  # ~5km od centrum
            north = center_lat + 0.05
            west = center_lon - 0.05
            east = center_lon + 0.05
        else:
            timeout = 120

        # DOKŁADNIE TAKIE SAMO ZAPYTANIE JAK W OVERPASS TURBO
        overpass_query = f"""
        [out:json][timeout:{timeout}];
        (
          node["shop"]["name"~"Lidl|Biedronka|Żabka|Dino|Stokrotka|Intermarché|Topaz|Twój Market|Dealz|Carrefour",i]({south},{west},{north},{east});
          way["shop"]["name"~"Lidl|Biedronka|Kaufland|Aldi|Dino|Intermarché|Topaz|Twój Market|Carrefour",i]({south},{west},{north},{east});
        );
        out center;
        """

        self.fetch_and_save_shops(overpass_query)

    def fetch_and_save_shops(self, query):
        overpass_url = "https://overpass-api.de/api/interpreter"

        # Alternatywne serwery w przypadku problemów
        backup_servers = [
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.openstreetmap.ru/cgi/interpreter"
        ]

        for attempt, server_url in enumerate([overpass_url] + backup_servers):
            try:
                self.stdout.write(f'Próba {attempt + 1}: Pobieranie z {server_url}...')

                # Dodaj headers żeby wyglądać jak normalny browser
                headers = {
                    'User-Agent': 'Mozilla/5.0 (compatible; OSM shop importer)'
                }

                response = requests.post(
                    server_url,
                    data=query,
                    timeout=600,
                    headers=headers
                )
                response.raise_for_status()

                # Sprawdź czy odpowiedź to JSON
                try:
                    data = response.json()
                except ValueError:
                    self.stdout.write(f'BŁĄD: Nieprawidłowa odpowiedź JSON z {server_url}')
                    self.stdout.write(f'Treść odpowiedzi: {response.text[:500]}...')
                    continue

                # DEBUGGING - ile elementów otrzymano
                elements_count = len(data.get("elements", []))
                self.stdout.write(f'DEBUG: Otrzymano {elements_count} elementów z API')

                if elements_count == 0:
                    self.stdout.write('UWAGA: Brak wyników - może problem z zapytaniem lub obszarem')
                    # Sprawdź czy są błędy w odpowiedzi API
                    if 'remark' in data:
                        self.stdout.write(f'API remark: {data["remark"]}')
                    if 'generator' in data:
                        self.stdout.write(f'Generator: {data["generator"]}')

                break  # Success - wyjdź z pętli

            except requests.exceptions.Timeout:
                self.stdout.write(f'BŁĄD: Timeout dla {server_url}')
                if attempt < len(backup_servers):
                    self.stdout.write('Próbuję alternatywny serwer...')
                    time.sleep(2)
                    continue
                else:
                    self.stdout.write(self.style.ERROR('Wszystkie serwery niedostępne'))
                    return

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Błąd API ({server_url}): {e}'))
                if attempt < len(backup_servers):
                    self.stdout.write('Próbuję alternatywny serwer...')
                    time.sleep(2)
                    continue
                else:
                    return

        imported = 0
        updated = 0
        processed = 0

        with transaction.atomic():
            for element in data.get("elements", []):
                processed += 1

                # DEBUG - co przetwarzamy
                element_name = element.get("tags", {}).get("name", "BRAK_NAZWY")
                self.stdout.write(f'DEBUG: [{processed}] Przetwarzam: {element_name}')

                try:
                    shop_data = self.extract_shop_data(element)
                    if not shop_data:
                        self.stdout.write(f'DEBUG: [{processed}] Brak danych - pomijam')
                        continue

                    # DEBUG - co zapisujemy
                    self.stdout.write(f'DEBUG: [{processed}] Zapisuję: {shop_data["name"]} ({shop_data["chain"]})')

                    shop, created = OSMShop.objects.update_or_create(
                        osm_id=shop_data['osm_id'],
                        defaults=shop_data
                    )

                    if created:
                        imported += 1
                        self.stdout.write(f'DEBUG: [{processed}] ✓ DODANO: {shop_data["name"]}')
                    else:
                        updated += 1
                        self.stdout.write(f'DEBUG: [{processed}] ↻ ZAKTUALIZOWANO: {shop_data["name"]}')

                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'DEBUG: [{processed}] BŁĄD: {e}'))
                    continue

        self.stdout.write(
            f'DEBUG: PODSUMOWANIE - Przetworzono: {processed}, Dodano: {imported}, Zaktualizowano: {updated}')
        self.stdout.write(
            self.style.SUCCESS(f'Import zakończony! Dodano: {imported}, Zaktualizowano: {updated}')
        )

    def extract_shop_data(self, element):
        # DEBUG - podstawowe info
        element_id = element.get('id')
        element_type = element.get('type')

        # Wyciągnij współrzędne
        if element["type"] == "way":
            if "center" not in element:
                self.stdout.write(f'DEBUG: Brak center dla way {element_id}')
                return None
            lat = element["center"]["lat"]
            lon = element["center"]["lon"]
        else:
            lat = element.get("lat")
            lon = element.get("lon")

        if not (lat and lon):
            self.stdout.write(f'DEBUG: Brak współrzędnych dla {element_type}{element_id}')
            return None

        tags = element.get("tags", {})
        name = tags.get("name", "")

        if not name:
            self.stdout.write(f'DEBUG: Brak nazwy dla {element_type}{element_id}')
            return None

        # DEBUG - nazwa
        self.stdout.write(f'DEBUG: Nazwa sklepu: "{name}"')

        chain = self.detect_chain(name)
        self.stdout.write(f'DEBUG: Wykryta sieć: "{chain}"')

        address = self.build_address(tags)
        self.stdout.write(f'DEBUG: Adres: "{address}"')

        # Znajdź szablon sieci - BEZPIECZNIEJ
        shop_template = Shop.objects.filter(chain=chain, is_template=True).first()

        if shop_template:
            self.stdout.write(f'DEBUG: ✓ Znaleziono szablon dla "{chain}"')
        else:
            self.stdout.write(f'DEBUG: ✗ BRAK szablonu dla "{chain}"')

        return {
            'osm_id': f"{element['type']}{element['id']}",
            'name': name,
            'chain': chain,
            'latitude': lat,
            'longitude': lon,
            'address': address,
            'shop_template': shop_template,
            'is_active': True
        }

    def detect_chain(self, name):
        name_lower = name.lower()
        mapping = {
            'zabka': ['żabka', 'zabka'],
            'biedronka': ['biedronka'],
            'lidl': ['lidl'],
            'dino': ['dino'],
            'kaufland': ['kaufland'],
            'aldi': ['aldi'],
            'inter': ['intermarché', 'intermarche'],
            'stokrotka': ['stokrotka'],
            'topaz': ['topaz'],
            'dealz': ['dealz'],
            'carrefour': ['carrefour', 'carrefour express'],
            'twoj_market': ['twój market', 'twoj market']
        }

        for chain_id, keywords in mapping.items():
            if any(keyword in name_lower for keyword in keywords):
                return chain_id

        return 'other'

    def build_address(self, tags):
        parts = []
        place = tags.get("addr:place", "").strip()
        street = tags.get("addr:street", "").strip()
        housenumber = tags.get("addr:housenumber", "").strip()

        if place and housenumber:
            parts.append(f"{place} {housenumber}")
        elif street and housenumber:
            parts.append(f"{street} {housenumber}")
        elif place:
            parts.append(place)
        elif street:
            parts.append(street)

        city = tags.get("addr:city", "").strip()
        if city and city.lower() != (place.lower() if place else ""):
            parts.append(city)

        return ", ".join(parts) if parts else "Brak adresu"