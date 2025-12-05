// src/services/api.ts

import axios from 'axios';

const API_BASE_URL =
    process.env.NODE_ENV === 'development'
        ? 'http://127.0.0.1:8000/api'
        : '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

/* ---------- typy ---------- */
export interface Product {
    id: number;
    name: string;
    flavor: string;
    photo_url: string;
    category: string;
}

export interface Shop {
    name: string;
    chain: string;
    address: string;
    lat: number;
    lon: number;
    distance: number;
    distance_from_user?: number;
    products?: Product[];
    logo_url?: string;
}

/* ---------- wspólne utilsy ---------- */
export const calculateDynamicRadius = (zoom: number): number => {
    if (zoom >= 17) return 5_000;
    if (zoom >= 16) return 11_000;
    if (zoom >= 14) return 30_000;
    if (zoom >= 12) return 80_000;
    if (zoom >= 10) return 100_000;
    if (zoom >= 8) return 150_000;
    if (zoom >= 6) return 300_000;
    return 10_000_000;
};

/* ---------- NOWE: pobierz sklepy z inteligentnego cache ---------- */
export const getSmartShops = async (
    lat: number,
    lon: number,
    zoom: number,
    userLocation?: { lat: number; lon: number } | null,
    products?: string
): Promise<Shop[]> => {
    const params = new URLSearchParams();
    params.append('lat', lat.toString());
    params.append('lon', lon.toString());
    params.append('zoom', zoom.toString());

    if (userLocation) {
        params.append('user_lat', userLocation.lat.toString());
        params.append('user_lon', userLocation.lon.toString());
    }

    if (products) {
        params.append('products', products);
    }

    const url = `/smart-shops/?${params.toString()}`;

    const res = await api.get(url);
    return res.data.shops as Shop[];
};

/* ---------- STARE: wszystkie sklepy naraz (zachowane dla kompatybilności) ---------- */
export const getAllShops = async (
    userLocation?: { lat: number; lon: number } | null,
    products?: string
): Promise<Shop[]> => {
    const params = new URLSearchParams();

    if (userLocation) {
        params.append('user_lat', userLocation.lat.toString());
        params.append('user_lon', userLocation.lon.toString());
    }

    if (products) {
        params.append('products', products);
    }

    const url = `/all-shops/${params.toString() ? '?' + params.toString() : ''}`;

    const res = await api.get(url);
    return res.data.shops as Shop[];
};

/* ---------- pozostałe funkcje bez zmian ---------- */
export const getNearestShops = async (
    lat: number,
    lon: number,
    zoom = 13,
    useCache = true,
    userLocation?: { lat: number; lon: number } | null
): Promise<Shop[]> => {
    const radius = calculateDynamicRadius(zoom);
    const cacheParam = useCache ? '' : '&no_cache=true';
    const userParam = userLocation
        ? `&user_lat=${userLocation.lat}&user_lon=${userLocation.lon}`
        : '';

    const res = await api.get(
        `/nearest-shops/?lat=${lat}&lon=${lon}&zoom=${zoom}&radius=${radius}${cacheParam}${userParam}`
    );
    return res.data.shops as Shop[];
};

export const fetchByRadius = async (
    lat: number,
    lon: number,
    radius: number,
    userLocation?: { lat: number; lon: number } | null
): Promise<Shop[]> => {
    const userParam = userLocation
        ? `&user_lat=${userLocation.lat}&user_lon=${userLocation.lon}`
        : '';

    const res = await api.get(
        `/nearest-shops/?lat=${lat}&lon=${lon}&zoom=13&radius=${radius}&no_cache=true${userParam}`
    );
    return res.data.shops as Shop[];
};
