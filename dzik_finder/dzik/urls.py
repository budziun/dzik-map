# dzik/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('nearest-shops/', views.nearest_shops, name='nearest_shops'),
    path('all-shops/', views.all_shops, name='all_shops'),
    path('smart-shops/', views.smart_shops, name='smart_shops'),
    path('force-preload/', views.force_preload_cache, name='force_preload'),
    path('geocode/', views.geocode_city, name='geocode_city'),
    path('multi-select-products/', views.multi_product_selector, name='multi_product_selector'),
    path('multi-select-shops/', views.multi_shop_selector, name='multi_shop_selector'),
    path('toggle-product/', views.toggle_product, name='toggle_product'),
    path('cache-management/', views.cache_management, name='cache_management'),
    path('stats/', views.get_platform_stats, name='platform_stats'),
    path('search-products/', views.search_products, name='search_products'),

    # USUŃ "api/" z początku - już jest w głównym urls.py
    path('csrf-token/', views.csrf_token_view, name='csrf_token'),
    path('submit-report/', views.submit_report, name='submit_report'),
    path('report-form/', views.report_form, name='report_form'),
    path('map-report-form/', views.map_report_form, name='map_report_form'),
]