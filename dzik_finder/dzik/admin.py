from django.contrib import admin
from django.db.models import Count, Case, When, IntegerField, Q
from .models import Product, Shop, ProductShopRelation, OSMShop, UserReport


class ShopRelationInline(admin.TabularInline):
    model = ProductShopRelation
    fk_name = 'product'
    extra = 1
    fields = ['shop', 'is_available']


class ProductRelationInline(admin.TabularInline):
    model = ProductShopRelation
    fk_name = 'shop'
    extra = 1
    fields = ['product', 'is_available']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'flavor', 'category', 'is_active', 'shop_count']
    list_filter = ['category', 'brand', 'is_active']
    search_fields = ['name', 'flavor']

    fieldsets = (
        ('Podstawowe informacje', {
            'fields': ('name', 'flavor', 'brand', 'category')
        }),
        ('Szczegóły produktu', {
            'fields': ('description', 'capacity', 'caffeine_content', 'photo')
        }),
        ('Dostępność w sklepach', {
            'fields': ('available_shops',),
            'classes': ('wide',),
            'description': 'Wybierz sklepy gdzie produkt jest dostępny'
        }),
        ('Status', {
            'fields': ('is_active', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at']

    def shop_count(self, obj):
        return ProductShopRelation.objects.filter(product=obj).count()

    shop_count.short_description = 'Sklepy'

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if db_field.name == "available_shops":
            kwargs['widget'] = admin.widgets.FilteredSelectMultiple(
                "Sklepy", False
            )
            kwargs['queryset'] = Shop.objects.filter(is_template=True).order_by('name')
        return super().formfield_for_manytomany(db_field, request, **kwargs)

    def save_related(self, request, form, formsets, change):
        """
        Synchronizacja:
        - aktualizujemy ProductShopRelation ↔ available_shops
        - usuwamy TYLKO relacje, które wypadły z formularza
        """
        super().save_related(request, form, formsets, change)

        if not change:
            return

        product = form.instance
        selected_shops = form.cleaned_data.get('available_shops', [])

        selected_ids = {s.id for s in selected_shops}

        current_ids = set(
            ProductShopRelation.objects.
            filter(product=product).
            values_list('shop_id', flat=True)
        )

        to_remove = current_ids - selected_ids
        if to_remove:
            ProductShopRelation.objects.filter(
                product=product, shop_id__in=to_remove
            ).delete()

        to_add = selected_ids - current_ids
        for sid in to_add:
            ProductShopRelation.objects.create(
                product=product,
                shop_id=sid
            )

        product.available_shops.set(selected_shops)

    actions = ['add_to_all_shops', 'remove_from_all_shops']

    def add_to_all_shops(self, request, queryset):
        shops = Shop.objects.filter(is_template=True)
        count = 0
        for product in queryset:
            for shop in shops:
                obj, created = ProductShopRelation.objects.get_or_create(
                    product=product, shop=shop
                )
                if created:
                    count += 1
        self.message_user(request, f'Dodano {count} połączeń do wszystkich sklepów')

    add_to_all_shops.short_description = "🏪 → Dodaj do wszystkich sklepów"

    def remove_from_all_shops(self, request, queryset):
        count = 0
        for product in queryset:
            deleted = ProductShopRelation.objects.filter(product=product).delete()
            count += deleted[0]
        self.message_user(request, f'Usunięto {count} połączeń')

    remove_from_all_shops.short_description = "❌ Usuń ze wszystkich sklepów"


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ['name', 'chain', 'is_template', 'product_count', 'has_logo']
    list_filter = ['is_template', 'chain']
    search_fields = ['name']

    fieldsets = (
        ('Typ sklepu', {
            'fields': ('is_template',),
        }),
        ('Podstawowe informacje', {
            'fields': ('name', 'chain', 'address')
        }),
        ('Logo', {
            'fields': ('logo',),
        }),
        ('Produkty w sklepie', {
            'fields': ('available_products',),
            'classes': ('wide',),
            'description': 'Wybierz produkty dostępne w tym sklepie'
        }),
        ('GPS', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',),
        }),
    )

    def product_count(self, obj):
        return ProductShopRelation.objects.filter(shop=obj).count()

    product_count.short_description = 'Produkty'

    def has_logo(self, obj):
        return bool(obj.logo)

    has_logo.boolean = True
    has_logo.short_description = 'Logo'

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if db_field.name == "available_products":
            kwargs['widget'] = admin.widgets.FilteredSelectMultiple(
                "Produkty", False
            )
            kwargs['queryset'] = Product.objects.filter(is_active=True).order_by('category', 'name')
        return super().formfield_for_manytomany(db_field, request, **kwargs)

    def save_related(self, request, form, formsets, change):
        """
        Synchronizacja:
        - aktualizujemy ProductShopRelation ↔ available_products
        - usuwamy TYLKO relacje, które wypadły z formularza
        """
        super().save_related(request, form, formsets, change)

        if not change:
            return

        shop = form.instance
        selected_products = form.cleaned_data.get('available_products', [])

        selected_ids = {p.id for p in selected_products}

        current_ids = set(
            ProductShopRelation.objects.
            filter(shop=shop).
            values_list('product_id', flat=True)
        )

        to_remove = current_ids - selected_ids
        if to_remove:
            ProductShopRelation.objects.filter(
                shop=shop, product_id__in=to_remove
            ).delete()

        to_add = selected_ids - current_ids
        for pid in to_add:
            ProductShopRelation.objects.create(
                shop=shop,
                product_id=pid
            )

        shop.available_products.set(selected_products)

    actions = ['add_all_energy_drinks', 'clear_all_products']

    def add_all_energy_drinks(self, request, queryset):
        energy_drinks = Product.objects.filter(category='energy_drink', is_active=True)
        count = 0
        for shop in queryset:
            for product in energy_drinks:
                obj, created = ProductShopRelation.objects.get_or_create(
                    product=product, shop=shop
                )
                if created:
                    count += 1
        self.message_user(request, f'Dodano {count} energy drinków')

    add_all_energy_drinks.short_description = "⚡ Dodaj wszystkie energy drinks"

    def get_form(self, request, obj=None, **kwargs):
        """
        Inicjalizuje formularz z danymi z ProductShopRelation
        """
        form = super().get_form(request, obj, **kwargs)

        if obj and obj.pk:
            related_products = Product.objects.filter(
                productshoprelation__shop=obj
            ).distinct()

            obj.available_products.set(related_products)

        return form

    def clear_all_products(self, request, queryset):
        count = 0
        for shop in queryset:
            deleted = ProductShopRelation.objects.filter(shop=shop).delete()
            count += deleted[0]
        self.message_user(request, f'Usunięto {count} produktów ze sklepów')

    clear_all_products.short_description = "🗑️ Wyczyść wszystkie produkty"


@admin.register(ProductShopRelation)
class ProductShopRelationAdmin(admin.ModelAdmin):
    list_display = ['product_name', 'shop_name', 'is_available', 'added_date']
    list_filter = ['is_available', 'added_date', 'product__category']
    search_fields = ['product__name', 'shop__name']

    def product_name(self, obj):
        return f"{obj.product.name} - {obj.product.flavor}"

    product_name.short_description = 'Produkt'

    def shop_name(self, obj):
        return obj.shop.name

    shop_name.short_description = 'Sklep'


admin.site.site_header = "🥤 DzikFinder"


# ✅ NIESTANDARDOWY FILTR JAKO KLASA
class AddressStatusFilter(admin.SimpleListFilter):
    title = 'Status lokalizacji'
    parameter_name = 'address_status'

    def lookups(self, request, model_admin):
        return (
            ('with_address', 'Z adresem'),
            ('without_address', 'Brak adresu'),
            ('with_gps', 'Z współrzędnymi GPS'),
            ('without_gps', 'Bez współrzędnych GPS'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'with_address':
            return queryset.filter(address__isnull=False).exclude(address='')
        elif self.value() == 'without_address':
            return queryset.filter(Q(address__isnull=True) | Q(address='Brak adresu'))
        elif self.value() == 'with_gps':
            return queryset.filter(latitude__isnull=False, longitude__isnull=False)
        elif self.value() == 'without_gps':
            return queryset.filter(Q(latitude__isnull=True) | Q(longitude__isnull=True))
        return queryset


@admin.register(OSMShop)
class OSMShopAdmin(admin.ModelAdmin):
    list_display = ['name', 'chain', 'city_from_address', 'shop_template', 'distance_info', 'is_active', 'last_updated',
                    'product_count']
    list_filter = [
        'chain',
        'is_active',
        'last_updated',
        'shop_template__chain',
        ('shop_template', admin.RelatedOnlyFieldListFilter),
        AddressStatusFilter,
    ]
    search_fields = ['name', 'address', 'osm_id', 'chain', 'latitude', 'longitude']

    # ZMIENIONE: Pozwól edytować wszystkie pola podczas dodawania
    readonly_fields = ['last_updated']

    ordering = ['chain', 'name']

    list_per_page = 50
    list_max_show_all = 200

    # ZMIENIONE: Rozszerzone fieldsets dla lepszego UX podczas dodawania
    fieldsets = (
        ('Podstawowe informacje', {
            'fields': ('name', 'chain', 'is_active'),
            'description': 'Podstawowe dane sklepu'
        }),
        ('Lokalizacja', {
            'fields': ('address', 'latitude', 'longitude'),
            'classes': ('wide',),
            'description': 'Adres i współrzędne GPS sklepu'
        }),
        ('Powiązania', {
            'fields': ('shop_template',),
            'description': 'Szablon sieci - określa jakie produkty są dostępne'
        }),
        ('Metadane OSM', {
            'fields': ('osm_id', 'last_updated'),
            'classes': ('collapse',),
            'description': 'Dane z OpenStreetMap (opcjonalne)'
        }),
    )

    def get_queryset(self, request):
        """Rozszerzone queryset z adnotacjami dla sortowania"""
        return super().get_queryset(request).select_related('shop_template').annotate(
            products_count=Case(
                When(shop_template__isnull=False,
                     then=Count('shop_template__productshoprelation')),
                default=0,
                output_field=IntegerField()
            )
        )

    def city_from_address(self, obj):
        """Wyciąga miasto z adresu"""
        if obj.address:
            parts = obj.address.split(', ')
            return parts[-1] if len(parts) > 1 else parts[0][:20]
        return "❌ Brak adresu"

    city_from_address.short_description = 'Miasto'
    city_from_address.admin_order_field = 'address'

    def distance_info(self, obj):
        """Pokazuje pełne współrzędne geograficzne"""
        if obj.latitude and obj.longitude:
            return f"{obj.latitude:.6f}, {obj.longitude:.6f}"
        return "❌ Brak GPS"

    distance_info.short_description = 'Współrzędne GPS'
    distance_info.admin_order_field = 'latitude'

    def product_count(self, obj):
        """Liczba produktów dostępnych w sklepie (przez szablon)"""
        return getattr(obj, 'products_count', 0)

    product_count.short_description = 'Produkty'
    product_count.admin_order_field = 'products_count'

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "shop_template":
            kwargs["queryset"] = Shop.objects.filter(is_template=True).order_by('chain', 'name')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    # NOWE: Akcje pomocnicze do szybkiego dodawania
    actions = ['activate_shops', 'deactivate_shops', 'assign_templates', 'export_coordinates', 'delete_selected_shops',
               'find_missing_addresses', 'create_from_osm_data']

    def activate_shops(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'Aktywowano {updated} sklepów')

    activate_shops.short_description = "✅ Aktywuj sklepy"

    def deactivate_shops(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Dezaktywowano {updated} sklepów')

    deactivate_shops.short_description = "❌ Dezaktywuj sklepy"

    def assign_templates(self, request, queryset):
        """Automatycznie przypisuje szablony na podstawie chain"""
        count = 0
        for shop in queryset:
            if not shop.shop_template:
                try:
                    template = Shop.objects.get(chain=shop.chain, is_template=True)
                    shop.shop_template = template
                    shop.save()
                    count += 1
                except Shop.DoesNotExist:
                    pass

        self.message_user(request, f'Przypisano szablony do {count} sklepów')

    assign_templates.short_description = "🔗 Przypisz szablony automatycznie"

    # NOWA: Akcja do tworzenia sklepu z danych OSM
    def create_from_osm_data(self, request, queryset):
        """Pomocnik do szybkiego tworzenia sklepów z przykładowymi danymi OSM"""
        from django.utils import timezone

        # Przykładowe dane dla różnych sieci
        osm_templates = {
            'Carrefour': {
                'name': 'Carrefour',
                'chain': 'Carrefour',
                'is_active': True,
            },
            'Biedronka': {
                'name': 'Biedronka',
                'chain': 'Biedronka',
                'is_active': True,
            },
            'Żabka': {
                'name': 'Żabka',
                'chain': 'Żabka',
                'is_active': True,
            }
        }

        self.message_user(
            request,
            'ℹ️ Aby dodać sklep z danymi OSM, użyj przycisku "Dodaj OSM Shop" i wprowadź dane ręcznie.',
            level='info'
        )

    create_from_osm_data.short_description = "📝 Instrukcja dodawania sklepów OSM"

    def export_coordinates(self, request, queryset):
        """Eksportuje współrzędne do formatu CSV"""
        from django.http import HttpResponse
        import csv

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sklepy_wspolrzedne.csv"'

        writer = csv.writer(response)
        writer.writerow(['Nazwa', 'Sieć', 'Adres', 'Latitude', 'Longitude', 'OSM_ID'])

        for shop in queryset:
            writer.writerow([
                shop.name,
                shop.chain,
                shop.address,
                shop.latitude,
                shop.longitude,
                shop.osm_id
            ])

        return response

    export_coordinates.short_description = "📊 Eksportuj współrzędne (CSV)"

    def find_missing_addresses(self, request, queryset):
        """Pokazuje statystyki sklepów bez adresów"""
        no_address = queryset.filter(Q(address__isnull=True) | Q(address='')).count()
        no_gps = queryset.filter(Q(latitude__isnull=True) | Q(longitude__isnull=True)).count()
        total = queryset.count()

        self.message_user(
            request,
            f'📍 Statystyki lokalizacji: '
            f'Bez adresu: {no_address}/{total}, '
            f'Bez GPS: {no_gps}/{total}',
            level='info'
        )

    find_missing_addresses.short_description = "📍 Sprawdź braki w lokalizacji"

    def delete_selected_shops(self, request, queryset):
        """Usuwa zaznaczone sklepy z potwierdzeniem"""
        count = queryset.count()
        if count == 0:
            self.message_user(request, 'Nie wybrano żadnych sklepów do usunięcia', level='warning')
            return

        chains_summary = {}
        for shop in queryset:
            chains_summary[shop.chain] = chains_summary.get(shop.chain, 0) + 1

        summary = ', '.join([f"{chain}: {count}" for chain, count in chains_summary.items()])

        deleted_count = queryset.delete()[0]
        self.message_user(
            request,
            f'🗑️ Usunięto {deleted_count} sklepów ({summary})',
            level='success'
        )

    delete_selected_shops.short_description = "🗑️ Usuń zaznaczone sklepy"

    # ZMIENIONE: Pozwól edytować więcej pól podczas edycji istniejących
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Edycja istniejącego obiektu
            return ['last_updated']  # Tylko last_updated jest readonly
        else:  # Dodawanie nowego obiektu
            return ['last_updated']  # OSM ID może być puste przy ręcznym dodawaniu

    # ZMIENIONE: Pozwól na dodawanie sklepów przez admin
    def has_add_permission(self, request):
        """Pozwól adminom dodawać sklepy ręcznie"""
        return request.user.is_staff

    def has_delete_permission(self, request, obj=None):
        """Pozwól na usuwanie tylko adminom"""
        return request.user.is_superuser

    # NOWE: Niestandardowa walidacja przy zapisie
    def save_model(self, request, obj, form, change):
        """Automatyczne uzupełnienie danych przy zapisie"""
        from django.utils import timezone

        # Jeśli to nowy sklep bez OSM ID, wygeneruj unikalny identyfikator
        if not change and not obj.osm_id:
            import uuid
            obj.osm_id = f"manual_{uuid.uuid4().hex[:8]}"

        # Aktualizuj last_updated
        obj.last_updated = timezone.now()

        # Automatyczne przypisanie szablonu jeśli nie ma
        if not obj.shop_template:
            try:
                template = Shop.objects.get(chain=obj.chain, is_template=True)
                obj.shop_template = template
                self.message_user(
                    request,
                    f'✅ Automatycznie przypisano szablon dla sieci {obj.chain}',
                    level='success'
                )
            except Shop.DoesNotExist:
                self.message_user(
                    request,
                    f'⚠️ Nie znaleziono szablonu dla sieci {obj.chain}. Utwórz szablon w sekcji "Shops".',
                    level='warning'
                )

        super().save_model(request, obj, form, change)

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

    # NOWE: Pomoc kontekstowa
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['title'] = 'Sklepy OSM - Zarządzanie sklepami fizycznymi'
        extra_context['subtitle'] = 'Dodaj nowy sklep lub zarządzaj istniejącymi lokalizacjami'
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(UserReport)
class UserReportAdmin(admin.ModelAdmin):
    list_display = ['get_short_description', 'report_type', 'source', 'status', 'created_at', 'has_location_icon']
    list_filter = ['status', 'report_type', 'source', 'created_at']
    search_fields = ['description', 'title', 'user_email', 'shop_name']
    readonly_fields = ['created_at', 'ip_address', 'has_location']

    fieldsets = (
        ('Zgłoszenie', {
            'fields': ('report_type', 'title', 'description', 'screenshot')
        }),
        ('Dane użytkownika', {
            'fields': ('user_email', 'ip_address')
        }),
        ('Lokalizacja (z mapy)', {
            'fields': ('source', 'shop_name', 'shop_lat', 'shop_lon'),
            'classes': ('collapse',)
        }),
        ('Zarządzanie', {
            'fields': ('status', 'admin_response', 'created_at')
        }),
    )

    def get_short_description(self, obj):
        if obj.title:
            return obj.title[:60]
        return obj.description[:60] + "..."

    get_short_description.short_description = 'Opis'

    def has_location_icon(self, obj):
        return "📍" if obj.has_location else "💬"

    has_location_icon.short_description = 'Typ'

    actions = ['mark_as_resolved', 'mark_as_rejected']

    def mark_as_resolved(self, request, queryset):
        updated = queryset.update(status='resolved')
        self.message_user(request, f'Oznaczono {updated} zgłoszeń jako rozwiązane')

    mark_as_resolved.short_description = "✅ Oznacz jako rozwiązane"

    def mark_as_rejected(self, request, queryset):
        updated = queryset.update(status='rejected')
        self.message_user(request, f'Odrzucono {updated} zgłoszeń')

    mark_as_rejected.short_description = "❌ Odrzuć zgłoszenia"