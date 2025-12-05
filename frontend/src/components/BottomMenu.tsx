import React from 'react';
import {
    MapPinIcon as MapPinIconOutline,
    ListBulletIcon as ListBulletIconOutline,
    FunnelIcon as FunnelIconOutline,
    InformationCircleIcon as InformationCircleIconOutline,
    MagnifyingGlassIcon as MagnifyingGlassIconOutline,
} from '@heroicons/react/24/outline';
import {
    MapPinIcon as MapPinIconSolid,
    ListBulletIcon as ListBulletIconSolid,
    FunnelIcon as FunnelIconSolid,
    InformationCircleIcon as InformationCircleIconSolid,
    MagnifyingGlassIcon as MagnifyingGlassIconSolid,

} from '@heroicons/react/24/solid';

interface BottomMenuProps {
    onFilterChange: (filter: string) => void;
    currentFilter: string;
    shopCount: number;
    loading: boolean;
    hasRealLocation?: boolean;
    locationPermissionStatus?: 'prompt' | 'granted' | 'denied';
    onLocationToggle?: () => void;
    isShopCardOpen?: boolean;
    isShopListOpen?: boolean;
    onShopListOpen?: () => void;
    onFilterPanelOpen?: () => void;
    isFilterPanelOpen?: boolean;
    activeFiltersCount?: number;
    onInfoOpen?: () => void;
    onSearchOpen?: () => void;
    isProjectInfoOpen?: boolean;
    isSearchPanelOpen?: boolean;
    onReportProblemOpen?: () => void; // NOWY PROP
    isReportProblemOpen?: boolean; // NOWY PROP
}

const BottomMenu: React.FC<BottomMenuProps> = ({
                                                   onFilterChange,
                                                   currentFilter,
                                                   shopCount,
                                                   loading,
                                                   hasRealLocation = false,
                                                   locationPermissionStatus = 'prompt',
                                                   onLocationToggle = () => {},
                                                   isShopCardOpen = false,
                                                   isShopListOpen = false,
                                                   onShopListOpen = () => {},
                                                   onFilterPanelOpen = () => {},
                                                   isFilterPanelOpen = false,
                                                   activeFiltersCount = 0,
                                                   onInfoOpen = () => {},
                                                   onSearchOpen = () => {},
                                                   isProjectInfoOpen = false,
                                                   isSearchPanelOpen = false,
                                                   onReportProblemOpen = () => {}, // NOWY PROP Z WARTOŚCIĄ DOMYŚLNĄ
                                                   isReportProblemOpen = false, // NOWY PROP Z WARTOŚCIĄ DOMYŚLNĄ
                                               }) => {
    // Ukryj menu gdy ShopCard jest otwarta
    if (isShopCardOpen) {
        return null;
    }

    // Komponenty ikon z pięknym stylingiem
    const LocationIcon = ({ isActive }: { isActive: boolean }) => {
        if (isActive) {
            return <MapPinIconSolid className="w-7 h-7 text-green-400 drop-shadow-lg" />;
        }
        if (locationPermissionStatus === 'denied') {
            return <MapPinIconOutline className="w-7 h-7 text-red-400 drop-shadow-lg" strokeWidth="2.5" />;
        }
        return <MapPinIconOutline className="w-7 h-7 text-white drop-shadow-lg" strokeWidth="2.5" />;
    };

    const getLocationTitle = () => {
        if (hasRealLocation) return 'Lokalizacja włączona - kliknij aby wyłączyć';
        if (locationPermissionStatus === 'denied') return 'Brak uprawnień - kliknij aby spróbować ponownie';
        return 'Kliknij aby włączyć lokalizację';
    };

    return (
        <>
            {/* Główny floating bar - 6 pięknych ikon (dodano ikonę zgłoszenia problemu) */}
            <div className="fixed bottom-4 left-4 right-4" style={{ zIndex: 100_000 }}>
                <div className="mx-auto max-w-sm rounded-full px-2 py-2 shadow-xl backdrop-blur-md bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700">
                    <div className="flex items-center justify-between">
                        {/* 1. Lokalizacja */}
                        <button
                            onClick={onLocationToggle}
                            className="group relative p-1.5 rounded-full transition-all duration-300 hover:bg-white/20 hover:scale-110 active:scale-95"
                            title={getLocationTitle()}
                        >
                            <LocationIcon isActive={hasRealLocation} />
                            <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>

                        {/* 2. Lista sklepów */}
                        <button
                            onClick={onShopListOpen}
                            className="group relative p-1.5 rounded-full transition-all duration-300 hover:bg-white/20 hover:scale-110 active:scale-95"
                            title="Lista najbliższych sklepów"
                        >
                            {isShopListOpen ? (
                                <ListBulletIconSolid className="w-7 h-7 text-green-400 drop-shadow-lg" />
                            ) : (
                                <ListBulletIconOutline className="w-7 h-7 text-white drop-shadow-lg" strokeWidth="2.5" />
                            )}
                            <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>

                        {/* 3. Filtry */}
                        <button
                            onClick={onFilterPanelOpen}
                            className="group relative p-1.5 rounded-full transition-all duration-300 hover:bg-white/20 hover:scale-110 active:scale-95"
                            title="Filtry"
                        >
                            {isFilterPanelOpen ? (
                                <FunnelIconSolid className="w-7 h-7 text-green-400 drop-shadow-lg" />
                            ) : activeFiltersCount > 0 ? (
                                <FunnelIconSolid className="w-7 h-7 text-white"  />
                            ) : (
                                <FunnelIconOutline className="w-7 h-7 text-white" />
                            )}
                            {/* Wskaźnik aktywnych filtrów */}
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                    {activeFiltersCount}
                                </span>
                            )}
                            <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>

                        {/* 4. Info */}
                        <button
                            onClick={onInfoOpen}
                            className="group relative p-1.5 rounded-full transition-all duration-300 hover:bg-white/20 hover:scale-110 active:scale-95"
                            title="Informacje o aplikacji"
                        >
                            {isProjectInfoOpen ? (
                                <InformationCircleIconSolid className="w-7 h-7 text-green-400 drop-shadow-lg" />
                            ) : (
                                <InformationCircleIconOutline className="w-7 h-7 text-white drop-shadow-lg" strokeWidth="2.5" />
                            )}
                            <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>

                        {/* 5. Wyszukiwarka */}
                        <button
                            onClick={onSearchOpen}
                            className="group relative p-1.5 rounded-full transition-all duration-300 hover:bg-white/20 hover:scale-110 active:scale-95"
                            title="Wyszukaj miejsca i produkty"
                        >
                            {isSearchPanelOpen ? (
                                <MagnifyingGlassIconSolid className="w-7 h-7 text-green-400" />
                            ) : (
                                <MagnifyingGlassIconOutline className="w-7 h-7 text-white " strokeWidth="2.5" />
                            )}
                            <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>


                        {/* Loading spinner */}
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent drop-shadow-lg"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default BottomMenu;