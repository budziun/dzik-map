// eslint-disable-next-line
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Shop,
    getAllShopsOptimized,
    OptimizedResponse,
    inflateShop
} from '../services/api';
import MapComponent from './MapComponent';
import BottomMenu from './BottomMenu';
import ShopCard from './ShopCard';
import ShopList from './ShopList';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import ProjectInfo from './ProjectInfo';
import SearchPanel from './SearchPanel';
import ReportProblemPanel from './ReportProblemPanel';

// --- INTERFEJSY ---
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

interface SearchedProduct {
    id: number;
    name: string;
    flavor: string;
    category: string;
    full_name: string;
    photo_url: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const ShopFinder: React.FC = () => {
    // --- STANY DANYCH (ZOPTORMALIZOWANE) ---
    const [rawData, setRawData] = useState<OptimizedResponse | null>(null);
    const [visibleShops, setVisibleShops] = useState<Shop[]>([]);

    // --- STANY UI (TWOJE ORYGINALNE) ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLoc, setUserLoc] = useState<{lat:number;lon:number}|null>(null);
    const [hasRealLocation, setHasRealLocation] = useState(false);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

    // Panele
    const [isShopListOpen, setIsShopListOpen] = useState(false);
    const [isShopListClosing, setIsShopListClosing] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isFilterPanelClosing, setIsFilterPanelClosing] = useState(false);
    const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);
    const [isProjectInfoClosing, setIsProjectInfoClosing] = useState(false);
    const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
    const [isSearchPanelClosing, setIsSearchPanelClosing] = useState(false);
    const [isReportProblemOpen, setIsReportProblemOpen] = useState(false);
    const [isReportProblemClosing, setIsReportProblemClosing] = useState(false);
    const [shopForReport, setShopForReport] = useState<Shop | null>(null);

    // Filtry
    const [selectedShopFilters, setSelectedShopFilters] = useState<string[]>([]);
    const [selectedProductFilters, setSelectedProductFilters] = useState<number[]>([]);
    const [selectedProductCategories, setSelectedProductCategories] = useState<string[]>([]);
    const [shopFilters, setShopFilters] = useState<ShopFilter[]>([]);
    const [productFilters, setProductFilters] = useState<ProductFilter[]>([]);

    // --- LOKALIZACJA (LOGIKA Z TWOJEGO PLIKU) ---
    const saveRealLocation = (location: {lat: number; lon: number}) => {
        localStorage.setItem('userLocation', JSON.stringify(location));
        localStorage.setItem('isRealLocation', 'true');
    };

    const requestRealLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolokalizacja nieobsługiwana');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            ({coords}) => {
                const loc = {lat: coords.latitude, lon: coords.longitude};
                setUserLoc(loc);
                setHasRealLocation(true);
                setLocationPermissionStatus('granted');
                saveRealLocation(loc);
            },
            (err) => {
                console.warn(err);
                setLocationPermissionStatus('denied');
                alert('Błąd lokalizacji. Sprawdź uprawnienia.');
            },
            {enableHighAccuracy: true, timeout: 10000}
        );
    };

    // Inicjalizacja lokalizacji z localStorage
    useEffect(() => {
        const savedLoc = localStorage.getItem('userLocation');
        const savedIsReal = localStorage.getItem('isRealLocation') === 'true';
        if (savedLoc && savedIsReal) {
            try {
                setUserLoc(JSON.parse(savedLoc));
                setHasRealLocation(true);
            } catch (e) { localStorage.clear(); }
        } else {
            // Domyślna Warszawa
            setUserLoc({lat: 52.2319, lon: 21.0067});
        }
    }, []);

    // Watcher uprawnień
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setLocationPermissionStatus(result.state as any);
                result.onchange = () => setLocationPermissionStatus(result.state as any);
            });
        }
    }, []);

    // --- INICJALIZACJA DANYCH (NOWA - SZYBKA) ---
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const data = await getAllShopsOptimized();
                setRawData(data);

                // Budowanie filtrów z szablonów (BŁYSKAWICZNE)
                const uniqueShops: ShopFilter[] = Object.values(data.t).map(t => ({
                    id: t.chain,
                    name: t.chain.charAt(0).toUpperCase() + t.chain.slice(1),
                    chain: t.chain,
                    logo_url: t.logo || undefined
                }));
                // Usuwanie duplikatów nazw
                const uniqueMap = new Map();
                uniqueShops.forEach(s => uniqueMap.set(s.id, s));
                setShopFilters(Array.from(uniqueMap.values()));

                const pMap = new Map<number, ProductFilter>();
                Object.values(data.t).forEach(t => {
                    t.products.forEach(p => {
                        if (!pMap.has(p.id)) pMap.set(p.id, { id: p.id, name: p.n, flavor: p.f, photo_url: p.p, category: p.c });
                    });
                });
                setProductFilters(Array.from(pMap.values()).sort((a,b) => a.name.localeCompare(b.name)));

            } catch (e) {
                setError('Błąd pobierania danych');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // --- LOGIKA FILTROWANIA (NOWA - USEMEMO) ---
    const filteredAndInflatedShops = useMemo(() => {
        if (!rawData) return [];

        // 1. Filtrowanie surowych danych (tablic)
        const filteredRaw = rawData.s.filter(shopRaw => {
            const templateId = shopRaw[2];
            const template = rawData.t[templateId];
            if (!template) return false;

            if (selectedShopFilters.length > 0 && !selectedShopFilters.includes(template.chain)) return false;

            if (selectedProductFilters.length > 0) {
                if (!template.products.some(p => selectedProductFilters.includes(p.id))) return false;
            }

            if (selectedProductCategories.length > 0) {
                if (!template.products.some(p => selectedProductCategories.includes(p.c))) return false;
            }
            return true;
        });

        // 2. Zamiana na obiekty ("Inflation") tylko dla wyników
        const inflated = filteredRaw.map(raw => {
            const shop = inflateShop(raw, rawData.t);
            if (userLoc && hasRealLocation) {
                shop.distance_from_user = calculateDistance(userLoc.lat, userLoc.lon, shop.lat, shop.lon);
            }
            return shop;
        });

        // 3. Sortowanie
        if (userLoc && hasRealLocation) {
            inflated.sort((a, b) => (a.distance_from_user || 0) - (b.distance_from_user || 0));
        }

        return inflated;
    }, [rawData, selectedShopFilters, selectedProductFilters, selectedProductCategories, userLoc, hasRealLocation]);

    useEffect(() => setVisibleShops(filteredAndInflatedShops), [filteredAndInflatedShops]);

    // --- HANDLERS PANELI (TWOJE ORYGINALNE - Z LOGIKĄ ZAMYKANIA) ---
    const closeAllPanels = (exclude?: string) => {
        if (exclude !== 'info' && isProjectInfoOpen) { setIsProjectInfoClosing(true); setTimeout(() => { setIsProjectInfoOpen(false); setIsProjectInfoClosing(false); }, 400); }
        if (exclude !== 'list' && isShopListOpen) { setIsShopListClosing(true); setTimeout(() => { setIsShopListOpen(false); setIsShopListClosing(false); }, 400); }
        if (exclude !== 'filter' && isFilterPanelOpen) { setIsFilterPanelClosing(true); setTimeout(() => { setIsFilterPanelOpen(false); setIsFilterPanelClosing(false); }, 400); }
        if (exclude !== 'search' && isSearchPanelOpen) { setIsSearchPanelClosing(true); setTimeout(() => { setIsSearchPanelOpen(false); setIsSearchPanelClosing(false); }, 300); }
        if (exclude !== 'report' && isReportProblemOpen) { setIsReportProblemClosing(true); setTimeout(() => { setIsReportProblemOpen(false); setIsReportProblemClosing(false); }, 400); }
    };

    const handleShopListToggle = () => {
        if (!isShopListOpen) { closeAllPanels('list'); setIsShopListOpen(true); }
        else { setIsShopListClosing(true); setTimeout(() => { setIsShopListOpen(false); setIsShopListClosing(false); }, 400); }
    };

    const handleFilterPanelToggle = () => {
        if (!isFilterPanelOpen) { closeAllPanels('filter'); setIsFilterPanelOpen(true); }
        else { setIsFilterPanelClosing(true); setTimeout(() => { setIsFilterPanelOpen(false); setIsFilterPanelClosing(false); }, 400); }
    };

    const handleProjectInfoToggle = () => {
        if (!isProjectInfoOpen) { closeAllPanels('info'); setIsProjectInfoOpen(true); }
        else { setIsProjectInfoClosing(true); setTimeout(() => { setIsProjectInfoOpen(false); setIsProjectInfoClosing(false); }, 400); }
    };

    const handleSearchPanelToggle = () => {
        if (!isSearchPanelOpen) { closeAllPanels('search'); setIsSearchPanelOpen(true); }
        else { setIsSearchPanelClosing(true); setTimeout(() => { setIsSearchPanelOpen(false); setIsSearchPanelClosing(false); }, 300); }
    };

    const handleReportProblemToggle = (shop?: Shop | null) => {
        if (!isReportProblemOpen) {
            closeAllPanels('report');
            setShopForReport(shop || null);
            setIsReportProblemOpen(true);
        } else {
            setIsReportProblemClosing(true);
            setTimeout(() => { setIsReportProblemOpen(false); setIsReportProblemClosing(false); setShopForReport(null); }, 400);
        }
    };

    const handleProductSelectFromPanel = (product: SearchedProduct) => {
        if (!selectedProductFilters.includes(product.id)) {
            setSelectedProductFilters(prev => [...prev, product.id]);
        }
        setIsSearchPanelOpen(false);
        setIsShopListOpen(true); // Otwórz listę z wynikami
    };

    const handleLocationSearchFromPanel = (lat: number, lon: number, displayName: string) => {
        setUserLoc({ lat, lon });
        setHasRealLocation(false);
        setIsSearchPanelOpen(false);
        // Tutaj można dodać centrowanie mapy (przekazanie stanu do MapComponent)
    };

    // --- RENDER ---
    return (
        <div className="relative w-full h-screen overflow-hidden bg-gray-100">
            <MapComponent
                userLocation={userLoc}
                shops={visibleShops}
                onLocationFound={(lat, lon) => {
                    const loc = {lat, lon};
                    setUserLoc(loc);
                    setHasRealLocation(true);
                    saveRealLocation(loc);
                }}
                onMapMove={() => {}} // Placeholder
                onRadiusChange={() => {}} // Placeholder
                loading={loading}
                hasRealLocation={hasRealLocation}
                onShopSelect={(shop) => { setSelectedShop(shop); setIsShopListOpen(false); }}
                // Dodaj props do centrowania jeśli MapComponent go obsługuje
                // center={...}
            />

            <BottomMenu
                onFilterChange={() => {}}
                currentFilter="all"
                shopCount={visibleShops.length}
                loading={loading}
                hasRealLocation={hasRealLocation}
                locationPermissionStatus={locationPermissionStatus}
                isShopCardOpen={!!selectedShop}
                isShopListOpen={isShopListOpen}
                onLocationToggle={() => {
                    if (hasRealLocation) {
                        setHasRealLocation(false);
                        localStorage.removeItem('userLocation');
                        localStorage.removeItem('isRealLocation');
                        setUserLoc({lat: 52.2319, lon: 21.0067}); // Reset do WAW
                    } else {
                        requestRealLocation();
                    }
                }}
                onShopListOpen={handleShopListToggle}
                onFilterPanelOpen={handleFilterPanelToggle}
                isFilterPanelOpen={isFilterPanelOpen}
                activeFiltersCount={selectedShopFilters.length + selectedProductFilters.length + selectedProductCategories.length}
                onInfoOpen={handleProjectInfoToggle}
                isProjectInfoOpen={isProjectInfoOpen}
                onSearchOpen={handleSearchPanelToggle}
                isSearchPanelOpen={isSearchPanelOpen}
                onReportProblemOpen={() => handleReportProblemToggle(null)}
                isReportProblemOpen={isReportProblemOpen}
            />

            {/* LISTA SKLEPÓW */}
            {isShopListOpen && (
                <ShopList
                    shops={visibleShops}
                    userLocation={userLoc}
                    onClose={() => handleShopListToggle()}
                    hasRealLocation={hasRealLocation}
                    onShopSelect={(shop) => { setSelectedShop(shop); setIsShopListOpen(false); }}
                    loading={loading}
                    isClosing={isShopListClosing}
                />
            )}

            {/* KARTA SKLEPU */}
            {selectedShop && (
                <ShopCard
                    shop={selectedShop}
                    userLocation={userLoc}
                    hasRealLocation={hasRealLocation}
                    onClose={() => setSelectedShop(null)}
                    onReportProblemOpen={(shop) => handleReportProblemToggle(shop)}
                />
            )}

            {/* FILTRY */}
            {isFilterPanelOpen && (
                <AdvancedFilterPanel
                    isOpen={isFilterPanelOpen}
                    onClose={handleFilterPanelToggle}
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
            )}

            {/* WYSZUKIWARKA */}
            <SearchPanel
                isOpen={isSearchPanelOpen}
                onClose={handleSearchPanelToggle}
                onLocationSearch={handleLocationSearchFromPanel}
                onProductSelect={handleProductSelectFromPanel}
                isClosing={isSearchPanelClosing}
            />

            {/* INFO */}
            {isProjectInfoOpen && (
                <ProjectInfo
                    onClose={handleProjectInfoToggle}
                    isClosing={isProjectInfoClosing}
                />
            )}

            {/* ZGŁASZANIE PROBLEMU */}
            {isReportProblemOpen && (
                <ReportProblemPanel
                    isOpen={isReportProblemOpen}
                    onClose={() => handleReportProblemToggle()}
                    isClosing={isReportProblemClosing}
                    selectedShop={shopForReport}
                />
            )}

            {/* --- EKRAN POWITALNY (Z TWOJEGO ORYGINAŁU) --- */}
            {!rawData && !loading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '24px', borderRadius: '16px', textAlign: 'center', maxWidth: '300px', width: '90%', zIndex: 1000 }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>🏪 dzik_map</h2>
                    <p style={{ margin: '0 0 20px 0', lineHeight: '1.4' }}>Włącz lokalizację aby zobaczyć odległości do punktów</p>
                    <button onClick={requestRealLocation} style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', margin: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s', width: '100%' }}>📍 Włącz lokalizację</button>
                    <button onClick={() => { setUserLoc({lat: 52.2319, lon: 21.0067}); setHasRealLocation(false); }} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', margin: '8px', cursor: 'pointer', fontSize: '16px', transition: 'background-color 0.2s', width: '100%' }}>🗺️ Przeglądaj bez lokalizacji</button>
                </div>
            )}

            {loading && (
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 0, 0, 0.7)', color: 'white', padding: '12px 24px', borderRadius: '20px', zIndex: 1000 }}>
                    Ładowanie punktów...
                </div>
            )}

            {error && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ShopFinder;