import React, { useEffect, useState } from 'react';
import { Shop } from '../services/api';
import { getShopGradient } from './ShopIcons';
import {XMarkIcon} from "@heroicons/react/24/outline";
import ReportProblemPanel from './ReportProblemPanel';

// Mapowanie kategorii na przyjazne nazwy
const categoryLabels = {
    energy_drink: '⚡ Energy Drink',
    zero_caffeine_drink: '🚫🔋 Zero Caffeine',
    vitamine_boost: '💊 Vitamin Boost',
    vitamine_drink: '🧃 Vitamin Drink'
};

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
    // Jeśli nie ma lokalizacji lub lokalizacja nie jest prawdziwa
    if (!userLocation || !hasRealLocation) {
        return (
            <span style={{
                color: '#ffffff',
                fontSize: '14px',
                backgroundColor: '#000000',
                padding: '6px 12px',
                borderRadius: '12px'
            }}>
        Włącz lokalizację aby widzieć dystans
      </span>
        );
    }

    const distanceInMeters = shop.distance_from_user !== undefined
        ? shop.distance_from_user
        : calculateDistance(userLocation.lat, userLocation.lon, shop.lat, shop.lon);

    const formattedDistance = formatDistance(distanceInMeters);

    let backgroundColor = '';
    if (distanceInMeters <= 2000) {
        backgroundColor = '#22c55e';
    } else if (distanceInMeters <= 5000) {
        backgroundColor = '#f59e0b';
    } else {
        backgroundColor = '#ef4444';
    }

    return (
        <span style={{
            backgroundColor,
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
      {formattedDistance}
    </span>
    );
};

interface ShopCardProps {
    shop: Shop | null;
    userLocation: { lat: number; lon: number } | null;
    onClose: () => void;
    hasRealLocation: boolean;
    onReportProblemOpen?: (shop?: Shop) => void; // Dodany prop
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, userLocation, onClose, hasRealLocation, onReportProblemOpen }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isReportPanelOpen, setIsReportPanelOpen] = useState(false);
    const [isReportPanelClosing, setIsReportPanelClosing] = useState(false);

    useEffect(() => {
        if (shop) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [shop]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Obsługa przeciągania
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

    // Funkcja do otwierania Google Maps z trasą
    const openGoogleMapsRoute = () => {
        if (!userLocation || !shop) return;
        const googleMapsUrl = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lon}/${shop.lat},${shop.lon}`;
        window.open(googleMapsUrl, '_blank');
    };

    // Funkcja do zgłoszenia problemu
    const reportProblem = () => {
        // Zamknij ShopCard przed otwarciem panelu zgłoszeń
        setIsVisible(false);
        setTimeout(() => {
            // Przekaż informację o wybranym sklepie do komponentu nadrzędnego
            if (typeof onReportProblemOpen === 'function') {
                onReportProblemOpen(shop || undefined);
            } else {
                // Fallback na wypadek gdyby props nie był dostępny
                setIsReportPanelOpen(true);
            }
        }, 300); // Zwiększono z 200ms do 300ms
    };

    const handleCloseReportPanel = () => {
        setIsReportPanelClosing(true);
        setTimeout(() => {
            setIsReportPanelOpen(false);
            setIsReportPanelClosing(false);
            // Przywróć ShopCard po zamknięciu panelu zgłoszeń
            setIsVisible(true);
        }, 400);
    };

    if (!shop) return null;

    const shopGradient = getShopGradient(shop.chain);
    const isBiedronka = shop.chain?.toLowerCase() === 'biedronka';

    // Filtrowanie produktów na podstawie wybranej kategorii
    const filteredProducts = selectedCategory === 'all'
        ? shop.products || []
        : (shop.products || []).filter(product => product.category === selectedCategory);

    // Unikalne kategorie dostępne w produktach
    const availableCategories = Array.from(new Set((shop.products || []).map(product => product.category)));

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 9998,
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                }}
                onClick={handleBackdropClick}
            />
            {/* Card Container */}
            <div
                style={{
                    position: 'fixed',
                    left: '50%',
                    transform: `translateX(-50%) ${isVisible ? `translateY(${currentY}px)` : 'translateY(100%)'}`,
                    bottom: 0,
                    zIndex: 9999,
                    width: '100%',
                    maxWidth: window.innerWidth >= 1024 ? '900px' : '600px',
                    transition: isDragging ? 'none' : 'transform 0.2s ease'
                }}
            >
                <div
                    style={{
                        background: 'white',
                        borderRadius: '24px 24px 0 0',
                        maxHeight: '70vh',
                        width: '100%',
                        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.15)',
                        overflow: 'hidden',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        position: 'relative'
                    }}
                    onMouseDown={handleCardMouseDown}
                    onTouchStart={handleCardTouchStart}
                    onTouchMove={handleCardTouchMove}
                    onTouchEnd={handleCardTouchEnd}
                >
                    {/* Handle Bar */}
                    <div style={{
                        textAlign: 'center',
                        padding: '16px 0 8px',
                        color: '#9ca3af'
                    }}>
                        <div style={{
                            width: '50px',
                            height: '5px',
                            background: '#d1d5db',
                            borderRadius: '3px',
                            margin: '0 auto'
                        }} />
                    </div>
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    {/* Content */}
                    <div
                        style={{
                            padding: '0 24px 0px',
                            maxHeight: 'calc(75vh - 80px)',
                            overflowY: 'auto',
                            cursor: 'default'
                        }}
                        className="scrollbar-hidden"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        {/* Header Section */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            marginBottom: '24px',
                            padding: '20px',
                            background: shopGradient,
                            borderRadius: '16px',
                            color: isBiedronka ? 'black' : 'white'
                        }}>
                            {/* Logo - jeszcze większe */}
                            <div
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                {shop.logo_url ? (
                                    <img
                                        src={shop.logo_url}
                                        alt={`${shop.chain} logo`}
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            objectFit: 'contain'
                                        }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '36px', fontWeight: 'bold' }}>
                    {shop.chain.substring(0, 2).toUpperCase()}
                  </span>
                                )}
                            </div>
                            {/* Shop Info */}
                            <div style={{ flex: 1 }}>
                                <h2 style={{
                                    fontSize: '24px',
                                    fontWeight: '800',
                                    margin: '0 0 8px 0',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}>
                                    {shop.name}
                                </h2>
                                <p style={{
                                    fontSize: '14px',
                                    margin: '0 0 12px 0',
                                    opacity: 0.9
                                }}>
                                    {shop.address || 'Brak adresu'}
                                </p>
                                {/* Distance and Navigation */}
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    {getDisplayDistance(shop, userLocation, hasRealLocation)}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openGoogleMapsRoute();
                                        }}
                                        style={{
                                            background: isBiedronka ? 'black' : 'rgba(255, 255, 255, 0.2)',
                                            color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isBiedronka) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isBiedronka) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                            }
                                        }}
                                    >
                                        🗺️ Nawiguj
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Products Section */}
                        {shop.products && shop.products.length > 0 ? (
                            <>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '20px'
                                }}>
                                    <h3 style={{
                                        fontSize: '22px',
                                        fontWeight: '700',
                                        margin: 0,
                                        color: '#1f2937'
                                    }}>
                                        Dostępne produkty
                                    </h3>
                                    <span style={{
                                        backgroundColor: '#e5e7eb',
                                        color: '#6b7280',
                                        padding: '6px 14px',
                                        borderRadius: '16px',
                                        fontSize: '13px',
                                        fontWeight: '700'
                                    }}>
                    {filteredProducts.length}
                  </span>
                                </div>
                                {/* Category Filters */}
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    marginBottom: '20px',
                                    overflowX: 'auto',
                                    paddingBottom: '8px'
                                }}>
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        style={{
                                            background: selectedCategory === 'all' ? '#3b82f6' : '#f3f4f6',
                                            color: selectedCategory === 'all' ? 'white' : '#6b7280',
                                            border: 'none',
                                            padding: '10px 16px',
                                            borderRadius: '20px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s ease',
                                            minWidth: 'fit-content'
                                        }}
                                    >
                                        Wszystkie
                                    </button>
                                    {availableCategories.map(category => (
                                        <button
                                            key={category}
                                            onClick={() => setSelectedCategory(category)}
                                            style={{
                                                background: selectedCategory === category ? '#3b82f6' : '#f3f4f6',
                                                color: selectedCategory === category ? 'white' : '#6b7280',
                                                border: 'none',
                                                padding: '10px 16px',
                                                borderRadius: '20px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.2s ease',
                                                minWidth: 'fit-content'
                                            }}
                                        >
                                            {categoryLabels[category as keyof typeof categoryLabels] || category}
                                        </button>
                                    ))}
                                </div>
                                {/* Products Grid or Empty State */}
                                {filteredProducts.length > 0 ? (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: window.innerWidth < 640
                                                ? '1fr'
                                                : window.innerWidth < 1024
                                                    ? 'repeat(2, 1fr)'
                                                    : 'repeat(4, 1fr)',
                                            gap: '16px',
                                            marginBottom: '10px'
                                        }}
                                    >
                                        {filteredProducts.map((product, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    background: 'white',
                                                    border: '2px solid #f3f4f6',
                                                    borderRadius: '16px',
                                                    padding: '16px',
                                                    textAlign: 'center',
                                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                                                    transition: 'all 0.2s ease',
                                                    minHeight: '220px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                                                    e.currentTarget.style.borderColor = '#d1d5db';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                                                    e.currentTarget.style.borderColor = '#f3f4f6';
                                                }}
                                            >
                                                {/* Product Image */}
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        height: '120px',
                                                        borderRadius: '12px',
                                                        overflow: 'hidden',
                                                        marginBottom: '12px',
                                                        background: '#f8fafc',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    {product.photo_url ? (
                                                        <img
                                                            src={product.photo_url}
                                                            alt={product.name}
                                                            style={{
                                                                maxWidth: '100%',
                                                                maxHeight: '100%',
                                                                objectFit: 'contain'
                                                            }}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: '36px', color: '#9ca3af' }}>🥤</span>
                                                    )}
                                                </div>
                                                {/* Product Name z prefiksem DZIK® */}
                                                <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    color: '#1f2937',
                                                    lineHeight: '1.3'
                                                }}>
                                                    DZIK® {product.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 20px',
                                        color: '#6b7280'
                                    }}>
                                        <div style={{
                                            fontSize: '48px',
                                            marginBottom: '16px'
                                        }}>
                                            🤷‍♂️
                                        </div>
                                        <h3 style={{
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            margin: '0 0 8px 0',
                                            color: '#374151'
                                        }}>
                                            Nic tu jeszcze nie ma...
                                        </h3>
                                        <p style={{
                                            fontSize: '16px',
                                            margin: 0,
                                            color: '#6b7280'
                                        }}>
                                            Ale może kiedyś?
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                color: '#9ca3af',
                                background: '#f9fafb',
                                borderRadius: '16px',
                                marginBottom: '32px'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
                                <p style={{ fontSize: '16px', margin: 0 }}>
                                    W tym sklepie nie ma aktualnie dostępnych produktów
                                </p>
                            </div>
                        )}
                        {/* Sekcja zgłaszania na dole karty */}
                        <div style={{
                            padding: '5px',
                            marginBottom: '50px',
                            textAlign: 'center'
                        }}>
                            {/* Tekst informacyjny */}
                            <p style={{
                                color: '#6b7280',
                                fontSize: '14px',
                                margin: '0 0 16px 0',
                                lineHeight: '1.5'
                            }}>
                                Sklep nieistnieje? Błędna lokalizacja?<br />
                                Zgłoś nam problem a my się wszystkim zajmiemy!
                            </p>
                            {/* Przycisk zgłoszenia */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    reportProblem();
                                }}
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '24px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#dc2626';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                                }}
                            >
                                ⚠️ Zgłoś problem
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Panel zgłaszania problemów */}
            {isReportPanelOpen && (
                <ReportProblemPanel
                    isOpen={isReportPanelOpen}
                    onClose={handleCloseReportPanel}
                    isClosing={isReportPanelClosing}
                    selectedShop={shop}
                />
            )}
            {/* Hide scrollbar styles */}
            <style>
                {`
          .scrollbar-hidden {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .scrollbar-hidden::-webkit-scrollbar {
            display: none;
          }
        `}
            </style>
        </>
    );
};

export default ShopCard;