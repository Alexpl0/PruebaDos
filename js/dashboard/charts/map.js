/**
 * MÓDULO DE VISUALIZACIÓN GEOGRÁFICA DE ORÍGENES Y DESTINOS
 * 
 * Este módulo implementa un mapa interactivo que muestra las ubicaciones de origen
 * y destino de los envíos, así como las rutas entre ellas. Permite visualizar
 * de manera geoespacial el flujo de envíos entre diferentes ciudades y países.
 * 
 * Utiliza la biblioteca Leaflet (L) para la representación cartográfica y 
 * servicios de geocodificación para convertir nombres de ciudades en coordenadas.
 */

// Importación de la función que proporciona acceso a los datos filtrados según los criterios
// establecidos en el dashboard. Esta función nos permite trabajar siempre con el conjunto
// de datos actualizado según las selecciones del usuario.
import { getFilteredData } from '../dataDashboard.js';

// Importación del objeto de configuración global para los mapas.
// Este objeto almacena referencias a todas las instancias de mapas en el dashboard.
import { maps } from '../configDashboard.js';

// Importación de la función de geocodificación que convierte nombres de lugares
// en coordenadas geográficas (latitud y longitud) mediante servicios externos.
import { geocodeLocation } from '../utilsDashboard.js';

/**
 * Función principal que genera o actualiza el mapa de orígenes y destinos
 * 
 * Esta función es asíncrona ya que realiza operaciones de geocodificación que requieren
 * esperar respuestas de APIs externas.
 * 
 * El proceso completo incluye:
 * 1. Inicialización del mapa si no existe o limpieza si ya existe
 * 2. Extracción y procesamiento de datos de origen y destino
 * 3. Geocodificación de ubicaciones (conversión de nombres a coordenadas)
 * 4. Creación de marcadores para las ubicaciones
 * 5. Creación de líneas para representar las rutas entre ubicaciones
 * 6. Ajuste automático de la vista del mapa
 */
export async function renderOriginDestinyMap() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderOriginDestinyMap:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: INICIALIZACIÓN O LIMPIEZA DEL MAPA
    // Verifica si el mapa ya existe para decidir si debe crearlo o solo actualizarlo
    if (!maps.originDestiny) {
        // PASO 1.1: CREACIÓN INICIAL DEL MAPA
        // Si el mapa no existe, lo crea con una vista centrada en el globo (lat:25, lon:0)
        // y un nivel de zoom global (nivel 2)
        maps.originDestiny = L.map('mapOriginDestiny').setView([25, 0], 2);
        
        // Añade la capa base de OpenStreetMap (tiles/cuadrículas del mapa base)
        // {s} representa el subdominio, {z} el nivel de zoom, {x} e {y} las coordenadas del tile
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            // Atribución obligatoria por los términos de uso de OpenStreetMap
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(maps.originDestiny);
    } else {
        // PASO 1.2: LIMPIEZA DEL MAPA EXISTENTE
        // Si el mapa ya existe, elimina todas las capas excepto la base (marcadores y rutas anteriores)
        maps.originDestiny.eachLayer(function(layer) {
            // Las capas base de tiles tienen una propiedad _url, las capas de datos no
            if (!layer._url) {  // Si no tiene URL, no es la capa base del mapa
                maps.originDestiny.removeLayer(layer);
            }
        });
    }
    
    // PASO 2: INICIALIZACIÓN DEL CACHÉ DE COORDENADAS
    // Recupera la caché de coordenadas almacenada en localStorage para evitar
    // geocodificar repetidamente las mismas ubicaciones entre sesiones o actualizaciones
    const coordCache = JSON.parse(localStorage.getItem('mapCoordinatesCache') || '{}');
    
    // PASO 3: ESTRUCTURAS DE DATOS PARA EL PROCESAMIENTO
    // Map para almacenar información de las ubicaciones (orígenes y destinos)
    // La clave será el nombre descriptivo de la ubicación y el valor contendrá sus datos
    const locations = new Map();
    
    // Array para almacenar información sobre las rutas entre ubicaciones
    const routes = [];
    
    // Array para almacenar las promesas de geocodificación para poder esperarlas todas
    const geocodePromises = [];
    
    // PASO 4: PROCESAMIENTO DE CADA REGISTRO DE DATOS
    // Itera sobre cada elemento filtrado para extraer y procesar sus ubicaciones
    filteredData.forEach(item => {
        // PASO 4.1: VALIDACIÓN DE DATOS MÍNIMOS
        // Omite registros que no tengan ciudad de origen o destino
        if (!item.origin_city || !item.destiny_city) return;
        
        // PASO 4.2: GENERACIÓN DE CLAVES DESCRIPTIVAS
        // Crea claves descriptivas para origen y destino con formato "Empresa (Ciudad, Estado)"
        const originKey = `${item.origin_company_name || 'Unknown'} (${item.origin_city}, ${item.origin_state || 'Unknown'})`;
        const destKey = `${item.destiny_company_name || 'Unknown'} (${item.destiny_city}, ${item.destiny_state || 'Unknown'})`;
        
        // PASO 4.3: PROCESAMIENTO DE LA UBICACIÓN DE ORIGEN
        // Verifica si esta ubicación de origen ya ha sido procesada
        if (!locations.has(originKey)) {
            // Crea una clave para el caché de coordenadas basada en ciudad, estado y país
            const cacheKey = `${item.origin_city}-${item.origin_state || 'Unknown'}-${item.origin_country || 'Unknown'}`;
            
            // PASO 4.3.1: VERIFICACIÓN EN CACHÉ
            // Si tenemos las coordenadas en caché, las usamos directamente
            if (coordCache[cacheKey]) {
                locations.set(originKey, {
                    lat: coordCache[cacheKey].lat,      // Latitud desde caché
                    lng: coordCache[cacheKey].lng,      // Longitud desde caché
                    count: 1,                           // Inicializa contador de envíos
                    isOrigin: true                      // Marca como ubicación de origen
                });
            } else {
                // PASO 4.3.2: GEOCODIFICACIÓN SI NO ESTÁ EN CACHÉ
                // Si no está en caché, añade una promesa de geocodificación para obtener coordenadas
                geocodePromises.push(
                    geocodeLocation(item.origin_city, item.origin_state, item.origin_country)
                    .then(coords => {
                        if (coords) {
                            // Si se obtuvieron coordenadas válidas, las guardamos en caché
                            coordCache[cacheKey] = coords;
                            localStorage.setItem('mapCoordinatesCache', JSON.stringify(coordCache));
                            
                            // Y las añadimos a la estructura de ubicaciones
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
            // Si la ubicación ya existe, simplemente incrementamos su contador
            locations.get(originKey).count++;
        }
        
        // PASO 4.4: PROCESAMIENTO DE LA UBICACIÓN DE DESTINO
        // Similar al proceso de origen, pero marcando isOrigin como false
        if (!locations.has(destKey)) {
            const cacheKey = `${item.destiny_city}-${item.destiny_state || 'Unknown'}-${item.destiny_country || 'Unknown'}`;
            
            if (coordCache[cacheKey]) {
                locations.set(destKey, {
                    lat: coordCache[cacheKey].lat,
                    lng: coordCache[cacheKey].lng,
                    count: 1,
                    isOrigin: false                    // Marca como ubicación de destino
                });
            } else {
                geocodePromises.push(
                    geocodeLocation(item.destiny_city, item.destiny_state, item.destiny_country)
                    .then(coords => {
                        if (coords) {
                            coordCache[cacheKey] = coords;
                            localStorage.setItem('mapCoordinatesCache', JSON.stringify(coordCache));
                            
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
        
        // PASO 4.5: PROCESAMIENTO DE LA RUTA
        // Solo añadimos la ruta si ya tenemos las coordenadas de origen y destino
        // Esto es para evitar rutas incompletas durante la geocodificación asíncrona
        if (coordCache[`${item.origin_city}-${item.origin_state || 'Unknown'}-${item.origin_country || 'Unknown'}`] && 
            coordCache[`${item.destiny_city}-${item.destiny_state || 'Unknown'}-${item.destiny_country || 'Unknown'}`]) {
            routes.push({
                origin: originKey,                  // Clave de la ubicación de origen
                destination: destKey,               // Clave de la ubicación de destino
                count: 1,                           // Contador de envíos por esta ruta
                transport: item.transport || 'Unknown'  // Tipo de transporte utilizado
            });
        }
    });
    
    // PASO 5: ESPERA A QUE TERMINEN TODAS LAS GEOCODIFICACIONES
    // Utiliza Promise.allSettled para esperar que todas las promesas se resuelvan o rechacen
    // Sin detener el proceso si alguna falla (a diferencia de Promise.all)
    await Promise.allSettled(geocodePromises);
    
    // PASO 6: CREACIÓN DE MARCADORES EN EL MAPA
    // Itera por todas las ubicaciones para crear marcadores visuales
    locations.forEach((location, name) => {
        // Solo crea marcadores para ubicaciones con coordenadas válidas
        if (location.lat && location.lng) {
            // PASO 6.1: CONFIGURACIÓN DE APARIENCIA DEL MARCADOR
            // Color diferente según sea origen (azul) o destino (rojo)
            const markerColor = location.isOrigin ? 'blue' : 'red';
            
            // Crea un icono personalizado como círculo cuyo tamaño depende del número de envíos
            // Esto hace que ubicaciones con más envíos sean más prominentes en el mapa
            const icon = L.divIcon({
                className: 'custom-div-icon',    // Clase CSS para posible estilización adicional
                // HTML interno del icono: un div circular con color y tamaño dinámicos
                html: `<div style="background-color: ${markerColor}; width: ${10 + location.count * 2}px; height: ${10 + location.count * 2}px; border-radius: 50%; opacity: 0.7;"></div>`,
                iconSize: [30, 30],              // Tamaño del contenedor del icono
                iconAnchor: [15, 15]             // Punto del icono que se alinea con la coordenada
            });
            
            // PASO 6.2: CREACIÓN DEL MARCADOR EN EL MAPA
            // Crea el marcador en las coordenadas especificadas con el icono personalizado
            L.marker([location.lat, location.lng], { icon: icon })
                .addTo(maps.originDestiny)       // Añade el marcador al mapa
                .bindPopup(`<b>${name}</b><br>Envíos: ${location.count}`);  // Configura el popup informativo
        }
    });
    
    // PASO 7: CREACIÓN DE LÍNEAS DE RUTA EN EL MAPA
    // Itera por todas las rutas para dibujar líneas entre orígenes y destinos
    routes.forEach(route => {
        // Obtiene las coordenadas de la ubicación de origen y destino
        const originLoc = locations.get(route.origin);
        const destLoc = locations.get(route.destination);
        
        // Verifica que ambas ubicaciones tengan coordenadas válidas
        if (originLoc && destLoc && originLoc.lat && originLoc.lng && destLoc.lat && destLoc.lng) {
            // PASO 7.1: CREACIÓN DE LA LÍNEA DE RUTA
            // Crea una línea (polyline) entre las coordenadas de origen y destino
            L.polyline([[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]], {
                color: getTransportColor(route.transport),  // Color según el tipo de transporte
                weight: 1 + route.count * 0.5,              // Grosor de línea en función del número de envíos
                opacity: 0.6,                               // Semitransparencia para evitar sobrecarga visual
                // Patrón de línea punteada para transporte aéreo, sólida para otros
                dashArray: route.transport.toLowerCase().includes('air') ? '5, 5' : null
            }).addTo(maps.originDestiny)  // Añade la línea al mapa
              // Configura el popup informativo con detalles de la ruta
              .bindPopup(`<b>${route.origin}</b> → <b>${route.destination}</b><br>Transporte: ${route.transport}<br>Envíos: ${route.count}`);
        }
    });
    
    // PASO 8: AJUSTE AUTOMÁTICO DE LA VISTA DEL MAPA
    // Ajusta la vista para que todas las ubicaciones sean visibles simultáneamente
    if (locations.size > 0) {
        // Extrae todas las coordenadas válidas de las ubicaciones
        const allCoords = Array.from(locations.values())
            .filter(loc => loc.lat && loc.lng)    // Filtra solo ubicaciones con coordenadas válidas
            .map(loc => [loc.lat, loc.lng]);      // Convierte a array de pares [lat, lng]
        
        // Si hay al menos una coordenada válida, ajusta la vista
        if (allCoords.length > 0) {
            // fitBounds ajusta el nivel de zoom y centro para que todos los puntos sean visibles
            maps.originDestiny.fitBounds(allCoords);
        }
    }
}

/**
 * Función auxiliar que determina el color a usar para cada tipo de transporte
 * 
 * Esta función asigna colores específicos según el tipo de transporte para
 * facilitar la identificación visual de las diferentes modalidades en el mapa.
 * 
 * @param {string} transport - Tipo de transporte (air, truck, sea, train, etc.)
 * @returns {string} Color en formato hexadecimal (#RRGGBB)
 */
function getTransportColor(transport) {
    // Convierte a minúsculas y maneja casos donde el valor es undefined o null
    const transportLower = (transport || '').toLowerCase();
    
    // Asigna colores según palabras clave en el tipo de transporte
    if (transportLower.includes('air')) {
        return '#FF7043'; // Naranja para transporte aéreo
    } else if (transportLower.includes('truck') || transportLower.includes('road')) {
        return '#4CAF50'; // Verde para transporte por carretera
    } else if (transportLower.includes('sea') || transportLower.includes('ocean')) {
        return '#2196F3'; // Azul para transporte marítimo
    } else if (transportLower.includes('train') || transportLower.includes('rail')) {
        return '#9C27B0'; // Púrpura para transporte ferroviario
    } else {
        return '#78909C'; // Gris para tipos de transporte desconocidos o no especificados
    }
}