import React, { useEffect, useState } from 'react';
import { Shop } from '../services/api';
import {XMarkIcon} from "@heroicons/react/24/outline";

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c * 1000;
    return Math.round(distance);
};

const formatDistance = (distanceInMeters: number): string => {
    if (distanceInMeters >= 1000) {
        const km = distanceInMeters / 1000;
        return km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
    } else {
        return `${Math.round(distanceInMeters)} m`;
    }
};

const getDisplayDistance = (shop: Shop, userLocation: { lat: number; lon: number } | null, hasRealLocation: boolean): React.ReactNode => {
    if (!userLocation || !hasRealLocation) {
        return (
            <span className="text-white text-sm bg-black px-3 py-1 rounded-full">
          Włącz lokalizację
        </span>
        );
    }
    const distanceInMeters = shop.distance_from_user !== undefined
        ? shop.distance_from_user
        : calculateDistance(userLocation.lat, userLocation.lon, shop.lat, shop.lon);
    const formattedDistance = formatDistance(distanceInMeters);
    let bgColor = '';
    if (distanceInMeters <= 2000) {
        bgColor = 'bg-green-500';
    } else if (distanceInMeters <= 5000) {
        bgColor = 'bg-amber-500';
    } else {
        bgColor = 'bg-red-500';
    }
    return (
        <span className={`${bgColor} text-white px-3 py-1 rounded-full text-sm font-bold shadow-md`}>
        {formattedDistance}
      </span>
    );
};

// W komponencie ShopList, zmień interfejs propsów:
interface ShopListProps {
    shops: Shop[];
    userLocation: { lat: number; lon: number } | null;
    onClose: () => void;
    hasRealLocation: boolean;
    onShopSelect: (shop: Shop) => void;
    loading?: boolean;
    isClosing?: boolean; // Nowy prop do sygnalizowania zamykania
}

const ShopList: React.FC<ShopListProps> = ({
                                               shops,
                                               userLocation,
                                               onClose,
                                               hasRealLocation,
                                               onShopSelect,
                                               loading = false,
                                               isClosing = false // Domyślna wartość
                                           }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setIsVisible(true);
        setIsAnimating(true);
        document.body.style.overflow = 'hidden';

        // Zakończ animację po zamontowaniu komponentu
        setTimeout(() => setIsAnimating(false), 300);

        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Dodatkowy useEffect do obsługi zamykania z zewnątrz
    useEffect(() => {
        if (isClosing && isVisible) {
            setIsAnimating(true);
            setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    onClose();
                }, 200);
            }, 100);
        }
    }, [isClosing, isVisible, onClose]);

    const handleClose = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                onClose();
            }, 200);
        }, 100);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Obsługa przeciągania karty
    const handleCardTouchStart = (e: React.TouchEvent) => {
        setStartY(e.touches[0].clientY);
        setCurrentY(0);
        setIsDragging(true);
    };

    const handleCardTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0) {
            setCurrentY(deltaY);
        }
    };

    const handleCardTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (currentY > 80) {
            handleClose();
        } else {
            setCurrentY(0);
        }
    };

    const handleCardMouseDown = (e: React.MouseEvent) => {
        setStartY(e.clientY);
        setCurrentY(0);
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
    };

    const handleCardMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startY;
        if (deltaY > 0) {
            setCurrentY(deltaY);
        }
    };

    const handleCardMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        document.body.style.cursor = '';
        if (currentY > 80) {
            handleClose();
        } else {
            setCurrentY(0);
        }
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleCardMouseMove);
            document.addEventListener('mouseup', handleCardMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleCardMouseMove);
            document.removeEventListener('mouseup', handleCardMouseUp);
        };
    }, [isDragging, startY]); //eslint-disable-line

    // Filtrowanie sklepów
    const filteredShops = shops.filter(shop => {
        const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shop.address.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                style={{
                    opacity: isVisible ? 1 : 0,
                    transition: isAnimating ? 'opacity 0.3s ease' : 'none'
                }}
                onClick={handleBackdropClick}
            />
            {/* Card Container */}
            <div
                className="fixed left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl"
                style={{
                    bottom: 0,
                    transform: `translateX(-50%) ${isVisible ? `translateY(${currentY}px)` : 'translateY(100%)'}`,
                    transition: isAnimating ? 'transform 0.3s ease' : (isDragging ? 'none' : 'transform 0.2s ease')
                }}
            >
                <div
                    className="bg-white rounded-t-3xl shadow-2xl overflow-hidden"
                    style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        maxHeight: '85vh'
                    }}
                    onMouseDown={handleCardMouseDown}
                    onTouchStart={handleCardTouchStart}
                    onTouchMove={handleCardTouchMove}
                    onTouchEnd={handleCardTouchEnd}
                >
                    {/* Handle Bar */}
                    <div className="flex justify-center pt-4 pb-2">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-800">Najbliższe punkty z DZIK® </h2>
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        {/* Search Bar */}
                        <div className="mt-4 relative">
                            <input
                                type="text"
                                placeholder="Szukaj sklepu lub adresu..."
                                className="w-full py-3 px-4 pl-12 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                🔍
                            </div>
                        </div>
                    </div>
                    {/* Shop List */}
                    <div
                        className="overflow-y-auto scrollbar-hidden"
                        style={{ maxHeight: 'calc(85vh - 180px)' }}
                    >
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : filteredShops.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-5xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-gray-700 mb-2">Nie znaleziono sklepów</h3>
                                <p className="text-gray-500">Spróbuj zmienić wyszukiwane hasło</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredShops.slice(0, 50).map((shop, index) => {
                                    const isLastItem = index === filteredShops.slice(0, 50).length - 1;
                                    return (
                                        <div
                                            key={index}
                                            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${isLastItem ? 'mb-20' : ''}`}
                                            onClick={() => onShopSelect(shop)}
                                        >
                                            <div className="flex items-center">
                                                {/* Shop Logo - bez tła */}
                                                {shop.logo_url ? (
                                                    <img
                                                        src={shop.logo_url}
                                                        alt={`${shop.chain} logo`}
                                                        className="w-16 h-16 object-contain flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-gray-700">
                              {shop.chain?.substring(0, 2).toUpperCase()}
                            </span>
                                                    </div>
                                                )}
                                                {/* Shop Info */}
                                                <div className="ml-4 flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-gray-800 truncate">{shop.name}</h3>
                                                        {getDisplayDistance(shop, userLocation, hasRealLocation)}
                                                    </div>
                                                    <p className="text-sm text-gray-500 truncate mt-1">{shop.address}</p>
                                                    <div className="flex items-center mt-2">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                                shop.products && shop.products.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                            }`}></span>
                                                        <span className="text-xs text-gray-500">
                              {shop.products && shop.products.length > 0
                                  ? `${shop.products.length} produktów`
                                  : 'Brak produktów'}
                            </span>
                                                    </div>
                                                </div>
                                                {/* Chevron */}
                                                <div className="text-gray-400">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div className="py-3 px-6 border-t border-gray-200 bg-gray-50 text-center">
                        <p className="text-xs text-gray-500">
                            Wyświetlono {Math.min(filteredShops.length, 50)} z {filteredShops.length} sklepów
                        </p>
                    </div>
                </div>
            </div>
            {/* Style dla ukrywania scrollbar */}
            <style>{`
        .scrollbar-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </>
    );
};

export default ShopList;