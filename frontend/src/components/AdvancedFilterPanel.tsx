import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Interfejsy przeniesione z ShopFinder
interface ShopFilter {
    id: string;
    name: string;
    chain: string;
    logo_url?: string;
}
interface ProductFilter {
    id: number;
    name: string;
    photo_url: string;
    category: string;
}
interface CategoryFilter {
    id: string;
    name: string;
    icon: string;
}
interface AdvancedFilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedShops: string[];
    setSelectedShops: (shops: string[]) => void;
    selectedProducts: number[];
    setSelectedProducts: (products: number[]) => void;
    selectedCategories: string[];
    setSelectedCategories: (categories: string[]) => void;
    shopFilters: ShopFilter[];
    productFilters: ProductFilter[];
    userLocation?: { lat: number; lon: number } | null;
    isClosing?: boolean; // Nowy prop do sygnalizowania zamykania
}

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
                                                                     isOpen,
                                                                     onClose,
                                                                     selectedShops,
                                                                     setSelectedShops,
                                                                     selectedProducts,
                                                                     setSelectedProducts,
                                                                     selectedCategories,
                                                                     setSelectedCategories,
                                                                     shopFilters,
                                                                     productFilters,
                                                                     userLocation,
                                                                     isClosing = false // Domyślna wartość
                                                                 }) => {
    const [activeTab, setActiveTab] = useState<'shops' | 'products'>('products');
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsAnimating(true);
            document.body.style.overflow = 'hidden';
            // Zakończ animację po zamontowaniu komponentu
            setTimeout(() => setIsAnimating(false), 300);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

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
        document.body.style.setProperty('cursor', '');
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

    const productCategories: CategoryFilter[] = [
        { id: 'energy_drink', name: 'Energy Drink', icon: '⚡' },
        { id: 'vitamine_boost', name: 'Vitamin Boost', icon: '💊' },
        { id: 'vitamine_drink', name: 'Vitamin Drink', icon: '🧃' },
        { id: 'zero_caffeine_drink', name: 'Zero Caffeine', icon: '🚫🔋' },
    ];

    const handleShopToggle = (shopId: string) => {
        if (selectedShops.includes(shopId)) {
            setSelectedShops(selectedShops.filter(id => id !== shopId));
        } else {
            setSelectedShops([...selectedShops, shopId]);
        }
    };

    const handleProductToggle = (productId: number) => {
        if (selectedProducts.includes(productId)) {
            setSelectedProducts(selectedProducts.filter(id => id !== productId));
        } else {
            setSelectedProducts([...selectedProducts, productId]);
        }
    };

    const handleCategoryToggle = (categoryId: string) => {
        if (selectedCategories.includes(categoryId)) {
            setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
        } else {
            setSelectedCategories([...selectedCategories, categoryId]);
        }
    };

    const clearAllFilters = () => {
        setSelectedShops([]);
        setSelectedProducts([]);
        setSelectedCategories([]);
    };

    const filteredProducts = selectedCategories.length > 0
        ? productFilters.filter(product => selectedCategories.includes(product.category))
        : productFilters;

    if (!isOpen && !isVisible) return null;

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
                        maxHeight: '85vh',
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
                            <h2 className="text-2xl font-bold text-gray-800">Filtry wyszukiwania punktów</h2>
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        {/* Tabs z przyciskiem Wyczyść */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex border-b border-gray-200">
                                <button
                                    className={`py-2 px-4 font-medium ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('products')}
                                >
                                    Produkty
                                </button>
                                <button
                                    className={`py-2 px-4 font-medium ${activeTab === 'shops' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('shops')}
                                >
                                    Punkty
                                </button>
                            </div>
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Wyczyść Filtry
                            </button>
                        </div>
                    </div>
                    {/* Content */}
                    <div
                        className="overflow-y-auto scrollbar-hidden "
                        style={{ maxHeight: 'calc(85vh - 170px)' }}
                    >
                        {activeTab === 'shops' ? (
                            <div className="p-4 mb-20">
                                <h3 className="font-medium text-gray-700 mb-3">Wybierz punkty</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {shopFilters.map((shop) => (
                                        <button
                                            key={shop.id}
                                            onClick={() => handleShopToggle(shop.id)}
                                            className={`
                                                p-3 rounded-xl border text-left transition-all duration-200
                                                flex flex-col items-center gap-2 hover:shadow-md relative
                                                ${selectedShops.includes(shop.id)
                                                ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                                            }
                                            `}
                                        >
                                            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center ">
                                                {shop.logo_url ? (
                                                    <img
                                                        src={shop.logo_url}
                                                        alt={`${shop.name} logo`}
                                                        className="w-16 h-16 md:w-20 md:h-20 object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-xl font-bold text-gray-700">
                                                        {shop.name.substring(0, 2).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-sm">{shop.name}</div>
                                            </div>
                                            {selectedShops.includes(shop.id) && (
                                                <div className="absolute top-2 right-2">
                                                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4  mb-20">
                                {/* Kategorie produktów */}
                                <h3 className="font-medium text-gray-700 mb-3">Kategorie produktów</h3>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {productCategories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => handleCategoryToggle(category.id)}
                                            className={`
                                                px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5
                                                ${selectedCategories.includes(category.id)
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }
                                            `}
                                        >
                                            <span>{category.icon}</span>
                                            {category.name}
                                            {selectedCategories.includes(category.id) && (
                                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {/* Produkty */}
                                <h3 className="font-medium text-gray-700 mb-3">Wybierz produkty</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {filteredProducts.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductToggle(product.id)}
                                            className={`
                                                p-3 rounded-xl border text-left transition-all duration-200
                                                flex flex-col items-center gap-2 hover:shadow-md relative
                                                ${selectedProducts.includes(product.id)
                                                ? 'border-green-200 bg-green-50 text-green-700 shadow-sm'
                                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                                            }
                                            `}
                                        >
                                            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center ">
                                                {product.photo_url ? (
                                                    <img
                                                        src={product.photo_url}
                                                        alt={`${product.name}`}
                                                        className="w-16 h-16 md:w-20 md:h-20 object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-xl md:text-2xl">📦</span>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-sm">DZIK® {product.name}</div>
                                            </div>
                                            {selectedProducts.includes(product.id) && (
                                                <div className="absolute top-2 right-2">
                                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
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

export default AdvancedFilterPanel;