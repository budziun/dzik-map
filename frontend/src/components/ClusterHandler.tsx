import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Marker, useMap } from 'react-leaflet'; // Usunąłem Popup z importów
import { LatLngBounds } from 'leaflet';
import { debounce } from 'lodash';
import { Shop, calculateDynamicRadius } from '../services/api';
import { useMapClustering } from '../hooks/useMapClustering';
import { createClusterIcon, createShopIcon } from './ShopIcons';

interface ClusterHandlerProps {
    shops: Shop[];
    userLocation: { lat: number; lon: number } | null;
    onMapMove: (lat: number, lon: number, zoom: number, useCache?: boolean) => void;
    loading: boolean;
    onRadiusChange: (radius: number) => void;
    onShopSelect?: (shop: Shop) => void;
}

const ClusterHandler: React.FC<ClusterHandlerProps> = ({
                                                           shops,
                                                           userLocation,
                                                           onMapMove,
                                                           loading,
                                                           onRadiusChange,
                                                           onShopSelect = () => {}
                                                       }) => {
    const map = useMap();
    const [currentZoom, setCurrentZoom] = useState(map.getZoom());
    const [mapBounds, setMapBounds] = useState(map.getBounds());
    const { getClustersForBounds, expandCluster } = useMapClustering(shops, currentZoom);

    const loadingRef = useRef(loading);
    loadingRef.current = loading;

    const [forceUpdate, setForceUpdate] = useState(0);

    useEffect(() => {
        if (shops.length > 0) {
            const currentBounds = map.getBounds();
            const zoom = map.getZoom();
            setMapBounds(currentBounds);
            setCurrentZoom(zoom);

            setTimeout(() => {
                setForceUpdate(prev => prev + 1);
            }, 100);
        }
    }, [shops.length, map]);

    const debouncedUpdate = useMemo(
        () => debounce((bounds: LatLngBounds, zoom: number) => {
            if (loadingRef.current) {
                return;
            }

            const center = map.getCenter();
            const currentRadius = calculateDynamicRadius(zoom);
            onRadiusChange(currentRadius);
            onMapMove(center.lat, center.lng, zoom);
        }, 500),
        [map, onMapMove, onRadiusChange]
    );

    useEffect(() => {
        let lastCenter = map.getCenter();
        let lastZoom = map.getZoom();

        const handleMoveEnd = () => {
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            const center = map.getCenter();
            setMapBounds(bounds);
            setCurrentZoom(zoom);

            const centerChanged = Math.abs(center.lat - lastCenter.lat) > 0.001 ||
                Math.abs(center.lng - lastCenter.lng) > 0.001;
            const zoomChanged = zoom !== lastZoom;

            if (zoom >= 7 && !loadingRef.current && (centerChanged || zoomChanged)) {
                debouncedUpdate(bounds, zoom);
                lastCenter = center;
                lastZoom = zoom;
            }
        };

        map.on('moveend', handleMoveEnd);
        map.on('zoomend', handleMoveEnd);

        return () => {
            map.off('moveend', handleMoveEnd);
            map.off('zoomend', handleMoveEnd);
            debouncedUpdate.cancel();
        };
    }, [map, debouncedUpdate]);

    const clusters = useMemo(() => {
        if (!mapBounds || shops.length === 0) {
            return [];
        }

        const result = getClustersForBounds(mapBounds, currentZoom);
        return result;
    }, [getClustersForBounds, mapBounds, currentZoom, shops, forceUpdate]); //eslint-disable-line

    return (
        <>
            {clusters.map((cluster, index) => {
                const [longitude, latitude] = cluster.geometry.coordinates;
                const { cluster: isCluster, point_count, shop } = cluster.properties;

                if (isCluster) {
                    return (
                        <Marker
                            key={`cluster-${index}`}
                            position={[latitude, longitude]}
                            icon={createClusterIcon(point_count)}
                            eventHandlers={{
                                click: () => {
                                    const clusterId = cluster.id;
                                    const currentZoom = map.getZoom();
                                    let expansionZoom = currentZoom + 2;

                                    if (clusterId !== undefined && typeof clusterId === 'number') {
                                        try {
                                            const suggestedZoom = expandCluster(clusterId);
                                            expansionZoom = Math.min(suggestedZoom, 17);
                                        } catch (error) {
                                            console.warn('Błąd podczas rozwijania klastra:', error);
                                            expansionZoom = Math.min(currentZoom + 2, 17);
                                        }
                                    }

                                    map.setView([latitude, longitude], expansionZoom);
                                }
                            }}
                        />
                    );
                } else {
                    const shopData = shop as Shop;

                    return (
                        <Marker
                            key={`shop-${index}`}
                            position={[latitude, longitude]}
                            icon={createShopIcon(shopData.chain, shopData.logo_url, shopData.name)}
                            eventHandlers={{
                                click: () => {
                                    onShopSelect(shopData);
                                }
                            }}
                        >
                        </Marker>
                    );
                }
            })}
        </>
    );
};

export default ClusterHandler;
