import React, { useEffect } from 'react';

interface MapUIOverlayProps {
}

const MapUIOverlay: React.FC<MapUIOverlayProps> = () => {
    useEffect(() => {
        const hideAttributions = () => {
            const attributions = document.querySelectorAll('.leaflet-control-attribution');
            attributions.forEach(attr => {
                (attr as HTMLElement).style.display = 'none';
            });

            const bottomRight = document.querySelectorAll('.leaflet-bottom.leaflet-right');
            bottomRight.forEach(elem => {
                (elem as HTMLElement).style.display = 'none';
            });
        };

        hideAttributions();
        const timeout = setTimeout(hideAttributions, 100);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <>
            {/* Logo w lewym górnym rogu */}
            <div className="absolute top-2.5 left-2.5 z-[1000] bg-black bg-opacity-70 text-white px-3 py-2 rounded-md text-sm font-bold select-none">
                🐗 DZIK Finder 🛒
            </div>

            {/* Attribution na samym dole mapy */}
            <div className="fixed bottom-0 left-0 right-0 z-[2000] bg-white bg-opacity-95 border-t border-gray-300 text-xs text-gray-800 font-sans px-3 py-1 text-center select-none">
                © <a
                href="https://leafletjs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 no-underline mx-1"
            >
                Leaflet
            </a>
                | Map data © <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 no-underline ml-1"
            >
                OpenStreetMap contributors
            </a>
            </div>
        </>
    );
};

export default MapUIOverlay;
