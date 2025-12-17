import React, { useEffect, useState, useRef } from 'react';
import { XMarkIcon, CodeBracketIcon, QuestionMarkCircleIcon, HeartIcon, ExclamationTriangleIcon, HomeIcon, MapIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import ReportProblemPanel from './ReportProblemPanel';

interface ProjectInfoProps {
    onClose: () => void;
    isClosing?: boolean;
}

interface PlatformStats {
    shops: number;
    products: number;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({
                                                     onClose,
                                                     isClosing = false
                                                 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentY, setCurrentY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [animatedStats, setAnimatedStats] = useState({ shops: 0, products: 0 });
    const [visibleSections, setVisibleSections] = useState<number[]>([]);
    const [finalStats, setFinalStats] = useState<PlatformStats>({ shops: 0, products: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isReportPanelOpen, setIsReportPanelOpen] = useState(false);
    const [isReportPanelClosing, setIsReportPanelClosing] = useState(false);

    // Dodajemy referencję do śledzenia, czy animacja już się odbyła
    const animationCompletedRef = useRef(false);

    // Funkcja do pobierania statystyk z API
    const fetchStats = async () => {
        try {
            setIsLoadingStats(true);
            const response = await fetch('/api/stats/');
            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }
            const data = await response.json();
            setFinalStats({
                shops: data.shops,
                products: data.products
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            // W przypadku błędu, użyj wartości domyślnych
            setFinalStats({ shops: 1247, products: 3891 });
        } finally {
            setIsLoadingStats(false);
        }
    };

    useEffect(() => {
        setIsVisible(true);
        setIsAnimating(true);
        document.body.style.overflow = 'hidden';

        // Pobierz statystyki z API
        fetchStats();

        // Animacja sekcji pojawiających się jedna po drugiej
        const animateSection = (index: number) => {
            setTimeout(() => {
                setVisibleSections(prev => [...prev, index]);
            }, index * 200);
        };

        // Animuj sekcje od 0 do 7
        for (let i = 0; i <= 7; i++) {
            animateSection(i);
        }

        setTimeout(() => setIsAnimating(false), 300);

        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Animacja liczników - zmodyfikowana
    useEffect(() => {
        if (visibleSections.includes(5) && !isLoadingStats) { // Sekcja ze statystykami
            // Sprawdź, czy animacja już się odbyła
            if (animationCompletedRef.current) {
                // Jeśli animacja już się odbyła, ustaw finalne wartości bez animacji
                setAnimatedStats(finalStats);
                return;
            }

            const duration = 2000;
            const steps = 60;
            const stepDuration = duration / steps;
            let currentStep = 0;

            const timer = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                const easeOut = 1 - Math.pow(1 - progress, 3);

                setAnimatedStats({
                    shops: Math.floor(finalStats.shops * easeOut),
                    products: Math.floor(finalStats.products * easeOut)
                });

                if (currentStep >= steps) {
                    setAnimatedStats(finalStats);
                    clearInterval(timer);
                    // Oznacz, że animacja została zakończona
                    animationCompletedRef.current = true;
                }
            }, stepDuration);

            return () => clearInterval(timer);
        }
    }, [visibleSections, finalStats, isLoadingStats]);

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

    const getSectionStyle = (index: number) => ({
        opacity: visibleSections.includes(index) ? 1 : 0,
        transform: visibleSections.includes(index) ? 'translateX(0)' : 'translateX(-30px)',
        transition: 'all 0.6s ease-out'
    });

    // W sekcji statystyk, dodaj informację o ładowaniu
    const getStatsSection = () => {
        if (isLoadingStats) {
            return (
                <div className="text-center p-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Ładowanie statystyk...</p>
                </div>
            );
        }

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                            {animatedStats.shops.toLocaleString()}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">punktów w bazie</div>
                        <div className="mt-2 text-xs text-blue-600">🏪 i rośnie każdego dnia!</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                        <div className="text-4xl font-bold text-green-600 mb-2">
                            {animatedStats.products.toLocaleString()}
                        </div>
                        <div className="text-sm text-green-700 font-medium">Produktów dostępnych</div>
                        <div className="mt-2 text-xs text-green-600">🛒 różnorodność gwarantowana!</div>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                        <span className="text-sm text-purple-700">📈 Aktualizowane w czasie rzeczywistym</span>
                    </div>
                </div>
            </>
        );
    };

    const handleReportProblem = () => {
        // Zamknij panel informacyjny przed otwarciem panelu zgłoszeń
        setIsAnimating(true);
        setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                setIsReportPanelOpen(true);
            }, 200);
        }, 100);
    };

    const handleCloseReportPanel = () => {
        setIsReportPanelClosing(true);
        setTimeout(() => {
            setIsReportPanelOpen(false);
            setIsReportPanelClosing(false);
            // Przywróć panel informacyjny po zamknięciu panelu zgłoszeń
            setIsVisible(true);
            setIsAnimating(false);
        }, 400);
    };

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

                    {/* Content */}
                    <div
                        className="overflow-y-auto scrollbar-hidden"
                        style={{ maxHeight: 'calc(85vh - 60px)' }}
                    >
                        <div className="p-6 mb-10">
                            {/* Sekcja 0: Tytuł aplikacji i logo */}
                            <div style={getSectionStyle(0)} className="text-center mb-8 py-6 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                                <div className="text-6xl mb-4">🐗</div>
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">DZIK Map</h1>
                                <p className="text-lg text-gray-600">Znajdź najbliższe sklepy z produktami DZIK</p>
                            </div>

                            {/* Sekcja 1: Made by */}
                            <div style={getSectionStyle(1)} className="text-center mb-8 p-4 bg-gray-50 rounded-xl">
                                <p className="text-gray-600 mb-3">Made by • <span className="font-semibold text-gray-800">budziun • Jakub Budzich</span> • 2025</p>
                                <div className="flex justify-center gap-3">
                                    <a
                                        href="https://github.com/budziun"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                    >
                                        <CodeBracketIcon className="w-4 h-4 mr-2" />
                                        GitHub
                                    </a>
                                    <a
                                        href="https://budziun.pl"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                                    >
                                        <HomeIcon className="w-4 h-4 mr-2" />
                                        Strona
                                    </a>
                                    <button
                                        onClick={handleReportProblem}
                                        className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                                    >
                                        <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                                        Zgłoś błąd
                                    </button>
                                </div>
                            </div>

                            {/* Sekcja 2: Opis aplikacji */}
                            <div style={getSectionStyle(2)} className="mb-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                    <QuestionMarkCircleIcon className="w-6 h-6 mr-2 text-blue-500" />
                                    Czym jest DZIK Map?
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    DZIK Map to aplikacja, która pomaga znaleźć najbliższe punkty z produktami DZIK.
                                    Umożliwia przeglądanie sklepów, sprawdzanie dostępności produktów w sieci sklepów oraz nawigowanie
                                    do wybranej lokalizacji.
                                </p>
                            </div>

                            {/* Sekcja 3: Linki do kanałów - wszystkie z logami jako tło */}
                            <div style={getSectionStyle(3)} className="mb-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                    <GlobeAltIcon className="w-6 h-6 mr-2 text-purple-500" />
                                    Śledź ekipę Warszawski Koks
                                </h3>

                                {/* Górny wiersz z Facebook, Instagram, Sklep - na telefonach w układzie pionowym */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    {/* Facebook */}
                                    <a
                                        href="https://www.facebook.com/wkdzikpl"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative flex flex-col items-center justify-center p-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105 overflow-hidden min-h-[100px]"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, #1877f2 0%, #42a5f5 100%)`,
                                            backgroundColor: '#1877f2'
                                        }}
                                    >
                                        {/* Logo Facebook jako tło */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                            <svg viewBox="0 0 24 24" className="w-16 h-16 fill-white">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                            </svg>
                                        </div>
                                        <div className="relative z-10 text-center">
                                            <span className="text-lg font-bold text-white drop-shadow-lg">Facebook</span>
                                            <div className="text-xs text-white/90 mt-1">WK DZIK</div>
                                        </div>
                                    </a>

                                    {/* Instagram */}
                                    <a
                                        href="https://www.instagram.com/wkdzik/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative flex flex-col items-center justify-center p-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105 overflow-hidden min-h-[100px]"
                                        style={{
                                            backgroundImage: `linear-gradient(45deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)`,
                                        }}
                                    >
                                        {/* Logo Instagram jako tło */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                            <svg viewBox="0 0 24 24" className="w-16 h-16 fill-white">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                            </svg>
                                        </div>
                                        <div className="relative z-10 text-center">
                                            <span className="text-lg font-bold text-white drop-shadow-lg">Instagram</span>
                                            <div className="text-xs text-white/90 mt-1">@wkdzik</div>
                                        </div>
                                    </a>

                                    {/* Sklep WKDZIK */}
                                    <a
                                        href="https://wkdzik.pl/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative flex flex-col items-center justify-center p-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105 overflow-hidden min-h-[100px]"
                                        style={{
                                            backgroundImage: `url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbfQvUhnKWE3282vPDBIjfjN_TPWIMWfqdSA&s')`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            backgroundRepeat: 'no-repeat'
                                        }}
                                    >
                                        {/* Overlay dla lepszej czytelności */}
                                        <div className="absolute inset-0 bg-black bg-opacity-50 hover:bg-opacity-40 transition-all rounded-xl"></div>
                                        <div className="relative z-10 text-center">
                                            <span className="text-lg font-bold text-white drop-shadow-lg">Sklep WKDZIK</span>
                                            <div className="text-xs text-white/90 mt-1">wkdzik.pl</div>
                                        </div>
                                    </a>
                                </div>

                                {/* YouTube kanały - na telefonach w układzie poziomym */}
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <a
                                        href="https://www.youtube.com/@WarszawskiKoks"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative flex flex-col items-center justify-center p-6 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105 overflow-hidden w-full sm:w-auto min-h-[100px]"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, #ff0000 0%, #cc0000 100%)`,
                                        }}
                                    >
                                        {/* Logo YouTube jako tło z większą widocznością */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-50">
                                            <svg viewBox="0 0 24 24" className="w-20 h-20 fill-white">
                                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                            </svg>
                                        </div>
                                        <div className="relative z-10 text-center">
                                            <span className="text-xl font-bold text-white drop-shadow-lg">YouTube WK</span>
                                            <div className="text-sm text-white/90 mt-1">Warszawski Koks</div>
                                        </div>
                                    </a>

                                    <a
                                        href="https://www.youtube.com/@EKIPAWK"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative flex flex-col items-center justify-center p-6 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105 overflow-hidden w-full sm:w-auto min-h-[100px]"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, #ff0000 0%, #cc0000 100%)`,
                                        }}
                                    >
                                        {/* Logo YouTube jako tło z większą widocznością */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-50">
                                            <svg viewBox="0 0 24 24" className="w-20 h-20 fill-white">
                                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                            </svg>
                                        </div>
                                        <div className="relative z-10 text-center">
                                            <span className="text-xl font-bold text-white drop-shadow-lg">EKIPA WK</span>
                                            <div className="text-sm text-white/90 mt-1">Ekipa WK</div>
                                        </div>
                                    </a>
                                </div>
                            </div>

                            {/* Sekcja 4: Wesprzyj projekt */}
                            <div style={getSectionStyle(4)} className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                                <div className="text-center">
                                    <div className="flex justify-center mb-4">
                                        <span className="text-4xl">🐗🐗</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Wesprzyj projekt - postaw dzika!</h3>
                                    <p className="text-gray-600 mb-4">
                                        Twoje wsparcie pozwala nam rozwijać aplikację i dodawać nowe funkcje.
                                        Każdy "dzik" ma znaczenie dla rozwoju projektu!
                                    </p>
                                    <a
                                        href="https://buycoffee.to/budziun"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                                    >
                                        <HeartIcon className="w-5 h-5 mr-2" />
                                        Postaw dzika
                                    </a>
                                </div>
                            </div>

                            {/* Sekcja 5: Statystyki - zaktualizowana */}
                            <div style={getSectionStyle(5)} className="mb-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                                    <StarIcon className="w-6 h-6 mr-2 text-yellow-500" />
                                    Statystyki platformy
                                </h3>
                                {getStatsSection()}
                            </div>

                            {/* Sekcja 6: Technologie */}
                            <div style={getSectionStyle(6)} className="mb-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                    <CodeBracketIcon className="w-6 h-6 mr-2 text-green-500" />
                                    Zbudowane z użyciem
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Aplikacja korzysta z nowoczesnych technologii open-source:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Frontend */}
                                    <a
                                        href="https://reactjs.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <CodeBracketIcon className="w-5 h-5 mr-3" />
                                        <div>
                                            <div className="font-medium">React + TypeScript</div>
                                            <div className="text-xs text-blue-600">Interfejs użytkownika</div>
                                        </div>
                                    </a>

                                    <a
                                        href="https://tailwindcss.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors"
                                    >
                                        <span className="w-5 h-5 mr-3 text-lg">🎨</span>
                                        <div>
                                            <div className="font-medium">Tailwind CSS</div>
                                            <div className="text-xs text-cyan-600">Style CSS w formie klas</div>
                                        </div>
                                    </a>

                                    {/* Backend */}
                                    <a
                                        href="https://www.djangoproject.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                        <span className="w-5 h-5 mr-3 text-lg">🐍</span>
                                        <div>
                                            <div className="font-medium">Python Django</div>
                                            <div className="text-xs text-emerald-600">Backend framework</div>
                                        </div>
                                    </a>

                                    <a
                                        href="https://www.postgresql.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <span className="w-5 h-5 mr-3 text-lg">🐘</span>
                                        <div>
                                            <div className="font-medium">PostgreSQL</div>
                                            <div className="text-xs text-slate-600">Baza danych</div>
                                        </div>
                                    </a>

                                    {/* Mapy */}
                                    <a
                                        href="https://leafletjs.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                                    >
                                        <MapIcon className="w-5 h-5 mr-3" />
                                        <div>
                                            <div className="font-medium">Leaflet</div>
                                            <div className="text-xs text-green-600">Interaktywne mapy</div>
                                        </div>
                                    </a>

                                    <a
                                        href="https://www.openstreetmap.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                                    >
                                        <GlobeAltIcon className="w-5 h-5 mr-3" />
                                        <div>
                                            <div className="font-medium">OpenStreetMap</div>
                                            <div className="text-xs text-orange-600">Dane geograficzne</div>
                                        </div>
                                    </a>

                                    {/* API i usługi */}
                                    <a
                                        href="https://overpass-api.de/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                                    >
                                        <CodeBracketIcon className="w-5 h-5 mr-3" />
                                        <div>
                                            <div className="font-medium">Overpass API</div>
                                            <div className="text-xs text-purple-600">Zapytania do OSM</div>
                                        </div>
                                    </a>

                                    <a
                                        href="https://www.geoapify.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors"
                                    >
                                        <MapIcon className="w-5 h-5 mr-3" />
                                        <div>
                                            <div className="font-medium">Geoapify</div>
                                            <div className="text-xs text-pink-600">Geokodowanie adresów</div>
                                        </div>
                                    </a>
                                </div>

                                {/* Ikony - wycentrowane poza grid */}
                                <div className="flex justify-center mt-3">
                                    <a
                                        href="https://heroicons.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors w-full md:w-1/2"
                                    >
                                        <span className="w-5 h-5 mr-3 text-lg">🎯</span>
                                        <div>
                                            <div className="font-medium">Heroicons</div>
                                            <div className="text-xs text-indigo-600">Ikony interfejsu</div>
                                        </div>
                                    </a>
                                </div>
                            </div>

                            {/* Sekcja 7: Kontakt i podziękowania */}
                            <div style={getSectionStyle(7)} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center border">
                                <div className="text-4xl mb-4">🙏</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">Dziękujemy społeczności!</h3>
                                <p className="text-gray-600 mb-4">
                                    DZIK Map to projekt społecznościowy. Dziękujemy wszystkim, którzy pomagają w jego rozwoju
                                    poprzez dodawanie sklepów, zgłaszanie błędów i dzielenie się aplikacją.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 mb-4">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">📍 Mapowanie</span>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">🔍 Testowanie</span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">💡 Pomysły</span>
                                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">🚀 Promocja</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Razem tworzymy najlepszą platformę do znajdowania produktów DZIK w Polsce!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Close button */}
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Panel zgłaszania problemów */}
            {isReportPanelOpen && (
                <ReportProblemPanel
                    isOpen={isReportPanelOpen}
                    onClose={handleCloseReportPanel}
                    isClosing={isReportPanelClosing}
                />
            )}

            {/* Style dla ukrywania scrollbar */}
            <style>{`
        .scrollbar-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
        @keyframes countUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
        </>
    );
};

export default ProjectInfo;