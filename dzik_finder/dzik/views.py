# dzik/views.py

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from django.shortcuts import render, redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.db.models import Q
from django.views.decorators.http import require_http_methods
from django.template.loader import render_to_string
from django.middleware.csrf import get_token
import requests
import json
import math
import time
from .models import Shop, Product, ProductShopRelation, OSMShop, UserReport
from django.views.decorators.csrf import ensure_csrf_cookie


def build_address(tags):
    """Buduje adres z dostępnych składników OpenStreetMap - ulepszona wersja"""
    address_parts = []
    place = tags.get("addr:place", "").strip()
    street = tags.get("addr:street", "").strip()
    housenumber = tags.get("addr:housenumber", "").strip()

    if place and housenumber:
        address_parts.append(f"{place} {housenumber}")
    elif street and housenumber:
        address_parts.append(f"{street} {housenumber}")
    elif place:
        address_parts.append(place)
    elif street:
        address_parts.append(street)
    elif housenumber:
        address_parts.append(housenumber)

    city = tags.get("addr:city", "").strip()
    if city and city.lower() != place.lower():
        address_parts.append(city)

    if not address_parts:
        full_addr = tags.get("addr:full", "").strip()
        if full_addr:
            return full_addr
        return "Brak adresu"

    return ", ".join(address_parts)


def calculateDynamicRadius(zoom):
    """Oblicza dynamiczny promień na podstawie zoom"""
    if zoom >= 17: return 5_000
    if zoom >= 16: return 11_000
    if zoom >= 14: return 30_000
    if zoom >= 12: return 80_000
    if zoom >= 10: return 100_000
    if zoom >= 8: return 150_000
    if zoom >= 6: return 300_000
    return 10_000_000


def calculate_distance(lat1, lon1, lat2, lon2):
    """Oblicza odległość w metrach między dwoma punktami używając wzoru Haversine"""
    R = 6371000
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = (math.sin(delta_lat / 2) * math.sin(delta_lat / 2) +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) * math.sin(delta_lon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance


def preload_all_shops_to_cache():
    """Ładuje wszystkie sklepy do cache w tle"""
    try:
        print("Preloadowanie wszystkich sklepów do cache...")
        shops_qs = OSMShop.objects.filter(is_active=True).select_related('shop_template')
        shops = list(shops_qs)

        all_shops_data = []
        for shop in shops:
            products = []
            logo_url = None
            if shop.shop_template:
                products = [{
                    'id': p.id,
                    'name': p.name,
                    'flavor': p.flavor,
                    'photo_url': p.get_photo_url(),
                    'category': p.category
                } for p in shop.shop_template.featured_products.all()]
                logo_url = shop.shop_template.logo.url if shop.shop_template.logo else None

            shop_data = {
                'name': shop.name,
                'chain': shop.chain,
                'address': shop.address,
                'lat': float(shop.latitude),
                'lon': float(shop.longitude),
                'products': products,
                'logo_url': logo_url
            }
            all_shops_data.append(shop_data)

        cache.set('ALL_SHOPS_PRELOADED', all_shops_data, 6 * 60 * 60)
        cache.set('ALL_SHOPS_LAST_UPDATE', int(time.time()), 6 * 60 * 60)
        print(f"Preloadowano {len(all_shops_data)} sklepów do cache")
        return len(all_shops_data)
    except Exception as e:
        print(f"Błąd preloadowania: {e}")
        return 0


@csrf_exempt
def smart_shops(request):
    """Inteligentny endpoint - zwraca sklepy dla konkretnego obszaru z preloadowanego cache"""
    try:
        lat = float(request.GET.get('lat', 52.0))
        lon = float(request.GET.get('lon', 19.5))
        zoom = int(request.GET.get('zoom', 10))
        radius = int(request.GET.get('radius', calculateDynamicRadius(zoom)))

        user_lat = request.GET.get('user_lat')
        user_lon = request.GET.get('user_lon')

        all_shops = cache.get('ALL_SHOPS_PRELOADED')
        if not all_shops:
            print("Cache pusty - preloaduję sklepy...")
            preload_all_shops_to_cache()
            all_shops = cache.get('ALL_SHOPS_PRELOADED', [])

        user_location = None
        if user_lat and user_lon:
            user_location = {'lat': float(user_lat), 'lon': float(user_lon)}

        filtered_shops = []
        for shop in all_shops:
            distance = calculate_distance(lat, lon, shop['lat'], shop['lon'])
            if distance <= radius:
                shop_copy = shop.copy()
                shop_copy['distance'] = round(distance)
                if user_location:
                    user_distance = calculate_distance(
                        user_location['lat'], user_location['lon'],
                        shop['lat'], shop['lon']
                    )
                    shop_copy['distance_from_user'] = round(user_distance)
                filtered_shops.append(shop_copy)

        if user_location:
            filtered_shops.sort(key=lambda x: x.get('distance_from_user', float('inf')))
        else:
            filtered_shops.sort(key=lambda x: x['distance'])

        if zoom >= 15:
            limit = 500
        elif zoom >= 12:
            limit = 1000
        else:
            limit = 2000

        filtered_shops = filtered_shops[:limit]

        result = {
            'shops': filtered_shops,
            'user_location': user_location,
            'center_location': {'lat': lat, 'lon': lon},
            'total_found': len(filtered_shops),
            'total_cached': len(all_shops),
            'zoom_level': zoom,
            'radius_used': radius,
            'cached': True,
            'source': 'smart_cache'
        }

        return JsonResponse(result)

    except (ValueError, TypeError) as e:
        return JsonResponse({'error': f'Błędne parametry: {str(e)}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Błąd serwera: {str(e)}'}, status=500)


@csrf_exempt
def all_shops(request):
    """Zwraca WSZYSTKIE sklepy OSM od razu - teraz z cache"""
    try:
        user_lat = request.GET.get('user_lat')
        user_lon = request.GET.get('user_lon')

        all_shops = cache.get('ALL_SHOPS_PRELOADED')
        if not all_shops:
            print("Cache pusty - preloaduję sklepy...")
            preload_all_shops_to_cache()
            all_shops = cache.get('ALL_SHOPS_PRELOADED', [])

        user_location = None
        if user_lat and user_lon:
            user_location = {'lat': float(user_lat), 'lon': float(user_lon)}

            shops_with_distance = []
            for shop in all_shops:
                shop_copy = shop.copy()
                distance = calculate_distance(
                    user_location['lat'], user_location['lon'],
                    shop['lat'], shop['lon']
                )
                shop_copy['distance_from_user'] = round(distance)
                shops_with_distance.append(shop_copy)

            shops_with_distance.sort(key=lambda x: x['distance_from_user'])
            all_shops = shops_with_distance

        result = {
            'shops': all_shops,
            'user_location': user_location,
            'total_found': len(all_shops),
            'cached': True,
            'source': 'preloaded_cache',
            'last_update': cache.get('ALL_SHOPS_LAST_UPDATE')
        }

        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({'error': f'Błąd: {str(e)}'}, status=500)


@staff_member_required
def force_preload_cache(request):
    """Endpoint do ręcznego przeładowania cache"""
    count = preload_all_shops_to_cache()
    return JsonResponse({
        'success': True,
        'message': f'Przeładowano {count} sklepów do cache',
        'timestamp': cache.get('ALL_SHOPS_LAST_UPDATE')
    })


@csrf_exempt
def nearest_shops(request):
    """Zwraca najbliższe sklepy z lokalnej bazy danych OSMShop"""
    try:
        lat = float(request.GET['lat'])
        lon = float(request.GET['lon'])
        zoom = int(request.GET.get('zoom', 13))
        radius = int(request.GET.get('radius', 2000))
        no_cache = request.GET.get('no_cache', 'false').lower() == 'true'

        user_lat = request.GET.get('user_lat')
        user_lon = request.GET.get('user_lon')
    except (KeyError, ValueError):
        return JsonResponse({'error': 'Podaj prawidłowe lat i lon jako liczby'}, status=400)

    user_location = None
    if user_lat and user_lon:
        try:
            user_location = {'lat': float(user_lat), 'lon': float(user_lon)}
        except ValueError:
            pass

    if not (-90 <= lat <= 90):
        return JsonResponse({'error': 'Szerokość geograficzna musi być między -90 a 90'}, status=400)
    if not (-180 <= lon <= 180):
        return JsonResponse({'error': 'Długość geograficzna musi być między -180 a 180'}, status=400)
    if not (100 <= radius <= 10000000):
        return JsonResponse({'error': 'Promień musi być między 100m a 60km'}, status=400)

    filter_products = request.GET.get('products', '').strip()
    wanted_flavors = []
    if filter_products:
        wanted_flavors = [f.strip().lower() for f in filter_products.split(',')]

    cache_lat = round(lat, 3)
    cache_lon = round(lon, 3)
    user_cache_key = ""
    if user_location:
        user_cache_key = f"_user_{round(user_location['lat'], 3)}_{round(user_location['lon'], 3)}"

    cache_key = f"local_shops_{cache_lat}_{cache_lon}_{zoom}_{radius}_{hash(filter_products)}{user_cache_key}"

    if zoom >= 15:
        cache_time = 5 * 60
    elif zoom >= 12:
        cache_time = 15 * 60
    else:
        cache_time = 30 * 60

    if not no_cache:
        cached_result = cache.get(cache_key)
        if cached_result:
            cached_result['cached'] = True
            cached_result['zoom_level'] = zoom
            cached_result['radius_used'] = radius
            return JsonResponse(cached_result)

    lat_range = radius / 111000
    lon_range = radius / (111000 * math.cos(math.radians(lat)))

    shops_qs = OSMShop.objects.filter(
        latitude__range=(lat - lat_range, lat + lat_range),
        longitude__range=(lon - lon_range, lon + lon_range),
        is_active=True
    ).select_related('shop_template')

    if wanted_flavors:
        shops_qs = shops_qs.filter(
            shop_template__productshoprelation__product__flavor__icontains=wanted_flavors[0]
        ).distinct()

    limit = 2500
    shops = list(shops_qs[:limit])

    result = []
    for shop in shops:
        distance_from_center = calculate_distance(lat, lon, float(shop.latitude), float(shop.longitude))

        if distance_from_center > radius:
            continue

        distance_from_user = None
        if user_location:
            distance_from_user = calculate_distance(
                user_location['lat'], user_location['lon'],
                float(shop.latitude), float(shop.longitude)
            )

        products = []
        logo_url = None
        if shop.shop_template:
            products = [{
                'id': p.id,
                'name': p.name,
                'flavor': p.flavor,
                'photo_url': p.get_photo_url(),
                'category': p.category
            } for p in shop.shop_template.featured_products.all()]
            logo_url = shop.shop_template.logo.url if shop.shop_template.logo else None

        shop_data = {
            'name': shop.name,
            'chain': shop.chain,
            'address': shop.address,
            'lat': float(shop.latitude),
            'lon': float(shop.longitude),
            'distance': round(distance_from_center),
            'distance_from_user': round(distance_from_user) if distance_from_user else None,
            'products': products,
            'logo_url': logo_url
        }
        result.append(shop_data)

    if user_location:
        result.sort(key=lambda x: x['distance_from_user'] or float('inf'))
    else:
        result.sort(key=lambda x: x['distance'])

    final_result = {
        'shops': result,
        'user_location': {'lat': lat, 'lon': lon},
        'filter_applied': bool(wanted_flavors),
        'cached': False,
        'zoom_level': zoom,
        'radius_used': radius,
        'total_found': len(result),
        'cache_time': cache_time,
        'source': 'local_database'
    }

    cache.set(cache_key, final_result, cache_time)
    return JsonResponse(final_result)


@csrf_exempt
def geocode_city(request):
    """Zamienia nazwę miasta na współrzędne"""
    city = request.GET.get('city', '').strip()
    if not city:
        return JsonResponse({'error': 'Podaj nazwę miasta'}, status=400)

    cache_key = f"geocode_{city.lower().replace(' ', '_')}"
    cached_coords = cache.get(cache_key)
    if cached_coords:
        return JsonResponse(cached_coords)

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                'q': f"{city}, Poland",
                'format': 'json',
                'limit': 1,
                'countrycodes': 'pl',
                'featuretype': 'city',
                'addressdetails': 1,
            },
            timeout=10,
            headers={'User-Agent': 'DzikFinder/1.0'}
        )

        response.raise_for_status()
        data = response.json()

        if not data:
            return JsonResponse({'error': 'Nie znaleziono miasta dla podanej nazwy'}, status=404)

        first_result = data[0]
        result = {
            'city': city,
            'lat': float(first_result['lat']),
            'lon': float(first_result['lon']),
            'display_name': first_result.get('display_name', city)
        }

        cache.set(cache_key, result, 86400 * 7)
        return JsonResponse(result)

    except requests.RequestException as e:
        print(f"Błąd zapytania do Nominatim: {e}")
        return JsonResponse({'error': f'Błąd serwisu geocoding: {str(e)}'}, status=500)
    except (IndexError, KeyError, ValueError) as e:
        print(f"Błąd przetwarzania odpowiedzi z Nominatim: {e}")
        return JsonResponse({'error': 'Nieprawidłowy format odpowiedzi z serwisu geocoding'}, status=500)


@staff_member_required
def multi_product_selector(request):
    """Widok do wyboru wielu produktów"""
    if request.method == 'POST':
        selected_products = request.POST.getlist('selected_items')
        target_shops = request.POST.getlist('target_shops')

        if selected_products and target_shops:
            products = Product.objects.filter(id__in=selected_products)
            shops = Shop.objects.filter(id__in=target_shops)
            count = 0
            for product in products:
                for shop in shops:
                    obj, created = ProductShopRelation.objects.get_or_create(
                        product=product, shop=shop
                    )
                    if created:
                        count += 1
            messages.success(request, f'Dodano {count} nowych połączeń!')
            return redirect('admin:dzik_product_changelist')

    products = Product.objects.filter(is_active=True).order_by('category', 'name')
    return render(request, 'admin/multi_selector.html', {
        'title': 'Wybierz produkty do dodania',
        'products': products,
        'item_type': 'product',
        'submit_text': 'Przejdź do wyboru sklepów',
        'cancel_url': '/admin/dzik/product/',
    })


@staff_member_required
def multi_shop_selector(request):
    """Widok do wyboru wielu sklepów"""
    if request.method == 'POST':
        selected_shops = request.POST.getlist('selected_items')
        target_products = request.POST.getlist('target_products')

        if selected_shops and target_products:
            shops = Shop.objects.filter(id__in=selected_shops)
            products = Product.objects.filter(id__in=target_products)
            count = 0
            for shop in shops:
                for product in products:
                    obj, created = ProductShopRelation.objects.get_or_create(
                        product=product, shop=shop
                    )
                    if created:
                        count += 1
            messages.success(request, f'Dodano {count} nowych połączeń!')
            return redirect('admin:dzik_shop_changelist')

    shops = Shop.objects.filter(is_template=True).order_by('chain')
    return render(request, 'admin/multi_selector.html', {
        'title': 'Wybierz sklepy do dodania',
        'shops': shops,
        'item_type': 'shop',
        'submit_text': 'Przejdź do wyboru produktów',
        'cancel_url': '/admin/dzik/shop/',
    })


@csrf_exempt
@staff_member_required
def toggle_product(request):
    """AJAX endpoint do przełączania produktów w sklepach"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Tylko POST'})

    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        shop_id = data.get('shop_id')
        action = data.get('action')

        if not all([product_id, shop_id, action]):
            return JsonResponse({'success': False, 'message': 'Brak wymaganych parametrów'})

        product = Product.objects.get(id=product_id)
        shop = Shop.objects.get(id=shop_id)

        if action == 'add':
            obj, created = ProductShopRelation.objects.get_or_create(
                product=product, shop=shop
            )
            message = f'Dodano {product.name} do {shop.get_chain_display()}'
        elif action == 'remove':
            deleted_count, _ = ProductShopRelation.objects.filter(
                product=product, shop=shop
            ).delete()
            message = f'Usunięto {product.name} z {shop.get_chain_display()}' if deleted_count else 'Relacja już nie istniała'
        else:
            return JsonResponse({'success': False, 'message': 'Nieprawidłowa akcja'})

        return JsonResponse({'success': True, 'message': message})

    except Product.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Nie znaleziono produktu'})
    except Shop.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Nie znaleziono sklepu'})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Nieprawidłowy format JSON'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Błąd serwera: {str(e)}'})


def detect_chain_from_tags(tags):
    """Rozpoznaje sieć sklepu na podstawie tagów OpenStreetMap"""
    name = tags.get("name", "").lower()
    chain_mapping = {
        'zabka': ['żabka', 'zabka'],
        'biedronka': ['biedronka'],
        'lidl': ['lidl'],
        'carrefour': ['Carrefour', 'Carrefour Market', 'carrefour', 'carrefour market'],
        'dealz': ['Dealz', 'dealz'],
        'kaufland': ['kaufland'],
        'aldi': ['aldi'],
        'inter': ['intermarché', 'intermarche'],
        'dino': ['dino'],
        'stokrotka': ['stokrotka'],
        'topaz': ['topaz'],
        'twoj_market': ['twój market', 'twoj market'],
        'auchan': ['auchan'],
        'selgros': ['selgros'],
        'eurocash': ['eurocash', 'eurocash cash&carry', 'eurocash cash & carry'],
        'bp': ['bp', 'british petroleum'],
        'circle_k': ['circle k', 'circle-k', 'circlek'],
        'arhelan': ['arhelan']
    }

    for chain_id, chain_names in chain_mapping.items():
        if any(chain_name in name for chain_name in chain_names):
            return chain_id

    return 'other'


def clear_shops_cache():
    """Czyści cache sklepów"""
    cache_keys = []
    try:
        if hasattr(cache, '_cache') and hasattr(cache._cache, 'keys'):
            cache_keys = [key.decode() for key in cache._cache.keys('ALL_SHOPS_*')]
            cache_keys.extend([key.decode() for key in cache._cache.keys('all_shops_*')])
            cache_keys.extend([key.decode() for key in cache._cache.keys('local_shops_*')])
            cache_keys.extend([key.decode() for key in cache._cache.keys('shops_*')])
    except:
        pass

    for key in cache_keys:
        cache.delete(key)
    return len(cache_keys)


def get_cache_stats():
    """Zwraca statystyki cache'a"""
    try:
        cache_info = {
            'cache_backend': str(cache.__class__),
            'default_timeout': getattr(cache, 'default_timeout', 'Unknown'),
        }

        if hasattr(cache, '_cache') and hasattr(cache._cache, 'info'):
            redis_info = cache._cache.info()
            cache_info.update({
                'redis_version': redis_info.get('redis_version'),
                'used_memory_human': redis_info.get('used_memory_human'),
                'keyspace_hits': redis_info.get('keyspace_hits', 0),
                'keyspace_misses': redis_info.get('keyspace_misses', 0),
            })
            hits = redis_info.get('keyspace_hits', 0)
            misses = redis_info.get('keyspace_misses', 0)
            total = hits + misses
            if total > 0:
                cache_info['hit_ratio'] = f"{(hits / total * 100):.2f}%"

        return cache_info
    except Exception as e:
        return {'error': str(e)}


@staff_member_required
def cache_management(request):
    """Widok do zarządzania cache'em"""
    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'clear_shops':
            cleared = clear_shops_cache()
            messages.success(request, f'Wyczyszczono {cleared} kluczy cache sklepów')
        elif action == 'clear_all':
            cache.clear()
            messages.success(request, 'Wyczyszczono cały cache')
        elif action == 'preload_shops':
            count = preload_all_shops_to_cache()
            messages.success(request, f'Preloadowano {count} sklepów do cache')

    context = {
        'cache_stats': get_cache_stats(),
        'title': 'Zarządzanie Cache',
        'preloaded_count': len(cache.get('ALL_SHOPS_PRELOADED', [])),
        'last_preload': cache.get('ALL_SHOPS_LAST_UPDATE')
    }

    return render(request, 'admin/cache_management.html', context)


@csrf_exempt
def get_platform_stats(request):
    """Zwraca statystyki platformy"""
    try:
        cache_key = 'platform_stats'
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return JsonResponse(cached_stats)

        shops_count = OSMShop.objects.filter(is_active=True).count()
        products_count = Product.objects.filter(
            productshoprelation__isnull=False
        ).distinct().count()

        if products_count == 0:
            products_count = Product.objects.filter(is_active=True).count()

        result = {
            'shops': shops_count,
            'products': products_count,
            'last_updated': int(time.time())
        }

        cache.set(cache_key, result, 30 * 60)
        return JsonResponse(result)

    except Exception as e:
        return JsonResponse({'error': f'Błąd: {str(e)}'}, status=500)


@csrf_exempt
def search_products(request):
    """Zwraca listę produktów pasujących do frazy wyszukiwania"""
    query = request.GET.get('q', '').strip()
    if len(query) < 2:
        return JsonResponse({'products': []})

    products_qs = Product.objects.filter(
        Q(is_active=True) &
        (Q(name__icontains=query) | Q(flavor__icontains=query))
    )

    results = []
    for p in products_qs:
        full_name = f"DZIK® {p.name}"
        if p.flavor:
            full_name += f" {p.flavor}"

        photo_url = p.get_photo_url()
        results.append({
            'id': p.id,
            'name': p.name,
            'flavor': p.flavor,
            'category': p.category,
            'full_name': full_name.strip(),
            'photo_url': photo_url,
        })

    return JsonResponse({'products': results[:10]})


# POPRAWIONE ENDPOINTY ZGŁOSZEŃ
def csrf_token_view(request):
    """Endpoint do pobierania CSRF tokenu"""
    return JsonResponse({'csrfToken': get_token(request)})


@csrf_exempt
@require_http_methods(["POST"])
def submit_report(request):
    """Endpoint do wysyłania zgłoszeń - CAŁKOWICIE PRZEPISANY"""
    try:
        # Sprawdź Content-Type
        if not request.content_type or 'application/json' not in request.content_type:
            return JsonResponse({
                'success': False,
                'error': 'Content-Type musi zawierać application/json'
            }, status=400)

        # Parsuj JSON
        try:
            body_unicode = request.body.decode('utf-8')
            if not body_unicode.strip():
                return JsonResponse({
                    'success': False,
                    'error': 'Puste body requestu'
                }, status=400)

            data = json.loads(body_unicode)
        except json.JSONDecodeError as e:
            return JsonResponse({
                'success': False,
                'error': f'Nieprawidłowy JSON: {str(e)}'
            }, status=400)
        except UnicodeDecodeError as e:
            return JsonResponse({
                'success': False,
                'error': f'Błąd kodowania: {str(e)}'
            }, status=400)

        # Walidacja wymaganych pól
        required_fields = ['report_type', 'description']
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            return JsonResponse({
                'success': False,
                'error': f'Brakujące pola: {", ".join(missing_fields)}'
            }, status=400)

        # Sprawdź czy report_type jest poprawny
        valid_types = [choice[0] for choice in UserReport.REPORT_TYPE_CHOICES]
        if data.get('report_type') not in valid_types:
            return JsonResponse({
                'success': False,
                'error': f'Nieprawidłowy typ zgłoszenia: {data.get("report_type")}'
            }, status=400)

        # Tworzenie zgłoszenia
        try:
            # Przygotuj dane
            shop_lat = data.get('shop_lat')
            shop_lon = data.get('shop_lon')
            
            # Konwertuj na Decimal jeśli są dostępne
            if shop_lat is not None and shop_lon is not None:
                from decimal import Decimal
                shop_lat = Decimal(str(shop_lat))
                shop_lon = Decimal(str(shop_lon))
            
            report = UserReport(
                report_type=data.get('report_type'),
                title=data.get('title', '').strip()[:200],
                description=data.get('description', '').strip(),
                user_email=data.get('user_email', '').strip(),
                source=data.get('source', 'general'),
                ip_address=request.META.get('REMOTE_ADDR'),
                shop_lat=shop_lat,
                shop_lon=shop_lon,
                shop_name=data.get('shop_name', '').strip()[:200]
            )

            # Zapisz bez full_clean (źródło błędów)
            report.save()

            return JsonResponse({
                'success': True,
                'message': 'Dziękujemy za zgłoszenie! Sprawdzimy to jak najszybciej.',
                'report_id': report.id
            })

        except Exception as e:
            import traceback
            print(f"Błąd zgłoszenia: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({
                'success': False,
                'error': f'Błąd podczas zapisywania: {str(e)}'
            }, status=500)

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Nieoczekiwany błąd: {str(e)}'
        }, status=500)


@csrf_exempt
def report_form(request):
    """Widok formularza zgłoszeń (dla UC2 - ogólne)"""
    if request.method == 'GET':
        try:
            form_html = render_to_string('dzik/report_form.html', {
                'report_types': UserReport.REPORT_TYPE_CHOICES,
                'general_types': [choice for choice in UserReport.REPORT_TYPE_CHOICES
                                  if choice[0] in ['app_bug', 'missing_shop', 'feature_request', 'other']]
            })
            return JsonResponse({'form_html': form_html})
        except Exception as e:
            return JsonResponse({'error': f'Błąd renderowania: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def map_report_form(request):
    """Widok formularza zgłoszeń ze sklepu na mapie (UC1)"""
    if request.method == 'GET':
        try:
            shop_name = request.GET.get('shop_name', '')
            shop_lat = request.GET.get('lat', '')
            shop_lon = request.GET.get('lon', '')

            form_html = render_to_string('dzik/map_report_form.html', {
                'shop_name': shop_name,
                'shop_lat': shop_lat,
                'shop_lon': shop_lon,
                'shop_types': [choice for choice in UserReport.REPORT_TYPE_CHOICES
                               if choice[0] in ['shop_not_exists', 'wrong_location', 'no_products', 'wrong_products']]
            })
            return JsonResponse({'form_html': form_html})
        except Exception as e:
            return JsonResponse({'error': f'Błąd renderowania: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@ensure_csrf_cookie
def csrf_token_view(request):
    """Endpoint do pobrania CSRF tokenu i ustawienia ciasteczka"""
    return JsonResponse({'csrfToken': get_token(request)})