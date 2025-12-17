import React, { useState, useEffect, useCallback } from 'react';
import { Shop, getAllShops } from '../services/api'
import MapComponent from './MapComponent';
import BottomMenu from './BottomMenu';
import ShopCard from './ShopCard';
import ShopList from './ShopList';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import ProjectInfo from './ProjectInfo';
import SearchPanel from './SearchPanel';
import ReportProblemPanel from './ReportProblemPanel';

// Dodaj interfejsy dla filtrów
interface ShopFilter {
    id: string;
    name: string;
    chain: string;
    logo_url?: string;
}

interface ProductFilter {
    id: number;
    name: string;
    flavor: string;
    photo_url: string;
    category: string;
}

// NOWY: Interfejs dla produktu zwracanego przez API SearchPanel
interface SearchedProduct {
    id: number;
    name: string;
    flavor: string;
    category: string;
    full_name: string;
}

type FilterType = 'all' | 'products' | 'zabka' | 'biedronka' | 'lidl' | 'dino';

const ShopFinder: React.FC = () => {
    // STANY
    const [allShops, setAllShops] = useState<Shop[]>([]);
    const [filteredShops, setFiltered] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLoc, setUserLoc] = useState<{lat:number;lon:number}|null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [dataLoaded, setDataLoaded] = useState(false);
    const [hasRealLocation, setHasRealLocation] = useState(false);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
    const [isShopListOpen, setIsShopListOpen] = useState(false);
    const [isShopListClosing, setIsShopListClosing] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isFilterPanelClosing, setIsFilterPanelClosing] = useState(false);

    // STANY DLA PANELU INFORMACYJNEGO
    const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);
    const [isProjectInfoClosing, setIsProjectInfoClosing] = useState(false);

    // STANY DLA PANELU WYSZUKIWANIA
    const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
    const [isSearchPanelClosing, setIsSearchPanelClosing] = useState(false);

    // STANY DLA PANELU ZGŁOSZENIA PROBLEMU
    const [isReportProblemOpen, setIsReportProblemOpen] = useState(false);
    const [isReportProblemClosing, setIsReportProblemClosing] = useState(false);
    const [shopForReport, setShopForReport] = useState<Shop | null>(null); // NOWY STAN

    const [selectedShopFilters, setSelectedShopFilters] = useState<string[]>([]);
    const [selectedProductFilters, setSelectedProductFilters] = useState<number[]>([]);
    const [selectedProductCategories, setSelectedProductCategories] = useState<string[]>([]);
    const [shopFilters, setShopFilters] = useState<ShopFilter[]>([]);
    const [productFilters, setProductFilters] = useState<ProductFilter[]>([]);
    const [filtersLoaded, setFiltersLoaded] = useState(false); //eslint-disable-line

    // Główna funkcja do stosowania wszystkich filtrów
    const applyFilters = useCallback((shopsToFilter: Shop[]) => {
        let result = [...shopsToFilter];

        if (selectedShopFilters.length > 0) {
            result = result.filter(shop =>
                selectedShopFilters.some(filter =>
                    shop.chain.toLowerCase().includes(filter.toLowerCase())
                )
            );
        }

        if (selectedProductFilters.length > 0) {
            result = result.filter(shop =>
                    shop.products && shop.products.some(product =>
                        selectedProductFilters.includes(product.id)
                    )
            );
        }

        if (selectedProductCategories.length > 0) {
            result = result.filter(shop =>
                    shop.products && shop.products.some(product =>
                        selectedProductCategories.includes(product.category)
                    )
            );
        }

        setFiltered(result);
    }, [selectedShopFilters, selectedProductFilters, selectedProductCategories]);

    // Inicjalizacja aplikacji
    useEffect(() => {
        const initializeApp = async () => {
            const savedLocation = localStorage.getItem('userLocation');
            const isRealLocation = localStorage.getItem('isRealLocation') === 'true';
            let initialLocation = {lat: 52.2319, lon: 21.0067};
            let initialHasRealLocation = false;

            if (savedLocation && isRealLocation) {
                try {
                    initialLocation = JSON.parse(savedLocation);
                    initialHasRealLocation = true;
                } catch (e) {
                    console.error('Błąd parsowania lokalizacji:', e);
                    localStorage.removeItem('userLocation');
                    localStorage.removeItem('isRealLocation');
                }
            }

            setUserLoc(initialLocation);
            setHasRealLocation(initialHasRealLocation);

            try {
                setLoading(true);
                setError(null);
                const shopsData = await getAllShops(initialHasRealLocation ? initialLocation : null);
                setAllShops(shopsData);
                setDataLoaded(true);

                const uniqueShopsMap = new Map<string, ShopFilter>();
                const uniqueProductsMap = new Map<number, ProductFilter>();

                shopsData.forEach(shop => {
                    if (!uniqueShopsMap.has(shop.chain)) {
                        const shopNameMap: Record<string, string> = { 'inter': 'Intermarché' };
                        const formattedName = shopNameMap[shop.chain] || shop.chain.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        uniqueShopsMap.set(shop.chain, { id: shop.chain, name: formattedName, chain: shop.chain, logo_url: shop.logo_url });
                    }

                    shop.products?.forEach(product => {
                        if (!uniqueProductsMap.has(product.id)) {
                            uniqueProductsMap.set(product.id, product);
                        }
                    });
                });

                setShopFilters(Array.from(uniqueShopsMap.values()));
                setProductFilters(Array.from(uniqueProductsMap.values()));
                setFiltersLoaded(true);
            } catch (e: any) {
                console.error('Błąd ładowania danych:', e);
                setError('Błąd pobierania danych');
            } finally {
                setLoading(false);
            }
        };

        initializeApp();
    }, []);

    useEffect(() => {
        if (dataLoaded) {
            applyFilters(allShops);
        }
    }, [allShops, dataLoaded, applyFilters, selectedShopFilters, selectedProductFilters, selectedProductCategories]);

    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setLocationPermissionStatus(result.state as any);
                result.onchange = () => {
                    setLocationPermissionStatus(result.state as any);
                    if (result.state === 'denied' && hasRealLocation) {
                        clearRealLocation();
                    }
                };
            });
        }
    }, [hasRealLocation]); //eslint-disable-line

    const saveRealLocation = (location: {lat: number; lon: number}) => {
        localStorage.setItem('userLocation', JSON.stringify(location));
        localStorage.setItem('isRealLocation', 'true');
    };

    const requestRealLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolokalizacja nieobsługiwana w tej przeglądarce');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({coords}) => {
                const location = {lat: coords.latitude, lon: coords.longitude};
                setUserLoc(location);
                setHasRealLocation(true);
                setLocationPermissionStatus('granted');
                saveRealLocation(location);
            },
            (error) => {
                console.log('Błąd geolokalizacji:', error.message);
                setLocationPermissionStatus('denied');
                alert('Nie udało się pobrać lokalizacji. Sprawdź ustawienia przeglądarki.');
            },
            {enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000}
        );
    };

    const onLocationFound = (lat: number, lon: number) => {
        const location = {lat, lon};
        setUserLoc(location);
        setHasRealLocation(true);
        setLocationPermissionStatus('granted');
        saveRealLocation(location);
    };

    const onMapMoved = (lat: number, lon: number, zoom?: number, useCache?: boolean): void => {
        // Implementacja funkcji
    };

    const handleRadiusChange = (radius: number): void => {
        // Implementacja funkcji
    };

    const clearRealLocation = () => {
        localStorage.removeItem('userLocation');
        localStorage.removeItem('isRealLocation');
        setHasRealLocation(false);
        const WAW = {lat: 52.2319, lon: 21.0067};
        setUserLoc(WAW);
    };

    const handleShopSelect = (shop: Shop) => {
        setSelectedShop(shop);
        setIsShopListOpen(false);
    };

    const handleCloseShopCard = () => {
        setSelectedShop(null);
    };

    const handleShopListToggle = () => {
        if (!isShopListOpen) {
            if (isProjectInfoOpen) {
                setIsProjectInfoClosing(true);
                setTimeout(() => { setIsProjectInfoOpen(false); setIsProjectInfoClosing(false); }, 400);
            }
            if (isFilterPanelOpen) {
                setIsFilterPanelClosing(true);
                setTimeout(() => { setIsFilterPanelOpen(false); setIsFilterPanelClosing(false); }, 400);
            }
            if (isSearchPanelOpen) {
                setIsSearchPanelClosing(true);
                setTimeout(() => { setIsSearchPanelOpen(false); setIsSearchPanelClosing(false); }, 300);
            }
            if (isReportProblemOpen) {
                setIsReportProblemClosing(true);
                setTimeout(() => { setIsReportProblemOpen(false); setIsReportProblemClosing(false); }, 400);
            }
            setIsShopListOpen(true);
        } else {
            setIsShopListClosing(true);
            setTimeout(() => { setIsShopListOpen(false); setIsShopListClosing(false); }, 400);
        }
    };

    const handleFilterPanelToggle = () => {
        if (!isFilterPanelOpen) {
            if (isProjectInfoOpen) {
                setIsProjectInfoClosing(true);
                setTimeout(() => { setIsProjectInfoOpen(false); setIsProjectInfoClosing(false); }, 400);
            }
            if (isShopListOpen) {
                setIsShopListClosing(true);
                setTimeout(() => { setIsShopListOpen(false); setIsShopListClosing(false); }, 400);
            }
            if (isSearchPanelOpen) {
                setIsSearchPanelClosing(true);
                setTimeout(() => { setIsSearchPanelOpen(false); setIsSearchPanelClosing(false); }, 300);
            }
            if (isReportProblemOpen) {
                setIsReportProblemClosing(true);
                setTimeout(() => { setIsReportProblemOpen(false); setIsReportProblemClosing(false); }, 400);
            }
            setIsFilterPanelOpen(true);
        } else {
            setIsFilterPanelClosing(true);
            setTimeout(() => { setIsFilterPanelOpen(false); setIsFilterPanelClosing(false); }, 400);
        }
    };

    const handleProjectInfoToggle = () => {
        if (!isProjectInfoOpen) {
            if (isShopListOpen) {
                setIsShopListClosing(true);
                setTimeout(() => { setIsShopListOpen(false); setIsShopListClosing(false); }, 400);
            }
            if (isFilterPanelOpen) {
                setIsFilterPanelClosing(true);
                setTimeout(() => { setIsFilterPanelOpen(false); setIsFilterPanelClosing(false); }, 400);
            }
            if (isSearchPanelOpen) {
                setIsSearchPanelClosing(true);
                setTimeout(() => { setIsSearchPanelOpen(false); setIsSearchPanelClosing(false); }, 300);
            }
            if (isReportProblemOpen) {
                setIsReportProblemClosing(true);
                setTimeout(() => { setIsReportProblemOpen(false); setIsReportProblemClosing(false); }, 400);
            }
            setIsProjectInfoOpen(true);
        } else {
            setIsProjectInfoClosing(true);
            setTimeout(() => { setIsProjectInfoOpen(false); setIsProjectInfoClosing(false); }, 400);
        }
    };

    // ZAKTUALIZOWANA FUNKCJA DO OBSŁUGI PANELU WYSZUKIWANIA
    const handleSearchPanelToggle = () => {
        if (!isSearchPanelOpen) {
            // Zamknij inne otwarte panele, ALE NIE RESETUJ FILTRÓW PRODUKTOWYCH
            if (isProjectInfoOpen) {
                setIsProjectInfoClosing(true);
                setTimeout(() => { setIsProjectInfoOpen(false); setIsProjectInfoClosing(false); }, 400);
            }
            if (isShopListOpen) {
                setIsShopListClosing(true);
                setTimeout(() => { setIsShopListOpen(false); setIsShopListClosing(false); }, 400);
            }
            if (isFilterPanelOpen) {
                setIsFilterPanelClosing(true);
                setTimeout(() => { setIsFilterPanelOpen(false); setIsFilterPanelClosing(false); }, 400);
            }
            if (isReportProblemOpen) {
                setIsReportProblemClosing(true);
                setTimeout(() => { setIsReportProblemOpen(false); setIsReportProblemClosing(false); }, 400);
            }
            setIsSearchPanelOpen(true);
        } else {
            setIsSearchPanelClosing(true);
            setTimeout(() => { setIsSearchPanelOpen(false); setIsSearchPanelClosing(false); }, 300);
        }
    };

    // NOWA FUNKCJA DO OBSŁUGI WYSZUKIWANIA MIASTA
    const handleLocationSearchFromPanel = (lat: number, lon: number, displayName: string) => {
        console.log(`Przenoszenie mapy do: ${displayName} (${lat}, ${lon})`);
        setUserLoc({ lat, lon });
        setHasRealLocation(false); // To nie jest lokalizacja z GPS
    };

    // NOWA FUNKCJA DO OBSŁUGI WYBORU PRODUKTU
    const handleProductSelectFromPanel = (product: SearchedProduct) => {
        console.log(`Wybrano produkt: ${product.full_name} (ID: ${product.id})`);
        if (!selectedProductFilters.includes(product.id)) {
            setSelectedProductFilters(prev => [...prev, product.id]);
        }
    };

    // NOWA FUNKCJA DO OBSŁUGI ZGŁOSZENIA PROBLEMU
    const handleReportProblemToggle = (shop?: Shop | null) => {
        if (!isReportProblemOpen) {
            // Zamknij inne otwarte panele
            if (isProjectInfoOpen) {
                setIsProjectInfoClosing(true);
                setTimeout(() => {
                    setIsProjectInfoOpen(false);
                    setIsProjectInfoClosing(false);
                }, 400);
            }
            if (isShopListOpen) {
                setIsShopListClosing(true);
                setTimeout(() => {
                    setIsShopListOpen(false);
                    setIsShopListClosing(false);
                }, 400);
            }
            if (isFilterPanelOpen) {
                setIsFilterPanelClosing(true);
                setTimeout(() => {
                    setIsFilterPanelOpen(false);
                    setIsFilterPanelClosing(false);
                }, 400);
            }
            if (isSearchPanelOpen) {
                setIsSearchPanelClosing(true);
                setTimeout(() => {
                    setIsSearchPanelOpen(false);
                    setIsSearchPanelClosing(false);
                }, 300);
            }

            // Ustaw sklep, dla którego zgłaszamy problem
            setShopForReport(shop || null);
            setIsReportProblemOpen(true);
        } else {
            setIsReportProblemClosing(true);
            setTimeout(() => {
                setIsReportProblemOpen(false);
                setIsReportProblemClosing(false);
                setShopForReport(null);
            }, 400);
        }
    };

    // RENDEROWANIE
    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
            <MapComponent
                userLocation={userLoc}
                shops={filteredShops}
                onLocationFound={onLocationFound}
                onMapMove={onMapMoved}
                onRadiusChange={handleRadiusChange}
                loading={loading}
                hasRealLocation={hasRealLocation}
                onShopSelect={handleShopSelect}
            />

            <BottomMenu
                onFilterChange={(f) => setFilter(f as FilterType)}
                currentFilter={filter}
                shopCount={filteredShops.length}
                loading={loading}
                hasRealLocation={hasRealLocation}
                locationPermissionStatus={locationPermissionStatus}
                isShopCardOpen={!!selectedShop}
                isShopListOpen={isShopListOpen}
                onLocationToggle={() => {
                    if (hasRealLocation) { clearRealLocation(); } else { requestRealLocation(); }
                }}
                onShopListOpen={handleShopListToggle}
                onFilterPanelOpen={handleFilterPanelToggle}
                isFilterPanelOpen={isFilterPanelOpen}
                activeFiltersCount={selectedShopFilters.length + selectedProductFilters.length + selectedProductCategories.length}
                onInfoOpen={handleProjectInfoToggle}
                isProjectInfoOpen={isProjectInfoOpen}
                onSearchOpen={handleSearchPanelToggle}
                isSearchPanelOpen={isSearchPanelOpen}
                onReportProblemOpen={handleReportProblemToggle}
                isReportProblemOpen={isReportProblemOpen}
            />

            {isShopListOpen && (
                <ShopList
                    shops={filteredShops}
                    userLocation={userLoc}
                    onClose={() => setIsShopListOpen(false)}
                    hasRealLocation={hasRealLocation}
                    onShopSelect={handleShopSelect}
                    loading={loading}
                    isClosing={isShopListClosing}
                />
            )}

            {selectedShop && (
                <ShopCard
                    shop={selectedShop}
                    userLocation={userLoc}
                    hasRealLocation={hasRealLocation}
                    onClose={handleCloseShopCard}
                    onReportProblemOpen={(shop) => handleReportProblemToggle(shop)} // Dodane
                />
            )}

            <AdvancedFilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                selectedShops={selectedShopFilters}
                setSelectedShops={setSelectedShopFilters}
                selectedProducts={selectedProductFilters}
                setSelectedProducts={setSelectedProductFilters}
                selectedCategories={selectedProductCategories}
                setSelectedCategories={setSelectedProductCategories}
                shopFilters={shopFilters}
                productFilters={productFilters}
                userLocation={userLoc}
                isClosing={isFilterPanelClosing}
            />

            {/* ZAKTUALIZOWANY KOMPONENT WYSZUKIWANIA */}
            <SearchPanel
                isOpen={isSearchPanelOpen}
                onClose={handleSearchPanelToggle}
                onLocationSearch={handleLocationSearchFromPanel}
                onProductSelect={handleProductSelectFromPanel}
                isClosing={isSearchPanelClosing}
            />

            {isProjectInfoOpen && (
                <ProjectInfo
                    onClose={() => setIsProjectInfoOpen(false)}
                    isClosing={isProjectInfoClosing}
                />
            )}

            {/* NOWY KOMPONENT ZGŁASZANIA PROBLEMÓW */}
            {isReportProblemOpen && (
                <ReportProblemPanel
                    isOpen={isReportProblemOpen}
                    onClose={() => handleReportProblemToggle()}
                    isClosing={isReportProblemClosing}
                    selectedShop={shopForReport}
                />
            )}

            {!dataLoaded && !loading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '24px', borderRadius: '16px', textAlign: 'center', maxWidth: '300px', width: '90%', zIndex: 1000 }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>🏪 dzik_map</h2>
                    <p style={{ margin: '0 0 20px 0', lineHeight: '1.4' }}>Włącz lokalizację aby zobaczyć odległości do punktów</p>
                    <button onClick={requestRealLocation} style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', margin: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s', width: '100%' }}>📍 Włącz lokalizację</button>
                    <button onClick={() => { const WAW = {lat: 52.2319, lon: 21.0067}; setUserLoc(WAW); setHasRealLocation(false); }} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', margin: '8px', cursor: 'pointer', fontSize: '16px', transition: 'background-color 0.2s', width: '100%' }}>🗺️ Przeglądaj bez lokalizacji</button>
                </div>
            )}

            {loading && (
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 0, 0, 0.7)', color: 'white', padding: '12px 24px', borderRadius: '20px', zIndex: 1000 }}>
                    Ładowanie punktów...
                </div>
            )}

            {error && (
                <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, maxWidth: '90%' }}>
                    ⚠️ {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: '12px', cursor: 'pointer', background: 'none', border: 'none', color: 'white', fontSize: '18px' }}>×</button>
                </div>
            )}
        </div>
    );
};

export default ShopFinder;