import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { Shop } from '../services/api';

interface ReportProblemPanelProps {
    isOpen: boolean;
    onClose: () => void;
    isClosing: boolean;
    selectedShop?: Shop | null;
}

interface ReportFormData {
    report_type: string;
    title: string;
    description: string;
    user_email: string;
    screenshot?: File;
}

const ReportProblemPanel: React.FC<ReportProblemPanelProps> = ({
                                                                   isOpen,
                                                                   onClose,
                                                                   isClosing,
                                                                   selectedShop = null
                                                               }) => {
    const [formData, setFormData] = useState<ReportFormData>({
        report_type: '',
        title: '',
        description: '',
        user_email: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [csrfToken, setCsrfToken] = useState<string | null>(null);
    const [csrfLoading, setCsrfLoading] = useState(true);

    const shopProblemTypes = [
        { value: 'shop_not_exists', label: 'Sklep nie istnieje/zamknięty' },
        { value: 'wrong_location', label: 'Zła lokalizacja na mapie/Błedny adres' },
        { value: 'no_products', label: 'Brak produktów DZIK w sklepie' },
        { value: 'wrong_products', label: 'Inny problem' }
    ];

    const generalProblemTypes = [
        { value: 'app_bug', label: 'Problem z mapą/wyszukiwaniem' },
        { value: 'missing_shop', label: 'Brakujący sklep w okolicy' },
        { value: 'feature_request', label: 'Sugestia/pomysł' },
        { value: 'other', label: 'Inny problem' }
    ];

    const problemTypes = selectedShop ? shopProblemTypes : generalProblemTypes;

    // Pobierz CSRF token przy otwieraniu panelu
    useEffect(() => {
        if (isOpen && !csrfToken) {
            setCsrfLoading(true);
            // Użyj pełnego adresu URL zgodnie z konfiguracją API
            fetch('http://127.0.0.1:8000/api/csrf-token/', {
                method: 'GET',
                credentials: 'include'
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    setCsrfToken(data.csrfToken);
                    setCsrfLoading(false);
                })
                .catch(error => {
                    console.error('Błąd pobierania CSRF token:', error);
                    setSubmitError('Nie można pobrać tokenu bezpieczeństwa. Spróbuj odświeżyć stronę.');
                    setCsrfLoading(false);
                });
        }
    }, [isOpen, csrfToken]);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                report_type: '',
                title: selectedShop ? '' : '',
                description: '',
                user_email: ''
            });
            setSubmitSuccess(false);
            setSubmitError(null);
        }
    }, [isOpen, selectedShop]);

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isSubmitting) {
            handleClose();
        }
    };

    const handleInputChange = (field: keyof ReportFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                screenshot: file
            }));
        }
    };

    const validateForm = (): boolean => {
        if (!formData.report_type) return false;
        if (!formData.description.trim()) return false;
        if (!selectedShop && !formData.title.trim()) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            setSubmitError('Proszę wypełnić wszystkie wymagane pola');
            return;
        }

        if (!csrfToken) {
            setSubmitError('Błąd zabezpieczeń. Odśwież stronę i spróbuj ponownie.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const submitData = {
                report_type: formData.report_type,
                title: formData.title,
                description: formData.description,
                user_email: formData.user_email,
                source: selectedShop ? 'map' : 'general',
                ...(selectedShop && {
                    shop_name: selectedShop.name,
                    shop_lat: selectedShop.lat,
                    shop_lon: selectedShop.lon
                })
            };

            // Użyj pełnego adresu URL
            const response = await fetch('http://127.0.0.1:8000/api/submit-report/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setSubmitSuccess(true);
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                setSubmitError(result.error || 'Wystąpił błąd podczas wysyłania');
            }
        } catch (error: any) {
            console.error('Błąd wysyłania zgłoszenia:', error);
            setSubmitError(error.message || 'Problem z połączeniem. Spróbuj ponownie.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={handleBackdropClick}
                style={{
                    opacity: isClosing ? 0 : 1,
                    transition: 'opacity 0.3s ease'
                }}
            />
            <div
                className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-hidden"
                style={{
                    transform: isClosing ? 'translateY(100%)' : 'translateY(0%)',
                    transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    maxWidth: window.innerWidth >= 1024 ? '600px' : '100%',
                    marginLeft: window.innerWidth >= 1024 ? 'auto' : '0',
                    marginRight: window.innerWidth >= 1024 ? 'auto' : '0'
                }}
                onClick={e => {
                    e.stopPropagation();
                }}
            >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-4" />
                <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                    <XMarkIcon className="w-5 h-5 text-gray-600" />
                </button>
                <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            {selectedShop ? (
                                <MapPinIcon className="w-6 h-6 text-red-500" />
                            ) : (
                                <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
                            )}
                            <h2 className="text-xl font-bold text-gray-900">
                                {selectedShop ? 'Zgłoś problem ze sklepem' : 'Zgłoś problem'}
                            </h2>
                        </div>
                        {selectedShop && (
                            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                <p className="text-sm text-blue-800 font-medium">{selectedShop.name}</p>
                                <p className="text-xs text-blue-600">{selectedShop.address}</p>
                            </div>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                            {selectedShop
                                ? 'Pomóż nam poprawić informacje o tym sklepie'
                                : 'Opisz problem lub podziel się sugestią dotyczącą aplikacji'
                            }
                        </p>
                    </div>
                    {submitSuccess && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-20">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                                <p className="text-green-800 font-medium">Dziękujemy za zgłoszenie!</p>
                            </div>
                            <p className="text-green-700 text-sm mt-1">
                                Sprawdzimy to jak najszybciej i postaramy się rozwiązać problem.
                            </p>
                        </div>
                    )}
                    {!submitSuccess && (
                        <form onSubmit={handleSubmit} className="space-y-4 mb-20">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rodzaj problemu *
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {problemTypes.map((type) => (
                                        <label
                                            key={type.value}
                                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                                                formData.report_type === type.value
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="report_type"
                                                value={type.value}
                                                checked={formData.report_type === type.value}
                                                onChange={(e) => handleInputChange('report_type', e.target.value)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                disabled={isSubmitting}
                                            />
                                            <span className="ml-3 text-sm text-gray-900">{type.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {!selectedShop && (
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                        Tytuł problemu *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        placeholder="Krótko opisz problem..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                    {selectedShop ? 'Dodatkowe informacje *' : 'Opisz problem *'}
                                </label>
                                <textarea
                                    id="description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder={selectedShop
                                        ? 'Opisz szczegółowo co jest nie tak...'
                                        : 'Opisz problem lub swoją sugestię...'
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email (opcjonalnie)
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.user_email}
                                    onChange={(e) => handleInputChange('user_email', e.target.value)}
                                    placeholder="twoj.email@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Jeśli chcesz dostać odpowiedź na swoje zgłoszenie
                                </p>
                            </div>
                            {!selectedShop && (
                                <div>
                                    <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-2">
                                        Zrzut ekranu (opcjonalnie)
                                    </label>
                                    <input
                                        type="file"
                                        id="screenshot"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Załącz screenshot jeśli pomoże wyjaśnić problem
                                    </p>
                                </div>
                            )}
                            {submitError && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                    <p className="text-red-800 text-sm">{submitError}</p>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting || !validateForm() || !csrfToken || csrfLoading}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                                    isSubmitting || !validateForm() || !csrfToken || csrfLoading
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
                                }`}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Wysyłanie...
                                    </div>
                                ) : csrfLoading ? (
                                    'Pobieranie tokenu bezpieczeństwa...'
                                ) : !csrfToken ? (
                                    'Brak tokenu bezpieczeństwa'
                                ) : (
                                    'Wyślij zgłoszenie'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default ReportProblemPanel;