/**
 * MÓDULO DE UTILIDADES GENERALES DEL DASHBOARD
 * 
 * Este módulo contiene funciones de uso general que proporcionan servicios
 * comunes a múltiples componentes del dashboard. Incluye funcionalidades para:
 * - Gestión de elementos visuales de carga y errores
 * - Geocodificación de ubicaciones para mapas
 * - Formateo de números para presentación consistente
 * 
 * Al centralizar estas funciones en un único módulo, se promueve la reutilización
 * de código y se facilita el mantenimiento de la aplicación.
 */

/**
 * Muestra u oculta el indicador de carga visual en la interfaz
 * 
 * Esta función controla la visibilidad del elemento de superposición de carga
 * (típicamente un spinner o animación) que indica al usuario que se está
 * realizando una operación asíncrona, como la carga de datos desde la API.
 * También deshabilita los controles de la interfaz durante la carga para
 * evitar interacciones que podrían generar resultados inconsistentes.
 * 
 * @param {boolean} show - Indica si se debe mostrar (true) o ocultar (false) el indicador
 */
export function showLoading(show) {
    // PASO 1: CONTROL DEL ELEMENTO DE SUPERPOSICIÓN
    // Busca el elemento HTML que contiene la animación de carga mediante su ID
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Verifica si el elemento se encontró en el DOM
    if (loadingOverlay) {
        // Si existe, modifica su propiedad display para mostrarlo u ocultarlo
        // 'flex' lo hace visible, 'none' lo oculta
        // El operador ternario (?) evalúa la condición 'show' para decidir qué valor asignar
        loadingOverlay.style.display = show ? 'flex' : 'none';
    } else {
        // Si el elemento no existe en el DOM, registra una advertencia en la consola
        // Esto ayuda a diagnosticar problemas de implementación en la interfaz
        console.warn('Loading overlay element not found in DOM');
    }
    
    // PASO 2: DESHABILITACIÓN DE CONTROLES DURANTE LA CARGA
    // Esto evita que el usuario interactúe con la interfaz mientras se cargan datos
    
    // Selecciona múltiples elementos mediante un selector CSS combinado:
    // - El botón de actualizar datos
    // - El filtro de plantas
    // - El filtro de estados
    const filterButtons = document.querySelectorAll('#refreshData, #plantaFilter, #statusFilter');
    
    // Itera sobre todos los elementos seleccionados
    filterButtons.forEach(button => {
        // Establece la propiedad 'disabled' según el valor del parámetro 'show'
        // Si show=true, los botones se deshabilitan; si show=false, se habilitan
        button.disabled = show;
    });
}

/**
 * Muestra un mensaje de error al usuario
 * 
 * Esta función presenta al usuario un mensaje de error de manera visual
 * utilizando una biblioteca de alertas modales (SweetAlert2) si está disponible,
 * o recurriendo a una alerta básica del navegador si no lo está.
 * También registra el error en la consola para facilitar la depuración.
 * 
 * @param {string} message - Mensaje de error a mostrar al usuario
 */
export function showErrorMessage(message) {
    // PASO 1: REGISTRO DEL ERROR EN CONSOLA
    // Registra el mensaje de error en la consola del navegador con formato de error
    // Esto facilita la identificación y depuración de problemas incluso si la
    // interfaz visual falla
    console.error('ERROR:', message);
    
    // PASO 2: VISUALIZACIÓN DEL ERROR PARA EL USUARIO
    
    // Comprueba si la biblioteca SweetAlert2 está disponible
    // typeof Swal !== 'undefined' verifica si la variable global Swal existe
    if (typeof Swal !== 'undefined') {
        // PASO 2.1: MOSTRAR ERROR CON SWEETALERT2 (PREFERIDO)
        // Si SweetAlert2 está disponible, utiliza su interfaz mejorada
        // para mostrar un modal de error atractivo
        Swal.fire({
            title: 'Error',             // Título del modal
            text: message,              // Mensaje de error detallado
            icon: 'error',              // Icono visual (símbolo de error)
            confirmButtonText: 'Ok'     // Texto del botón de confirmación
        });
    } else {
        // PASO 2.2: ALTERNATIVA CON ALERTA BÁSICA
        // Si SweetAlert2 no está disponible, utiliza la función alert() nativa
        // del navegador como alternativa más básica
        alert(message);
    }
}

/**
 * Geocodifica una ubicación textual a coordenadas geográficas
 * 
 * Esta función asíncrona convierte una dirección descrita en texto (ciudad, estado, país)
 * en coordenadas geográficas (latitud y longitud) utilizando el servicio gratuito
 * de geocodificación de OpenStreetMap (Nominatim).
 * 
 * Útil para representar ubicaciones en mapas interactivos, cuando solo se dispone
 * de descripciones textuales de los lugares.
 * 
 * @param {string} city - Nombre de la ciudad
 * @param {string} state - Nombre del estado o provincia (opcional)
 * @param {string} country - Nombre del país (opcional)
 * @param {number} retries - Número de reintentos (por defecto 2)
 * @returns {Promise<Object|null>} Promesa que resuelve a un objeto con las coordenadas {lat, lng} o null si falla
 */
export async function geocodeLocation(city, state, country, retries = 2) {
    // Validar parámetros de entrada
    if (!city || city.trim() === '') {
        console.warn('Geocoding: City parameter is required');
        return null;
    }

    const query = encodeURIComponent(`${city}, ${state || ''}, ${country || ''}`);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Agregar timeout y delay entre peticiones
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
            
            // Delay progresivo entre reintentos
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
            
            console.log(`Geocoding attempt ${attempt + 1}/${retries + 1} for: ${city}, ${state || 'N/A'}`);
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&email=your-email@example.com`,
                {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'PremiumFreightDashboard/1.0'
                    }
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                console.log(`✅ Geocoding successful for: ${city}`);
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            
            // Si no hay resultados pero la petición fue exitosa, no reintentar
            console.warn(`No results found for: ${city}, ${state || 'N/A'}`);
            return null;
            
        } catch (error) {
            console.warn(`Geocoding attempt ${attempt + 1} failed for ${city}:`, error.message);
            
            // Si es el último intento, registrar el error final
            if (attempt === retries) {
                console.error(`❌ All geocoding attempts failed for: ${city}, ${state || 'N/A'}`);
                return null;
            }
        }
    }
    
    return null;
}

/**
 * Coordenadas fallback para ciudades comunes
 */
const FALLBACK_COORDINATES = {
    'Highland Park, Michigan': { lat: 42.4031, lng: -83.0897 },
    'Nuevo Laredo, Tamaulipas': { lat: 27.4764, lng: -99.5075 },
    'Tetla, Tlaxcala': { lat: 19.2167, lng: -98.1167 },
    'Shannon, Mississippi': { lat: 34.1251, lng: -88.7120 },
    'Moore, South Carolina': { lat: 34.9540, lng: -81.9540 },
    'Longkou, Yantai, Shandong': { lat: 37.6461, lng: 120.3267 },
    'Toluca, Estado de México': { lat: 19.2927, lng: -99.6557 },
    'Queretaro, Queretaro': { lat: 20.5888, lng: -100.3899 },
    'Saltillo, Coahuila': { lat: 25.4260, lng: -101.0053 },
    'Puebla, Puebla': { lat: 19.0414, lng: -98.2063 }
};

/**
 * Obtiene coordenadas usando cache o coordenadas fallback
 */
export function getCoordinatesWithFallback(city, state, country) {
    const cacheKey = `${city}-${state || 'N/A'}-${country || 'N/A'}`;
    const fallbackKey = `${city}, ${state || ''}`;

    // Buscar en fallback
    if (FALLBACK_COORDINATES[fallbackKey]) {
        return FALLBACK_COORDINATES[fallbackKey];
    }

    // Si no hay fallback, retornar null (o implementar cache si lo deseas)
    return null;
}