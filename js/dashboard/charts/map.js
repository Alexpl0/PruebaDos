/**
 * MÓDULO DE VISUALIZACIÓN GEOGRÁFICA DE ORÍGENES Y DESTINOS
 * * Este módulo implementa un mapa interactivo que muestra las ubicaciones de origen
 * y destino de los envíos, así como las rutas entre ellas. Permite visualizar
 * de manera geoespacial el flujo de envíos.
 * * Utiliza Leaflet para el mapa, DataTables para la tabla de rutas, y
 * un servicio de geocodificación para convertir nombres de ciudades en coordenadas.
 */

import { getFilteredData } from '../dataDashboard.js';
import { maps, dataTablesConfig, chartData } from '../configDashboard.js';
import { geocodeLocation } from '../utilsDashboard.js';

// Referencias globales para la instancia de la tabla y la ruta seleccionada
let routesTable = null;
let highlightedRoute = null;

/**
 * Función principal que genera o actualiza el mapa de orígenes y destinos.
 * Es asíncrona debido a la necesidad de esperar por la geocodificación.
 */
export async function renderOriginDestinyMap() {
    const filteredData = getFilteredData();

    // 1. Inicializa el mapa si no existe, o lo limpia si ya existe.
    if (!maps.originDestiny) {
        maps.originDestiny = L.map('mapOriginDestiny').setView([25, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(maps.originDestiny);
    } else {
        maps.originDestiny.eachLayer(layer => {
            if (!layer._url) {
                maps.originDestiny.removeLayer(layer);
            }
        });
    }

    // 2. Procesa los datos para obtener ubicaciones y rutas únicas.
    const coordCache = JSON.parse(localStorage.getItem('mapCoordinatesCache') || '{}');
    const locations = new Map();
    const geocodePromises = [];

    // Agrupa las rutas para consolidar los conteos
    const consolidatedRoutes = [];
    const routeIndex = {};
    
    filteredData.forEach(item => {
        if (!item.origin_city || !item.destiny_city) return;
        
        const originKey = `${item.origin_company_name || 'Unknown'} (${item.origin_city})`;
        const destKey = `${item.destiny_company_name || 'Unknown'} (${item.destiny_city})`;
        const transport = item.transport || 'Unknown';
        const routeKey = `${originKey}|${destKey}|${transport}`;

        if (routeIndex[routeKey] === undefined) {
            routeIndex[routeKey] = consolidatedRoutes.length;
            consolidatedRoutes.push({ origin: originKey, destination: destKey, transport: transport, count: 1, id: consolidatedRoutes.length });
        } else {
            consolidatedRoutes[routeIndex[routeKey]].count++;
        }

        // Procesa ubicaciones para geocodificación
        [
            { key: originKey, city: item.origin_city, state: item.origin_state, country: item.origin_country, isOrigin: true },
            { key: destKey, city: item.destiny_city, state: item.destiny_state, country: item.destiny_country, isOrigin: false }
        ].forEach(locInfo => {
            if (!locations.has(locInfo.key)) {
                const cacheKey = `${locInfo.city}-${locInfo.state || 'N/A'}-${locInfo.country || 'N/A'}`;
                locations.set(locInfo.key, { count: 0, isOrigin: locInfo.isOrigin }); // Placeholder
                
                if (coordCache[cacheKey]) {
                    locations.set(locInfo.key, { ...locations.get(locInfo.key), lat: coordCache[cacheKey].lat, lng: coordCache[cacheKey].lng });
                } else {
                    geocodePromises.push(
                        geocodeLocation(locInfo.city, locInfo.state, locInfo.country).then(coords => {
                            if (coords) {
                                coordCache[cacheKey] = coords;
                                localStorage.setItem('mapCoordinatesCache', JSON.stringify(coordCache));
                                locations.set(locInfo.key, { ...locations.get(locInfo.key), lat: coords.lat, lng: coords.lng });
                            }
                        })
                    );
                }
            }
            locations.get(locInfo.key).count++;
        });
    });

    // 3. Espera a que todas las promesas de geocodificación terminen.
    await Promise.allSettled(geocodePromises);

    // 4. Dibuja los marcadores y las rutas en el mapa.
    const allCoords = [];
    locations.forEach((location, name) => {
        if (location.lat && location.lng) {
            allCoords.push([location.lat, location.lng]);
            const markerColor = location.isOrigin ? 'blue' : 'red';
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:${markerColor};width:${10 + location.count}px;height:${10 + location.count}px;border-radius:50%;opacity:0.7;"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            L.marker([location.lat, location.lng], { icon })
                .addTo(maps.originDestiny)
                .bindPopup(`<b>${name}</b><br>Shipments: ${location.count}`);
        }
    });

    consolidatedRoutes.forEach(route => {
        const originLoc = locations.get(route.origin);
        const destLoc = locations.get(route.destination);
        if (originLoc?.lat && destLoc?.lat) {
            L.polyline([[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]], {
                color: getTransportColor(route.transport),
                weight: 1 + route.count * 0.2,
                opacity: 0.6,
                dashArray: route.transport.toLowerCase().includes('air') ? '5, 5' : null
            }).addTo(maps.originDestiny)
              .bindPopup(`<b>${route.origin}</b> → <b>${route.destination}</b><br>Transport: ${route.transport}<br>Shipments: ${route.count}`);
        }
    });

    // 5. Guarda los datos para la exportación a Excel.
    chartData['routesMap'] = {
        title: 'Shipment Routes',
        headers: ['Origin', 'Destination', 'Transport Method', 'Number of Shipments'],
        data: consolidatedRoutes.map(route => [
            route.origin,
            route.destination,
            route.transport,
            route.count
        ])
    };

    // 6. Crea o actualiza la tabla de rutas.
    createRoutesTable(consolidatedRoutes, maps.originDestiny, locations);

    // 7. Ajusta la vista del mapa.
    if (allCoords.length > 0) {
        maps.originDestiny.fitBounds(allCoords, { padding: [50, 50] });
    }
}

/**
 * Asigna un color basado en el tipo de transporte.
 * @param {string} transport - El tipo de transporte.
 * @returns {string} Un color hexadecimal.
 */
function getTransportColor(transport) {
    const transportLower = (transport || '').toLowerCase();
    if (transportLower.includes('air')) return '#FF7043'; // Naranja
    if (transportLower.includes('truck') || transportLower.includes('road')) return '#4CAF50'; // Verde
    if (transportLower.includes('sea') || transportLower.includes('ocean')) return '#2196F3'; // Azul
    if (transportLower.includes('train') || transportLower.includes('rail')) return '#9C27B0'; // Púrpura
    return '#78909C'; // Gris
}

/**
 * Crea o actualiza la tabla interactiva de rutas con DataTables.
 * @param {Array} routes - Los datos de las rutas consolidadas.
 * @param {L.Map} map - La instancia del mapa Leaflet.
 * @param {Map} locations - El mapa de ubicaciones con sus coordenadas.
 */
function createRoutesTable(routes, map, locations) {
    const tableData = routes.map(route => [
        route.origin,
        route.destination,
        route.transport,
        route.count,
        route.id // ID oculto para referencia
    ]);

    if (routesTable) {
        routesTable.destroy();
        document.querySelector('#routesTable tbody').innerHTML = '';
    }

    routesTable = $('#routesTable').DataTable({
        ...dataTablesConfig,
        data: tableData,
        pageLength: 5,
        order: [[3, 'desc']],
        columnDefs: [{ targets: 4, visible: false }],
        language: { ...dataTablesConfig.language, search: "Search routes:", emptyTable: "No route data available" }
    });

    $('#routesTable tbody').on('click', 'tr', function() {
        const rowData = routesTable.row(this).data();
        if (!rowData) return;
        const routeId = rowData[4];

        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
            highlightedRoute = null;
            resetMapHighlight(map);
        } else {
            $('#routesTable tbody tr.selected').removeClass('selected');
            $(this).addClass('selected');
            highlightedRoute = routeId;
            const selectedRoute = routes.find(r => r.id === routeId);
            if (selectedRoute) {
                highlightRouteOnMap(selectedRoute, map, locations);
            }
        }
    });
}

/**
 * Resalta una ruta específica en el mapa.
 * @param {object} route - La ruta a resaltar.
 * @param {L.Map} map - La instancia del mapa.
 * @param {Map} locations - Las ubicaciones con coordenadas.
 */
function highlightRouteOnMap(route, map, locations) {
    resetMapHighlight(map);
    const originLoc = locations.get(route.origin);
    const destLoc = locations.get(route.destination);

    if (originLoc?.lat && destLoc?.lat) {
        map.highlightedLayer = L.polyline([[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]], {
            color: '#FF4500', weight: 6, opacity: 0.9, dashArray: '10, 10'
        }).addTo(map);

        map.fitBounds([[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]], { padding: [50, 50] });
    }
}

/**
 * Elimina cualquier resaltado del mapa.
 * @param {L.Map} map - La instancia del mapa.
 */
function resetMapHighlight(map) {
    if (map.highlightedLayer) {
        map.removeLayer(map.highlightedLayer);
        map.highlightedLayer = null;
    }
}

/**
 * Limpia el resaltado de la ruta cuando cambian los filtros.
 */
export function clearRouteHighlight() {
    if (routesTable) {
        $('#routesTable tbody tr.selected').removeClass('selected');
    }
    if (maps.originDestiny) {
        resetMapHighlight(maps.originDestiny);
    }
    highlightedRoute = null;
}
