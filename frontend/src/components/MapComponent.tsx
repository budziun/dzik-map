import React, { useEffect, useState, useCallback } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap,
    useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shop } from '../services/api';
import { createUserIcon } from './ShopIcons';
import ClusterHandler from './ClusterHandler';

const MapCenter: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const CustomZoomControl: React.FC = () => {
    const map = useMap();
    useEffect(() => {
        if (map.zoomControl) {
            map.zoomControl.remove();
        }
        const customZoomControl = L.control.zoom({
            position: 'bottomright',
            zoomInTitle: 'Przybliż',
            zoomOutTitle: 'Oddal'
        });
        customZoomControl.addTo(map);
        if (!document.getElementById('custom-zoom-styles')) {
            const style = document.createElement('style');
            style.id = 'custom-zoom-styles';
            style.textContent = `
        .leaflet-control-zoom {
          border: none !important;
          margin-bottom: 70px !important;
          margin-right: 15px !important;
        }
        .leaflet-control-zoom a {
          border: none !important;
          border-radius: 12px !important;
          margin: 4px !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          font-size: 20px !important;
          color: #333 !important;
          transition: all 0.2s ease !important;
          text-decoration: none !important;
        }
        .leaflet-control-zoom a:hover {
          background: #3b82f6 !important;
          color: white !important;
          transform: scale(1.05) !important;
        }
        .leaflet-control-zoom a:first-child {
          margin-bottom: 8px !important;
        }
      `;
            document.head.appendChild(style);
        }
        return () => {
            if (customZoomControl) {
                try {
                    map.removeControl(customZoomControl);
                } catch (e) {
                    console.warn('Błąd usuwania zoom control:', e);
                }
            }
        };
    }, [map]);
    return null;
};

const MapMoveWatcher: React.FC<{
    onMove: (lat: number, lon: number) => void;
    onZoomChange: (zoom: number) => void;
}> = ({ onMove, onZoomChange }) => {
    useMapEvents({
        moveend: e => {
            const c = e.target.getCenter();
            const zoom = e.target.getZoom();
            onZoomChange(zoom);
            onMove(c.lat, c.lng);
        },
        zoomend: e => {
            const zoom = e.target.getZoom();
            onZoomChange(zoom);
        }
    });
    return null;
};

interface MapComponentProps {
    userLocation: { lat: number; lon: number } | null;
    shops: Shop[];
    onLocationFound: (lat: number, lon: number) => void;
    onMapMove: (lat: number, lon: number, zoom?: number, useCache?: boolean) => void; // Zaktualizowano sygnaturę
    onRadiusChange: (radius: number) => void; // Dodano brakującą prop
    loading: boolean;
    hasRealLocation: boolean;
    onShopSelect?: (shop: Shop) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
                                                       userLocation,
                                                       shops,
                                                       onLocationFound,
                                                       onMapMove,
                                                       onRadiusChange, // Dodano destrukturyzację
                                                       loading,
                                                       hasRealLocation,
                                                       onShopSelect = () => {}
                                                   }) => {
    const [mapCenter, setMapCenter] = useState<[number, number]>([52.2319, 21.0067]);
    const [mapZoom, setMapZoom] = useState(12);
    const [currentZoom, setCurrentZoom] = useState(12); //eslint-disable-line

    useEffect(() => {
        if (userLocation) {
            setMapCenter([userLocation.lat, userLocation.lon]);
            setMapZoom(15);
        }
    }, [userLocation]);

    const getCurrentLocation = useCallback(() => { //eslint-disable-line
        if (!navigator.geolocation) {
            alert('Geolokalizacja nieobsługiwana w tej przeglądarce');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => onLocationFound(pos.coords.latitude, pos.coords.longitude),
            () => alert('Nie udało się pobrać lokalizacji'),
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000 }
        );
    }, [onLocationFound]);

    return (
        <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            minZoom={6}
            maxZoom={18}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <CustomZoomControl />
            <MapCenter center={mapCenter} />
            <MapMoveWatcher
                onMove={(lat, lon) => onMapMove(lat, lon)}
                onZoomChange={setCurrentZoom}
            />
            <ClusterHandler
                shops={shops}
                userLocation={userLocation}
                onMapMove={onMapMove} // Poprawiono - przekazujemy właściwą funkcję
                loading={loading}
                onRadiusChange={onRadiusChange} // Poprawiono - przekazujemy właściwą funkcję
                onShopSelect={onShopSelect}
            />
            {userLocation && hasRealLocation && (
                <Marker
                    position={[userLocation.lat, userLocation.lon]}
                    icon={createUserIcon()}
                />
            )}
            <div
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 1000,
                    background: 'rgba(255,255,255,0.95)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    color: '#2563eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(10px)',
                    fontSize: '16px'
                }}
            >
                🐗 DZIK Finder
            </div>
        </MapContainer>
    );
};

export default MapComponent;