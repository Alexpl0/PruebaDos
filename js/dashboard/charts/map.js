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

// Import the DataTables configuration
import { dataTablesConfig } from '../configDashboard.js';

// Add a reference to store the routes DataTable instance
let routesTable = null;
// Store selected route for highlighting
let highlightedRoute = null;

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
    // console.log("[DEBUG] renderOriginDestinyMap:", getFilteredData().length);
    
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
        
        // console.log("[DEBUG] Processing:", originKey, destKey);
        
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
    
    // PASO 5.5: PREPARAR DATOS PARA LA TABLA DE RUTAS
    // Consolidar rutas duplicadas sumando sus contadores
    const consolidatedRoutes = [];
    const routeIndex = {};
    
    routes.forEach(route => {
        const routeKey = `${route.origin}|${route.destination}|${route.transport}`;
        
        if (routeIndex[routeKey] === undefined) {
            // Primera vez que vemos esta ruta exacta
            route.id = consolidatedRoutes.length; // Add an ID for reference
            routeIndex[routeKey] = consolidatedRoutes.length;
            consolidatedRoutes.push(route);
        } else {
            // Ya existe, incrementamos su contador
            consolidatedRoutes[routeIndex[routeKey]].count += route.count;
        }
    });

    // PASO 6: ESPERA A QUE TERMINEN TODAS LAS GEOCODIFICACIONES
    // Utiliza Promise.allSettled para esperar que todas las promesas se resuelvan o rechacen
    // Sin detener el proceso si alguna falla (a diferencia de Promise.all)
    await Promise.allSettled(geocodePromises);
    
    // PASO 7: CREACIÓN DE MARCADORES EN EL MAPA
    // Itera por todas las ubicaciones para crear marcadores visuales
    locations.forEach((location, name) => {
        // Solo crea marcadores para ubicaciones con coordenadas válidas
        if (location.lat && location.lng) {
            // PASO 7.1: CONFIGURACIÓN DE APARIENCIA DEL MARCADOR
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
            
            // PASO 7.2: CREACIÓN DEL MARCADOR EN EL MAPA
            // Crea el marcador en las coordenadas especificadas con el icono personalizado
            L.marker([location.lat, location.lng], { icon: icon })
                .addTo(maps.originDestiny)       // Añade el marcador al mapa
                .bindPopup(`<b>${name}</b><br>Shipments: ${location.count}`);  // Configura el popup informativo
        }
    });
    
    // PASO 8: CREACIÓN DE LÍNEAS DE RUTA EN EL MAPA
    // Itera por todas las rutas para dibujar líneas entre orígenes y destinos
    routes.forEach(route => {
        // Obtiene las coordenadas de la ubicación de origen y destino
        const originLoc = locations.get(route.origin);
        const destLoc = locations.get(route.destination);
        
        // Verifica que ambas ubicaciones tengan coordenadas válidas
        if (originLoc && destLoc && originLoc.lat && originLoc.lng && destLoc.lat && destLoc.lng) {
            // PASO 8.1: CREACIÓN DE LA LÍNEA DE RUTA
            // Crea una línea (polyline) entre las coordenadas de origen y destino
            L.polyline([[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]], {
                color: getTransportColor(route.transport),  // Color según el tipo de transporte
                weight: 1 + route.count * 0.5,              // Grosor de línea en función del número de envíos
                opacity: 0.6,                               // Semitransparencia para evitar sobrecarga visual
                // Patrón de línea punteada para transporte aéreo, sólida para otros
                dashArray: route.transport.toLowerCase().includes('air') ? '5, 5' : null
            }).addTo(maps.originDestiny)  // Añade la línea al mapa
              // Configura el popup informativo con detalles de la ruta
              .bindPopup(`<b>${route.origin}</b> → <b>${route.destination}</b><br>Transport: ${route.transport}<br>Shipments: ${route.count}`);
        }
    });
    
    // PASO 9: CREAR O ACTUALIZAR LA TABLA DE RUTAS
    createRoutesTable(consolidatedRoutes, maps.originDestiny, locations);
    
    // PASO 10: AJUSTE AUTOMÁTICO DE LA VISTA DEL MAPA
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

/**
 * Función para crear o actualizar la tabla interactiva de rutas
 * 
 * Esta función genera una tabla de datos con todas las rutas de envío,
 * permitiendo filtrar, ordenar y seleccionar rutas específicas para
 * destacarlas en el mapa.
 * 
 * @param {Array} routes - Array de objetos ruta con origen, destino, tipo de transporte y contador
 * @param {Object} map - Instancia del mapa Leaflet donde se visualizan las rutas
 * @param {Map} locations - Mapa con las ubicaciones y sus coordenadas
 */
function createRoutesTable(routes, map, locations) {
    // Prepara los datos para la tabla en el formato esperado por DataTables
    const tableData = routes.map(route => {
        return [
            route.origin,                        // Columna 1: Origen
            route.destination,                   // Columna 2: Destino
            route.transport || 'Unspecified',    // Columna 3: Tipo de transporte
            route.count,                         // Columna 4: Número de envíos
            route.id                             // Columna 5 (oculta): ID interno para referencia
        ];
    });
    
    // Si ya existe una instancia de la tabla, la destruimos para recrearla
    if (routesTable !== null) {
        routesTable.destroy();
        document.querySelector('#routesTable tbody').innerHTML = '';
    }
    
    // Crea la nueva instancia de DataTable con configuración personalizada
    routesTable = $('#routesTable').DataTable({
        ...dataTablesConfig,           // Configuración básica importada
        data: tableData,               // Datos para la tabla
        pageLength: 5,                 // Entradas por página (más compacto)
        order: [[3, 'desc']],          // Ordenar por cantidad de envíos (descendente)
        columnDefs: [
            {
                // Oculta la columna de ID
                targets: 4,
                visible: false
            }
        ],
        language: {
            search: "Search routes:",
            lengthMenu: "Show _MENU_ routes",
            info: "Showing _START_ to _END_ of _TOTAL_ routes",
            infoEmpty: "No routes available",
            emptyTable: "No route data available"
        }
    });
    
    // Agregar el evento de clic en las filas de la tabla
    $('#routesTable tbody').on('click', 'tr', function() {
        const rowData = routesTable.row(this).data();
        const routeId = rowData[4]; // ID de la ruta (columna oculta)
        
        // Toggle clase de selección visual
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
            highlightedRoute = null;
            // Restaurar visualización normal del mapa
            resetMapHighlight(map);
        } else {
            // Deseleccionar cualquier otra fila previamente seleccionada
            $('#routesTable tbody tr.selected').removeClass('selected');
            $(this).addClass('selected');
            
            // Guarda el ID de la ruta seleccionada
            highlightedRoute = routeId;
            
            // Busca la ruta correspondiente
            const selectedRoute = routes.find(r => r.id === routeId);
            if (!selectedRoute) return;
            
            // Destaca la ruta en el mapa
            highlightRouteOnMap(selectedRoute, map, locations);
            
            // Actualiza el filtro global para otros gráficos
            applyRouteFilterToDashboard(selectedRoute);
        }
    });
}

/**
 * Destaca una ruta específica en el mapa y centra la vista
 * 
 * @param {Object} route - Objeto con información de la ruta seleccionada
 * @param {Object} map - Instancia del mapa Leaflet
 * @param {Map} locations - Mapa con las ubicaciones y sus coordenadas
 */
function highlightRouteOnMap(route, map, locations) {
    // Primero, reestablece cualquier resaltado anterior
    resetMapHighlight(map);
    
    // Obtiene las ubicaciones de origen y destino
    const originLoc = locations.get(route.origin);
    const destLoc = locations.get(route.destination);
    
    // Verifica que ambas coordenadas existan
    if (originLoc && destLoc && originLoc.lat && originLoc.lng && 
        destLoc.lat && destLoc.lng) {
        
        // Crea una línea destacada entre origen y destino
        const highlightLine = L.polyline(
            [[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]],
            {
                color: '#FF4500',      // Naranja brillante para destacar
                weight: 6,             // Grosor aumentado
                opacity: 0.9,          // Alta opacidad para visibilidad
                dashArray: '10, 10',   // Línea punteada para destacar
                className: 'route-highlight' // Clase CSS para posible animación
            }
        ).addTo(map);
        
        // Guarda referencia a la línea destacada en el mapa para eliminarla después
        map.highlightedLayer = highlightLine;
        
        // Centra el mapa en la ruta
        const bounds = L.latLngBounds(
            [originLoc.lat, originLoc.lng],
            [destLoc.lat, destLoc.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50] });
        
        // Crea marcadores destacados para origen y destino
        const originMarker = L.circleMarker([originLoc.lat, originLoc.lng], {
            color: '#000',
            fillColor: '#3388FF',
            fillOpacity: 1,
            radius: 8,
            weight: 3
        }).addTo(map).bindPopup(`<b>${route.origin}</b><br>Origin`).openPopup();
        
        const destMarker = L.circleMarker([destLoc.lat, destLoc.lng], {
            color: '#000',
            fillColor: '#FF3333',
            fillOpacity: 1,
            radius: 8,
            weight: 3
        }).addTo(map).bindPopup(`<b>${route.destination}</b><br>Destination`);
        
        // Guarda referencia a los marcadores
        map.highlightedMarkers = [originMarker, destMarker];
    }
}

/**
 * Elimina los elementos de resaltado del mapa
 * 
 * @param {Object} map - Instancia del mapa Leaflet
 */
function resetMapHighlight(map) {
    // Elimina la línea destacada si existe
    if (map.highlightedLayer) {
        map.removeLayer(map.highlightedLayer);
        map.highlightedLayer = null;
    }
    
    // Elimina los marcadores destacados si existen
    if (map.highlightedMarkers && map.highlightedMarkers.length) {
        map.highlightedMarkers.forEach(marker => map.removeLayer(marker));
        map.highlightedMarkers = [];
    }
}

/**
 * Aplica un filtro adicional al dashboard basado en la ruta seleccionada
 * 
 * @param {Object} route - Objeto con información de la ruta seleccionada
 */
function applyRouteFilterToDashboard(route) {
    // Esta función puede implementarse para integrarse con el sistema
    // de filtros global del dashboard
    
    // Por ejemplo, podría emitir un evento personalizado que otros módulos escuchen:
    const routeFilterEvent = new CustomEvent('route:selected', { 
        detail: {
            origin: route.origin,
            destination: route.destination,
            transport: route.transport
        }
    });
    document.dispatchEvent(routeFilterEvent);
    
    // O si hay un sistema de filtros ya implementado, podría llamarlo directamente
    // Ejemplo: applyFilter('route', { origin: route.origin, destination: route.destination });
    
    // Para mayor integración, se podría añadir un botón en la UI para limpiar este filtro
}

// Agrega un event listener para limpiar el filtro cuando se actualice el mapa
export function clearRouteHighlight() {
    // Elimina la selección visual en la tabla
    if (routesTable) {
        $('#routesTable tbody tr.selected').removeClass('selected');
    }
    
    // Restaura el mapa si existe
    if (maps.originDestiny) {
        resetMapHighlight(maps.originDestiny);
    }
    
    // Limpia la variable de ruta seleccionada
    highlightedRoute = null;
}