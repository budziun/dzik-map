from django.core.management.base import BaseCommand
from django.db import transaction
import json
from dzik.models import OSMShop, Shop


class Command(BaseCommand):
    help = 'Import shops from GeoJSON file'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, help='Path to GeoJSON file')
        parser.add_argument('--clear', action='store_true', help='Clear existing data')

    def handle(self, *args, **options):
        file_path = options['file']
        clear_data = options['clear']

        if clear_data:
            OSMShop.objects.all().delete()
            self.stdout.write('Wyczyszczono istniejące dane')

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'Nie znaleziono pliku: {file_path}'))
            return

        imported = 0
        skipped = 0

        with transaction.atomic():
            for feature in data.get('features', []):
                try:
                    # Wyciągnij dane z GeoJSON
                    geometry = feature.get('geometry', {})
                    properties = feature.get('properties', {})

                    if geometry.get('type') != 'Point':
                        skipped += 1
                        continue

                    coordinates = geometry.get('coordinates', [])
                    if len(coordinates) != 2:
                        skipped += 1
                        continue

                    lon, lat = coordinates
                    name = properties.get('name', '')
                    osm_id = properties.get('@id', f"unknown_{imported}")

                    if not name:
                        skipped += 1
                        continue

                    # Wykryj sieć
                    chain = self.detect_chain(name)

                    # Znajdź szablon
                    shop_template = Shop.objects.filter(
                        chain=chain, is_template=True
                    ).first()

                    # Buduj adres
                    address = self.build_address_from_properties(properties)

                    # Zapisz sklep
                    shop, created = OSMShop.objects.update_or_create(
                        osm_id=osm_id,
                        defaults={
                            'name': name,
                            'chain': chain,
                            'latitude': lat,
                            'longitude': lon,
                            'address': address,
                            'shop_template': shop_template,
                            'is_active': True
                        }
                    )

                    if created:
                        imported += 1
                        if imported % 100 == 0:
                            self.stdout.write(f'Zaimportowano {imported} sklepów...')

                except Exception as e:
                    self.stdout.write(f'Błąd przetwarzania: {e}')
                    skipped += 1
                    continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Import zakończony! Dodano: {imported}, Pominięto: {skipped}'
            )
        )

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

    def build_address_from_properties(self, properties):
        # Spróbuj zbudować adres z dostępnych właściwości
        address_parts = []

        street = properties.get('addr:street', '')
        housenumber = properties.get('addr:housenumber', '')
        place = properties.get('addr:place', '')
        city = properties.get('addr:city', '')

        if place and housenumber:
            address_parts.append(f"{place} {housenumber}")
        elif street and housenumber:
            address_parts.append(f"{street} {housenumber}")
        elif place:
            address_parts.append(place)
        elif street:
            address_parts.append(street)

        if city:
            address_parts.append(city)

        return ", ".join(address_parts) if address_parts else "Brak adresu"
