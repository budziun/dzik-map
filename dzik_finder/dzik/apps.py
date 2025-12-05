# dzik/apps.py

from django.apps import AppConfig
import os


class DzikConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dzik'

    def ready(self):
        # Tylko przy pierwszym uruchomieniu (nie przy migrate, shell itp.)
        if os.environ.get('RUN_MAIN') == 'true':
            self.preload_cache_on_startup()

    def preload_cache_on_startup(self):
        try:
            from .views import preload_all_shops_to_cache
            from django.core.cache import cache

            # Sprawdź czy cache już istnieje
            if cache.get('ALL_SHOPS_PRELOADED'):
                print("✅ Cache już załadowany - pomijam preload")
                return

            print("🚀 Automatyczne ładowanie cache przy starcie serwera...")
            count = preload_all_shops_to_cache()
            print(f"✅ Automatycznie załadowano {count} sklepów do cache!")

        except Exception as e:
            print(f"⚠️ Błąd podczas automatycznego preloadu: {e}")
