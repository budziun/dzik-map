import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Barcode from 'react-barcode';
import { getMediaUrl } from '../config';
import { Product } from '../services/api';

interface ProductDetailsProps {
    product: Product | null;
    onClose: () => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (product) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [product]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const handleTouchStart = (e: React.TouchEvent) => { setStartY(e.touches[0].clientY); setCurrentY(0); setIsDragging(true); };
    const handleTouchMove = (e: React.TouchEvent) => { if (!isDragging) return; const deltaY = e.touches[0].clientY - startY; if (deltaY > 0) setCurrentY(deltaY); };
    const handleTouchEnd = () => { if (!isDragging) return; setIsDragging(false); if (currentY > 100) handleClose(); else setCurrentY(0); };
    const handleMouseDown = (e: React.MouseEvent) => { setStartY(e.clientY); setCurrentY(0); setIsDragging(true); };
    const handleMouseMove = (e: MouseEvent) => { if (!isDragging) return; const deltaY = e.clientY - startY; if (deltaY > 0) setCurrentY(deltaY); };
    const handleMouseUp = () => { if (!isDragging) return; setIsDragging(false); if (currentY > 100) handleClose(); else setCurrentY(0); };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, startY]); // eslint-disable-line

    if (!product) return null;

    // --- LOGIKA JEDNOSTEK ---
    const isSolid = product.category === 'wafle';
    const unitLabel = isSolid ? '100 g' : '100 ml';

    // Mapowanie jednostek dla witamin (zgodnie z etykietami)
    const getVitaminUnit = (key: string) => {
        const units: Record<string, string> = {
            vitamin_b12: ' µg',
            vitamin_a: ' µg',
            folic_acid: ' µg',
            biotin: ' µg',
            selenium: ' µg',
            iodine: ' µg',
            vitamin_c: ' mg',
            vitamin_e: ' mg',
            thiamine: ' mg',
            niacin: ' mg',
            vitamin_b6: ' mg',
            pantothenic_acid: ' mg',
            magnesium: ' mg',
            potassium: ' mg',
            sodium: ' mg',
            calcium: ' mg',
            zinc: ' mg',
        };
        return units[key] || '';
    };

    const vitaminsList = [
        { key: 'vitamin_a', label: 'Witamina A', value: product.vitamin_a },
        { key: 'vitamin_c', label: 'Witamina C', value: product.vitamin_c },
        { key: 'vitamin_e', label: 'Witamina E', value: product.vitamin_e },
        { key: 'thiamine', label: 'Tiamina (B1)', value: product.thiamine },
        { key: 'niacin', label: 'Niacyna (B3)', value: product.niacin },
        { key: 'vitamin_b6', label: 'Witamina B6', value: product.vitamin_b6 },
        { key: 'vitamin_b12', label: 'Witamina B12', value: product.vitamin_b12 },
        { key: 'pantothenic_acid', label: 'Kwas pantotenowy', value: product.pantothenic_acid },
        { key: 'folic_acid', label: 'Kwas foliowy', value: product.folic_acid },
        { key: 'biotin', label: 'Biotyna', value: product.biotin },
        { key: 'magnesium', label: 'Magnez', value: product.magnesium },
        { key: 'potassium', label: 'Potas', value: product.potassium },
        { key: 'sodium', label: 'Sód', value: product.sodium },
        { key: 'calcium', label: 'Wapń', value: product.calcium },
        { key: 'zinc', label: 'Cynk', value: product.zinc },
        { key: 'selenium', label: 'Selen', value: product.selenium },
        { key: 'iodine', label: 'Jod', value: product.iodine }
    ].filter(item => item.value);

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[10000]" style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s ease' }} onClick={handleBackdropClick} />

            <div
                className="fixed left-1/2 transform -translate-x-1/2 z-[10001] w-full max-w-4xl"
                style={{
                    bottom: 0,
                    transform: `translateX(-50%) ${isVisible ? `translateY(${currentY}px)` : 'translateY(100%)'}`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <div
                    className="bg-white rounded-t-[32px] shadow-2xl overflow-hidden relative"
                    style={{ maxHeight: '90vh' }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing w-full">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                    </div>

                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-6 w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shadow-sm hover:bg-gray-200 transition-colors z-10"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>

                    <div className="overflow-y-auto px-6 pb-12 pt-4" style={{ maxHeight: 'calc(90vh - 40px)' }}>
                        <div className="flex flex-col md:flex-row gap-8">

                            {/* LEWA STRONA: Zdjęcie */}
                            <div className="w-full md:w-2/5 flex flex-col items-center justify-start pt-4">
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 w-full aspect-square flex items-center justify-center shadow-inner relative">
                                    {product.photo_url ? (
                                        <img src={getMediaUrl(product.photo_url)} alt={product.name} className="w-full h-full object-contain drop-shadow-xl" />
                                    ) : (
                                        <span className="text-6xl">📦</span>
                                    )}
                                </div>
                                {product.ean_code && (
                                    <div className="mt-8 hidden md:flex flex-col items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full">
                                        <Barcode value={product.ean_code} width={1.8} height={50} displayValue={true} background="transparent" />
                                        <span className="text-xs text-gray-400 mt-1">Kod kreskowy EAN</span>
                                    </div>
                                )}
                            </div>

                            {/* PRAWA STRONA: Informacje */}
                            <div className="w-full md:w-3/5 flex flex-col pt-2">
                                <p className="text-sm font-bold text-blue-600 tracking-wider uppercase mb-1">{product.category.replace('_', ' ')}</p>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
                                    DZIK® {product.name}
                                </h2>

                                {/* Tagi informacyjne */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
                                        🍍 Smak: {product.flavor || 'Klasyczny'}
                                    </span>

                                    {product.capacity && (
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
                                            {!isSolid && <span></span>}
                                            {product.capacity} {isSolid ? 'g' : 'ml'}
                                        </span>
                                    )}

                                    {(product.caffeine_mg ?? 0) > 0 && (
                                        <span className="bg-red-100 text-red-800 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
                                            ⚡ {product.caffeine_mg} mg Kofeiny
                                        </span>
                                    )}
                                </div>

                                {/* Opis i Składniki */}
                                {(product.description || product.ingredients) && (
                                    <div className="mb-8">
                                        {product.description && (
                                            <div className="mb-4">
                                                <h3 className="text-lg font-bold text-gray-800 mb-2">Opis produktu</h3>
                                                <p className="text-gray-600 leading-relaxed text-sm md:text-base whitespace-pre-line">
                                                    {product.description}
                                                </p>
                                            </div>
                                        )}
                                        {product.ingredients && (
                                            <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-600 leading-relaxed border border-gray-100">
                                                <strong className="text-gray-800 block mb-1">Składniki:</strong>
                                                {product.ingredients}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tabela Wartości Odżywczych */}
                                {(product.kcal != null || product.fat != null) && (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            📊 Wartości odżywcze <span className="text-xs font-normal text-gray-400">(w {unitLabel})</span>
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col justify-center">
                                                <div className="text-gray-500 text-xs font-semibold mb-1">Wartość energet.</div>
                                                <div className="text-lg font-extrabold text-gray-800">{product.kcal ?? '0'}<span className="text-sm font-medium"> kcal</span></div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col justify-center">
                                                <div className="text-gray-500 text-xs font-semibold mb-1">Tłuszcz</div>
                                                <div className="text-lg font-extrabold text-gray-800">{product.fat ?? '0'}<span className="text-sm font-medium"> g</span></div>
                                                <div className="text-[10px] text-gray-400 mt-1">kwasy nas.: {product.saturated_fat ?? '0'} g</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col justify-center">
                                                <div className="text-gray-500 text-xs font-semibold mb-1">Węglowodany</div>
                                                <div className="text-lg font-extrabold text-gray-800">{product.carbs ?? '0'}<span className="text-sm font-medium"> g</span></div>
                                                <div className="text-[10px] text-gray-400 mt-1">w tym cukry: {product.sugar ?? '0'} g</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col justify-center">
                                                <div className="text-gray-500 text-xs font-semibold mb-1">Błonnik</div>
                                                <div className="text-lg font-extrabold text-gray-800">{product.fiber ?? '0'}<span className="text-sm font-medium"> g</span></div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col justify-center col-span-2">
                                                <div className="text-gray-500 text-xs font-semibold mb-1">Białko</div>
                                                <div className="text-lg font-extrabold text-gray-800">{product.protein ?? '0'}<span className="text-sm font-medium"> g</span></div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col justify-center col-span-2">
                                                <div className="text-gray-500 text-xs font-semibold mb-1">Sól</div>
                                                <div className="text-lg font-extrabold text-gray-800">{product.salt ?? '0'}<span className="text-sm font-medium"> g</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Sekcja Witamin z jednostkami */}
                                {vitaminsList.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            💊 Witaminy i składniki mineralne <span className="text-xs font-normal text-gray-400">(w całym produkcie)</span>
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            {vitaminsList.map((vitamin, index) => (
                                                <div key={index} className="flex justify-between border-b border-gray-200 py-1 last:border-0 sm:[&:nth-last-child(-n+2)]:border-0">
                                                    <span>{vitamin.label}</span>
                                                    <span className="font-semibold text-gray-900">
                                                        {vitamin.value}{getVitaminUnit(vitamin.key)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Barcode dla Mobile */}
                                {product.ean_code && (
                                    <div className="md:hidden flex flex-col items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-6 mb-4">
                                        <Barcode value={product.ean_code} width={1.5} height={40} displayValue={true} background="transparent" />
                                        <span className="text-xs text-gray-400 mt-2">Kod kreskowy EAN</span>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProductDetails;