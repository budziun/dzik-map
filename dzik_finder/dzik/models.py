# dzik/models.py
from django.db import models


class Product(models.Model):
    CATEGORY_CHOICES = [
        ('energy_drink', 'Energy Drink'),
        ('zero_caffeine_drink', 'Zero Caffeine Drink'),
        ('vitamine_boost', 'Vitamine Boost'),
        ('vitamine_drink', 'Vitamine Drink'),
    ]

    name = models.CharField(max_length=100, verbose_name="Nazwa")
    flavor = models.CharField(max_length=50, verbose_name="Smak")
    brand = models.CharField(max_length=50, default="Dzik", verbose_name="Marka")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES,
                                default="energy_drink", verbose_name="Kategoria")
    description = models.TextField(blank=True, null=True, verbose_name="Opis")
    capacity = models.CharField(max_length=20, blank=True, null=True,
                                verbose_name="Pojemność")
    caffeine_content = models.DecimalField(max_digits=5, decimal_places=2,
                                           blank=True, null=True,
                                           verbose_name="Zawartość kofeiny (mg)")
    photo = models.ImageField(upload_to='products/', blank=True, null=True,
                              verbose_name="Zdjęcie")
    is_active = models.BooleanField(default=True, verbose_name="Aktywny")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data dodania")

    available_shops = models.ManyToManyField(
        'Shop',
        blank=True,
        verbose_name="Dostępny w sklepach",
        related_name="products_available"
    )

    class Meta:
        verbose_name = "Produkt"
        verbose_name_plural = "Produkty"
        ordering = ['category', 'name', 'flavor']

    def __str__(self):
        return f"{self.brand} {self.name} – {self.flavor}"

    def get_photo_url(self):
        return self.photo.url if self.photo else None

    @property
    def shops(self):
        return Shop.objects.filter(productshoprelation__product=self)


class Shop(models.Model):
    # ✓ DODANE POLE CHAIN
    CHAIN_CHOICES = [
        ('biedronka', 'Biedronka'),
        ('zabka', 'Żabka'),
        ('lidl', 'Lidl'),
        ('kaufland', 'Kaufland'),
        ('dino', 'Dino'),
        ('aldi', 'Aldi'),
        ('inter', 'Intermarché'),
        ('stokrotka', 'Stokrotka'),
        ('topaz', 'Topaz'),
        ('twoj_market', 'Twój Market'),
        ('carrefour', 'Carrefour'),
        ('dealz','Dealz'),
        ('auchan', 'Auchan'),
        ('selgros', 'Selgros'),
        ('eurocash', 'Eurocash Cash&Carry'),
        ('bp', 'BP'),
        ('circle_k', 'Circle K'),
        ('arhelan','Arhelan'),
        ('other', 'Inne'),
    ]

    name = models.CharField(max_length=120, verbose_name="Nazwa sieci")
    chain = models.CharField(
        max_length=50,
        choices=CHAIN_CHOICES,
        default='other',
        verbose_name="Sieć handlowa"
    )
    address = models.CharField(max_length=255, blank=True, null=True, verbose_name="Adres")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True,
                                   verbose_name="Szerokość (lat)")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True,
                                    verbose_name="Długość (lon)")
    is_template = models.BooleanField(default=False, verbose_name="Szablon sieci")

    logo = models.ImageField(
        upload_to='shop_logos/',
        blank=True,
        null=True,
        verbose_name="Logo sieci"
    )

    featured_products = models.ManyToManyField(
        Product,
        through='ProductShopRelation',
        blank=True,
        verbose_name="Produkty w sklepie (przez relację)",
        related_name="shops_featured"
    )

    available_products = models.ManyToManyField(
        Product,
        blank=True,
        verbose_name="Produkty w sklepie",
        related_name="shops_available"
    )

    class Meta:
        verbose_name = "Sklep"
        verbose_name_plural = "Sklepy"
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_logo_url(self):
        return self.logo.url if self.logo else None

    # ✓ DODANA METODA
    def get_chain_display(self):
        return dict(self.CHAIN_CHOICES).get(self.chain, self.chain)

    @property
    def products(self):
        return Product.objects.filter(productshoprelation__shop=self)


class ProductShopRelation(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Produkt")
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, verbose_name="Sklep")
    added_date = models.DateTimeField(auto_now_add=True, verbose_name="Data dodania")
    is_available = models.BooleanField(default=True, verbose_name="Dostępny")

    class Meta:
        verbose_name = "Produkt w sklepie"
        verbose_name_plural = "Produkty w sklepach"
        unique_together = ('product', 'shop')
        ordering = ['product__category', 'product__name', 'shop__name']

    def __str__(self):
        return f"{self.product} → {self.shop}"


class OSMShop(models.Model):
    osm_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    chain = models.CharField(max_length=50, choices=Shop.CHAIN_CHOICES)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=255, blank=True)
    shop_template = models.ForeignKey(Shop, on_delete=models.SET_NULL, null=True)
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['chain']),
            models.Index(fields=['is_active']),
        ]


class UserReport(models.Model):
    REPORT_TYPE_CHOICES = [
        # UC1 - Problemy ze sklepem na mapie
        ('shop_not_exists', 'Sklep nie istnieje/zamknięty'),
        ('wrong_location', 'Zła lokalizacja na mapie'),
        ('no_products', 'Brak produktów DZIK w sklepie'),
        ('wrong_products', 'Inne produkty niż pokazane'),
        # UC2 - Ogólne problemy
        ('app_bug', 'Problem z mapą/wyszukiwaniem'),
        ('missing_shop', 'Brakujący sklep w okolicy'),
        ('feature_request', 'Sugestia/pomysł'),
        ('other', 'Inny problem'),
    ]

    STATUS_CHOICES = [
        ('new', 'Nowe'),
        ('resolved', 'Rozwiązane'),
        ('rejected', 'Odrzucone'),
    ]

    # Dane od użytkownika
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES, verbose_name="Rodzaj problemu")
    title = models.CharField(max_length=200, blank=True, verbose_name="Tytuł")
    description = models.TextField(verbose_name="Opis problemu")
    user_email = models.EmailField(blank=True, verbose_name="Email (opcjonalnie)")
    screenshot = models.ImageField(upload_to='reports/', blank=True, verbose_name="Zrzut ekranu")

    # Automatyczne z kontekstu
    shop_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Szerokość")
    shop_lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Długość")
    shop_name = models.CharField(max_length=200, blank=True, verbose_name="Nazwa sklepu")
    source = models.CharField(max_length=10, verbose_name="Źródło")  # 'map' lub 'general'

    # System
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', verbose_name="Status")
    admin_response = models.TextField(blank=True, verbose_name="Odpowiedź administratora")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data zgłoszenia")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP")

    class Meta:
        verbose_name = "Zgłoszenie użytkownika"
        verbose_name_plural = "Zgłoszenia użytkowników"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['source']),
        ]

    def __str__(self):
        return f"{self.get_report_type_display()}: {self.title[:50] if self.title else self.description[:50]}"

    @property
    def has_location(self):
        return self.shop_lat is not None and self.shop_lon is not None
