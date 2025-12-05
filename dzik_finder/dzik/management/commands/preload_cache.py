# dzik/management/commands/preload_cache.py

from django.core.management.base import BaseCommand
from dzik.views import preload_all_shops_to_cache

class Command(BaseCommand):
    help = 'Preloaduje wszystkie sklepy do cache'

    def handle(self, *args, **options):
        self.stdout.write('Rozpoczynam preloadowanie sklepów...')
        count = preload_all_shops_to_cache()
        self.stdout.write(
            self.style.SUCCESS(f'Pomyślnie preloadowano {count} sklepów do cache')
        )
