import React, { useState } from 'react';
import L from 'leaflet';

// Interfejs dla schematów kolorów
interface ColorScheme {
    primary: string;
    secondary?: string;
    gradient?: string;
    style?: 'solid' | 'gradient' | 'auto';
}

// System kolorów
const shopColorSchemes: Record<string, ColorScheme> = {
    zabka: { primary: '#006420' },
    biedronka: { primary: '#FFE600', style: 'solid' },
    lidl: { primary: '#0050AA', secondary: '#FFC72C', gradient: 'linear-gradient(135deg, #0050AA, #FFC72C)', style: 'gradient' },
    kaufland: { primary: '#E3000F', secondary: '#ffffff', gradient: 'linear-gradient(135deg, #E3000F, #ffffff)', style: 'gradient' },
    aldi: { primary: '#00B4DC', secondary: '#02346e', gradient: 'linear-gradient(135deg, #00B4DC, #02346e)', style: 'gradient' },
    inter: { primary: '#201B1D', secondary: '#FFD700', gradient: 'linear-gradient(135deg, #201B1D, #FFD700)', style: 'gradient' },
    dino: { primary: '#0F9A49', secondary: '#ff0000', gradient: 'linear-gradient(135deg, #0F9A49, #FF0000)', style: 'gradient' },
    stokrotka: { primary: '#75B726', style: 'solid' },
    topaz: { primary: '#EC1C24', style: 'solid' },
    twoj_market: { primary: '#EC1C24', secondary: '#ffe000', gradient: 'linear-gradient(135deg, #EC1C24, #FFe000)', style: 'gradient' },
    dealz: { primary: '#00a2a9', style: 'solid' },
    carrefour: { primary: '#004E9F', secondary: '#FF0000', gradient: 'linear-gradient(135deg, #004E9F, #FF0000)', style: 'gradient' },
    auchan: { primary: '#cc2131', secondary: '#2F9C5C', gradient: 'linear-gradient(135deg, #cc2131, #2F9C5C)', style: 'gradient' },
    bp: { primary: '#00A651', secondary: '#FFDA00', gradient: 'linear-gradient(135deg, #00A651, #FFDA00)', style: 'gradient' },
    selgros: { primary: '#ffffff', secondary: '#D30A1C', gradient: 'linear-gradient(135deg, #ffffff, #D30A1C)', style: 'gradient' },
    circle_k: { primary: '#D61A0C', secondary: '#E08600', gradient: 'linear-gradient(135deg, #D61A0C, #E08600)', style: 'gradient' },
    eurocash: { primary: '#0D6822', secondary: '#D00024', gradient: 'linear-gradient(135deg, #0D6822, #D00024)', style: 'gradient' },
    arhelan: {primary: '#E31E25', secondary: '#000000', gradient: 'linear-gradient(135deg, #E31E25, #000000)', style: 'gradient'},
    other: { primary: '#808080', secondary: '#CCCCCC', gradient: 'linear-gradient(135deg, #808080, #CCCCCC)', style: 'auto' }
};

const getShopGradient = (shopType: string): string => {
    const scheme = shopColorSchemes[shopType] || shopColorSchemes.other;
    const style = scheme.style || 'auto';

    if (style === 'solid') {
        return scheme.primary;
    }

    if (scheme.secondary) {
        return `linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary})`;
    }

    return scheme.primary;
};

const getShopSecondaryColor = (shopType: string): string => {
    const scheme = shopColorSchemes[shopType] || shopColorSchemes.other;
    return scheme.secondary || scheme.primary;
};

// Ikona klastra
const createClusterIcon = (pointCount: number) => {
    const size = pointCount < 10 ? 50 : pointCount < 100 ? 60 : 70;
    const fontSize = pointCount < 10 ? '14px' : pointCount < 100 ? '16px' : '18px';

    return L.divIcon({
        html: `
            <div class="flex items-center justify-center rounded-full border-4 border-white shadow-lg cursor-pointer transition-transform"
                 style="
                    width: ${size}px;
                    height: ${size}px;
                    background: linear-gradient(135deg, #11A7F3, #5380ff);
                    color: white;
                    font-weight: bold;
                    font-size: ${fontSize};
                 ">
                <div class="text-center leading-tight">
                    <div style="font-size: ${fontSize};">${pointCount}</div>
                </div>
            </div>
        `,
        className: 'cluster-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
};

// Ikona pojedynczego sklepu
const createShopIcon = (chain: string, logoUrl?: string, shopName?: string) => {
    const colorScheme = shopColorSchemes[chain] || shopColorSchemes.other;
    const uniqueId = `icon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const primaryColor = colorScheme.primary;
    const secondaryColor = getShopSecondaryColor(chain);
    const gradientBackground = getShopGradient(chain);

    return L.divIcon({
        html: `
            <div class="relative flex items-start justify-center" style="width: 50px; height: 65px;">
                <svg width="50" height="65" viewBox="0 0 512 512" class="absolute top-0 left-0" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="pinGradient-${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
                            <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
                        </linearGradient>
                        <mask id="circle-cutout-${uniqueId}" maskUnits="userSpaceOnUse">
                            <rect width="100%" height="100%" fill="white"/>
                            <circle cx="256" cy="160" r="130" fill="black"/>
                        </mask>
                        <filter id="shadow-${uniqueId}" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                        </filter>
                    </defs>
                    <path 
                        style="fill:url(#pinGradient-${uniqueId});" 
                        filter="url(#shadow-${uniqueId})" 
                        mask="url(#circle-cutout-${uniqueId})"
                        d="M87.084,192c-0.456-5.272-0.688-10.6-0.688-16C86.404,78.8,162.34,0,256.004,0s169.6,78.8,169.6,176
                        c0,5.392-0.232,10.728-0.688,16h0.688c0,96.184-169.6,320-169.6,320s-169.6-223.288-169.6-320H87.084z"/>
                </svg>

                <div class="inline-flex items-center justify-center w-8 h-8 rounded-full mt-1.5 border-2 border-white shadow-sm" style="background: ${gradientBackground}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ${
            logoUrl ?
                `<img src="${logoUrl}" alt="${shopName || chain}" class="w-6 h-6 rounded-full object-cover" onerror="this.style.display='none';"/>` :
                `<span class="text-white font-bold text-sm" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${chain.charAt(0).toUpperCase()}</span>`
        }
                </div>
            </div>
        `,
        className: 'custom-shop-icon',
        iconSize: [50, 65],
        iconAnchor: [25, 65],
        popupAnchor: [0, -65]
    });
};

// Komponent ikony w popup
interface ShopIconInPopupProps {
    chain: string;
    shopName: string;
    logoUrl?: string;
}

const ShopIconInPopup: React.FC<ShopIconInPopupProps> = ({ chain, shopName, logoUrl }) => {
    const [logoError, setLogoError] = useState(false);
    const gradientBackground = getShopGradient(chain);

    return (
        <div
            className="relative w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
            style={{ background: gradientBackground, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        >
            {logoUrl && !logoError ? (
                <img
                    src={logoUrl}
                    alt={shopName}
                    className="w-10 h-10 object-contain rounded-full"
                    onError={() => setLogoError(true)}
                />
            ) : (
                <div className="text-white font-bold text-2xl font-sans" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    {chain.charAt(0).toUpperCase()}
                </div>
            )}
        </div>
    );
};

// Ikona użytkownika
const createUserIcon = () => {
    return L.divIcon({
        html: `
            <div class="relative flex items-center justify-center">
                <div class="absolute w-7 h-7 bg-blue-500 bg-opacity-40 rounded-full animate-pulse" style="animation: pulse 2s infinite;"></div>
                <div class="relative w-6 h-6 bg-[#11A7F3] rounded-full border-4 border-white shadow-lg"></div>
            </div>
            <style>
                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 1; }
                    100% { transform: scale(2.8); opacity: 0; }
                }
            </style>
        `,
        className: 'custom-pulsing-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
};
export {
    createClusterIcon,
    createShopIcon,
    createUserIcon,
    getShopGradient,
    ShopIconInPopup
};
