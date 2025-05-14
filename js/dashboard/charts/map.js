// Mapa de origen-destino

import { getFilteredData } from '../dataDashboard.js';
import { maps } from '../configDashboard.js';
import { geocodeLocation } from '../utils.js';

/**
 * Genera o actualiza el mapa de orígenes y destinos
 */
export async function renderOriginDestinyMap() {
    console.log("[DEBUG] renderOriginDestinyMap:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Inicializar mapa si no existe
    if (!maps.originDestiny) {
        maps.originDestiny = L.map('mapOriginDestiny').setView([25, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(maps.originDestiny);
    } else {
        // Limpiar todas las capas excepto la base
        maps.originDestiny.eachLayer(function(layer) {
            if (!layer._url) {  // Si no tiene URL, no es la capa base del mapa
                maps.originDestiny.removeLayer(layer);
            }
        });
    }
    
    // Caché de coordenadas para evitar múltiples consultas
    const coordCache = JSON.parse(localStorage.getItem('mapCoordinatesCache') || '{}');
    
    // Procesar datos para el mapa
    const locations = new Map();
    const routes = [];
    const geocodePromises = [];
    
    filteredData.forEach(item => {
        if (!item.origin_city || !item.destiny_city) return;
        
        const originKey = `${item.origin_company_name || 'Unknown'} (${item.origin_city}, ${item.origin_state || 'Unknown'})`;
        const destKey = `${item.destiny_company_name || 'Unknown'} (${item.destiny_city}, ${item.destiny_state || 'Unknown'})`;
        
        // Procesar ubicación de origen
        if (!locations.has(originKey)) {
            const cacheKey = `${item.origin_city}-${item.origin_state || 'Unknown'}-${item.origin_country || 'Unknown'}`;
            
            if (coordCache[cacheKey]) {
                locations.set(originKey, {
                    lat: coordCache[cacheKey].lat,
                    lng: coordCache[cacheKey].lng,
                    count: 1,
                    isOrigin: true
                });
            } else {
                geocodePromises.push(
                    geocodeLocation(item.origin_city, item.origin_state, item.origin_country)
                    .then(coords => {
                        if (coords) {
                            // Guardar en caché
                            coordCache[cacheKey] = coords;
                            localStorage.setItem('mapCoordinatesCache', JSON.stringify(coordCache));
                            
                            // Añadir a ubicaciones
                            locations.set(originKey, {
                                lat: coords.lat,
                                lng: coords.lng,
                                count: 1,
                                isOrigin: true
                            });
                        }
                    })
                    .catch(err => console.error(`Error geocoding ${originKey}:`, err))
                );
            }
        } else {
            locations.get(originKey).count++;
        }
        
        // Procesar ubicación de destino
        if (!locations.has(destKey)) {
            const cacheKey = `${item.destiny_city}-${item.destiny_state || 'Unknown'}-${item.destiny_country || 'Unknown'}`;
            
            if (coordCache[cacheKey]) {
                locations.set(destKey, {
                    lat: coordCache[cacheKey].lat,
                    lng: coordCache[cacheKey].lng,
                    count: 1,
                    isOrigin: false
                });
            } else {
                geocodePromises.push(
                    geocodeLocation(item.destiny_city, item.destiny_state, item.destiny_country)
                    .then(coords => {
                        if (coords) {
                            // Guardar en caché
                            coordCache[cacheKey] = coords;
                            localStorage.setItem('mapCoordinatesCache', JSON.stringify(coordCache));
                            
                            // Añadir a ubicaciones
                            locations.set(destKey, {
                                lat: coords.lat,
                                lng: coords.lng,
                                count: 1,
                                isOrigin: false
                            });
                        }
                    })
                    .catch(err => console.error(`Error geocoding ${destKey}:`, err))
                );
            }
        } else {
            locations.get(destKey).count++;
        }
        
        // Añadir ruta
        if (coordCache[`${item.origin_city}-${item.origin_state || 'Unknown'}-${item.origin_country || 'Unknown'}`] && 
            coordCache[`${item.destiny_city}-${item.destiny_state || 'Unknown'}-${item.destiny_country || 'Unknown'}`]) {
            routes.push({
                origin: originKey,
                destination: destKey,
                count: 1,
                transport: item.transport || 'Unknown'
            });
        }
    });
    
    // Esperar a que todas las geocodificaciones terminen
    await Promise.allSettled(geocodePromises);
    
    // Añadir marcadores
    locations.forEach((location, name) => {
        if (location.lat && location.lng) {
            const markerColor = location.isOrigin ? 'blue' : 'red';
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${markerColor}; width: ${10 + location.count * 2}px; height: ${10 + location.count * 2}px; border-radius: 50%; opacity: 0.7;"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            L.marker([location.lat, location.lng], { icon: icon })
                .addTo(maps.originDestiny)
                .bindPopup(`<b>${name}</b><br>Envíos: ${location.count}`);
        }
    });
    
    // Añadir rutas
    routes.forEach(route => {
        const originLoc = locations.get(route.origin);
        const destLoc = locations.get(route.destination);
        
        if (originLoc && destLoc && originLoc.lat && originLoc.lng && destLoc.lat && destLoc.lng) {
            L.polyline([[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]], {
                color: getTransportColor(route.transport),
                weight: 1 + route.count * 0.5,
                opacity: 0.6,
                dashArray: route.transport.toLowerCase().includes('air') ? '5, 5' : null
            }).addTo(maps.originDestiny)
            .bindPopup(`<b>${route.origin}</b> → <b>${route.destination}</b><br>Transporte: ${route.transport}<br>Envíos: ${route.count}`);
        }
    });
    
    // Ajustar vista si hay al menos una ubicación
    if (locations.size > 0) {
        const allCoords = Array.from(locations.values())
            .filter(loc => loc.lat && loc.lng)
            .map(loc => [loc.lat, loc.lng]);
        
        if (allCoords.length > 0) {
            maps.originDestiny.fitBounds(allCoords);
        }
    }
}

/**
 * Obtiene un color basado en el tipo de transporte
 * @param {string} transport - Tipo de transporte
 * @returns {string} Color en formato hexadecimal
 */
function getTransportColor(transport) {
    const transportLower = (transport || '').toLowerCase();
    
    if (transportLower.includes('air')) {
        return '#FF7043'; // Naranja
    } else if (transportLower.includes('truck') || transportLower.includes('road')) {
        return '#4CAF50'; // Verde
    } else if (transportLower.includes('sea') || transportLower.includes('ocean')) {
        return '#2196F3'; // Azul
    } else if (transportLower.includes('train') || transportLower.includes('rail')) {
        return '#9C27B0'; // Púrpura
    } else {
        return '#78909C'; // Gris
    }
}