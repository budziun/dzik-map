import { useMemo, useEffect, useState } from 'react'; //eslint-disable-line
import Supercluster from 'supercluster';
import { Shop } from '../services/api';
import { LatLngBounds } from 'leaflet';

interface ClusterPoint {
    type: 'Feature';
    properties: {
        cluster: boolean;
        shopId?: string;
        name?: string;
        chain?: string;
        point_count?: number;
        point_count_abbreviated?: string;
        shop?: Shop;
    };
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
}

export const useMapClustering = (shops: Shop[], zoom: number) => {
    const [clusters, setClusters] = useState([]);

    // ZWIĘKSZONE parametry klastrowania dla większych grup
    const superclusterIndex = useMemo(() => {
        const index = new Supercluster({
            radius: 220,
            maxZoom: 15,
            minZoom: 0,
            minPoints: 5,
            extent: 512,
            nodeSize: 64
        });

        if (shops.length > 0) {
            const points: ClusterPoint[] = shops.map(shop => ({
                type: 'Feature',
                properties: {
                    cluster: false,
                    shopId: shop.lat + '_' + shop.lon,
                    name: shop.name,
                    chain: shop.chain,
                    shop: shop
                },
                geometry: {
                    type: 'Point',
                    coordinates: [shop.lon, shop.lat]
                }
            }));

            index.load(points);
        }

        return index;
    }, [shops]);

    // Pobierz klastry dla danego obszaru z limitem dla wydajności
    const getClustersForBounds = (bounds: LatLngBounds, zoom: number) => {
        if (!superclusterIndex || shops.length === 0) return [];

        const bbox: [number, number, number, number] = [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth()
        ];

        // Pobierz wszystkie clustry w obszarze
        const rawClusters = superclusterIndex.getClusters(bbox, Math.floor(zoom));

        // DODAJ limit tylko na bardzo małych zoomach żeby nie przeciążyć
        if (zoom < 8 && rawClusters.length > 1000) {
            return rawClusters.slice(0, 1000);
        }

        return rawClusters;
    };

    const expandCluster = (clusterId: number) => {
        return superclusterIndex.getClusterExpansionZoom(clusterId);
    };

    return {
        getClustersForBounds,
        expandCluster,
        clusters,
        setClusters
    };
};
