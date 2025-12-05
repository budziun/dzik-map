import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Definicja typu dla produktu zwracanego przez API
interface SearchedProduct {
    id: number;
    name: string;
    flavor: string;
    category: string;
    full_name: string;
    photo_url: string;
}

// Komponent niestandardowego komunikatu o błędzie
const ErrorMessage: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => {
    return (
        <div className="mx-auto max-w-2xl mt-2 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-md">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                        {message}
                    </p>
                </div>
                <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                        >
                            <span className="sr-only">Zamknij</span>
                            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SearchPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSearch: (lat: number, lon: number, displayName: string) => void;
    onProductSelect: (product: SearchedProduct) => void;
    isClosing?: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
                                                     isOpen,
                                                     onClose,
                                                     onLocationSearch,
                                                     onProductSelect,
                                                     isClosing = false
                                                 }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [suggestions, setSuggestions] = useState<SearchedProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSuggestions([]);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen]);

    const performProductSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const productResponse = await fetch(`/api/search-products/?q=${encodeURIComponent(query)}`);
            if (productResponse.ok) {
                const productData = await productResponse.json();
                setSuggestions(productData.products || []);
            } else {
                setSuggestions([]);
            }
        } catch (err) {
            console.error('Błąd wyszukiwania produktów:', err);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery) {
                performProductSearch(searchQuery);
            } else {
                setSuggestions([]);
            }
        }, 300);
        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery, performProductSearch]);

    const handleKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = searchQuery.trim();
            if (!query) return;
            if (suggestions.length > 0) {
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const cityResponse = await fetch(`/api/geocode/?city=${encodeURIComponent(query)}`);
                if (cityResponse.ok) {
                    const cityData = await cityResponse.json();
                    if (cityData.lat && cityData.lon) {
                        onLocationSearch(cityData.lat, cityData.lon, cityData.display_name || query);
                        onClose();
                    } else {
                        setError(`Nie znaleziono miasta dla frazy "${query}". Spróbuj wpisać pełną nazwę miasta.`);
                    }
                } else {
                    setError('Wystąpił błąd podczas wyszukiwania miasta. Spróbuj ponownie później.');
                }
            } catch (err) {
                console.error('Błąd wyszukiwania miasta:', err);
                setError('Nie udało się połączyć z serwisem geokodowania. Sprawdź połączenie z internetem.');
            } finally {
                setIsLoading(false);
            }
        }
    }, [searchQuery, suggestions, onLocationSearch, onClose]);

    const handleProductSelect = (product: SearchedProduct) => {
        onProductSelect(product);
        onClose();
    };

    const handleErrorDismiss = () => {
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed top-4 left-4 right-4 z-[100001] transition-all duration-300 ${
                isClosing ? 'opacity-0 transform -translate-y-4' : 'opacity-100'
            }`}
        >
            <div className="mx-auto max-w-2xl rounded-full shadow-xl backdrop-blur-md bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 p-0.5">
                <div className="relative rounded-full bg-gray-100 flex items-center">
                    <div className="p-3 text-gray-500">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        ) : (
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        )}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Wpisz produkt lub miasto i naciśnij Enter..."
                        className="flex-1 bg-transparent border-none text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-0 py-3"
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-3 rounded-full transition-all duration-300 hover:bg-gray-200 hover:scale-110 active:scale-95"
                        title="Zamknij wyszukiwanie"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            </div>

            {error && <ErrorMessage message={error} onDismiss={handleErrorDismiss} />}

            {suggestions.length > 0 && (
                <div className="mx-auto max-w-2xl mt-2 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    <div className="max-h-60 overflow-y-auto">
                        {suggestions.map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-3"
                                onClick={() => handleProductSelect(product)}
                            >
                                {/* NOWOŚĆ: Kontener na obrazek */}
                                <div className="flex-shrink-0">
                                    <img
                                        src={product.photo_url}
                                        alt={`${product.full_name} logo`}
                                        className="w-12 h-12 p-1"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-800 font-medium truncate">
                                        {product.full_name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchPanel;