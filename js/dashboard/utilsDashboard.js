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
        console.warn('Elemento de superposición de carga no encontrado en el DOM');
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
 * @returns {Promise<Object|null>} Promesa que resuelve a un objeto con las coordenadas {lat, lng} o null si falla
 */
export async function geocodeLocation(city, state, country) {
    // PASO 1: CONSTRUCCIÓN DE LA CONSULTA
    // Combina los parámetros de ubicación en un solo string de consulta
    // encodeURIComponent escapa caracteres especiales para que sean seguros en una URL
    const query = encodeURIComponent(`${city}, ${state || ''}, ${country || ''}`);
    
    try {
        // PASO 2: PETICIÓN AL SERVICIO DE GEOCODIFICACIÓN
        // Realiza una petición HTTP al API de Nominatim (OpenStreetMap)
        // format=json solicita la respuesta en formato JSON
        // q= es el parámetro de consulta (la ubicación a geocodificar)
        // limit=1 limita los resultados al más relevante
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        
        // PASO 3: PROCESAMIENTO DE LA RESPUESTA
        // Convierte la respuesta HTTP a un objeto JavaScript
        const data = await response.json();
        
        // PASO 4: VALIDACIÓN Y EXTRACCIÓN DE DATOS
        // Verifica si hay resultados disponibles
        if (data && data.length > 0) {
            // Si hay al menos un resultado, extrae las coordenadas y las retorna
            // como un objeto con formato estandarizado {lat, lng}
            return {
                lat: parseFloat(data[0].lat),  // Latitud convertida a número
                lng: parseFloat(data[0].lon)   // Longitud convertida a número
            };
        }
        
        // Si no hay resultados, retorna null para indicar que la geocodificación falló
        return null;
    } catch (error) {
        // PASO 5: MANEJO DE ERRORES
        // Si ocurre cualquier error durante el proceso, lo registra en consola
        console.error("Error de geocodificación:", error);
        
        // Y retorna null para indicar que la operación falló
        return null;
    }
}

/**
 * Formatea un número para mostrar con separador de miles y decimales controlados
 * 
 * Esta función convierte valores numéricos a representaciones textuales amigables
 * para la visualización, aplicando separadores de miles según la configuración
 * regional del navegador y controlando la cantidad de decimales mostrados.
 * 
 * Es especialmente útil para mostrar valores monetarios, porcentajes, o cualquier
 * valor numérico en la interfaz del dashboard.
 * 
 * @param {number} number - Número a formatear
 * @param {number} maxDecimals - Número máximo de decimales a mostrar (por defecto 0)
 * @returns {string} Representación textual del número con formato
 */
export function formatNumber(number, maxDecimals = 0) {
    // Utiliza el método toLocaleString para aplicar formato según la configuración regional
    // del navegador del usuario (separadores de miles apropiados)
    
    // El parámetro undefined como primer argumento indica que use la configuración
    // regional predeterminada del navegador
    
    // El objeto de opciones {maximumFractionDigits} controla cuántos decimales mostrar como máximo
    // Si un número tiene menos decimales que el máximo, no se añaden ceros
    return number.toLocaleString(undefined, {maximumFractionDigits: maxDecimals});
    
    // Ejemplos con maxDecimals=2:
    // 1234.56789 → "1,234.57" (redondeado)
    // 1234 → "1,234" (sin decimales)
    // 1234.5 → "1,234.5" (un solo decimal)
}

/**
 * Trunca un texto largo a una longitud máxima añadiendo "..." al final
 * 
 * Esta función es útil para mostrar textos largos en espacios limitados de la interfaz,
 * como tooltips, tarjetas o celdas de tabla, evitando que desborden su contenedor.
 * 
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima permitida (por defecto 100 caracteres)
 * @returns {string} Texto truncado o el original si ya es más corto que el máximo
 */
export function truncateText(text, maxLength = 100) {
    // Verifica primero si el texto existe y no es vacío
    if (!text) return '';
    
    // Si el texto es más corto que la longitud máxima, lo devuelve sin cambios
    if (text.length <= maxLength) return text;
    
    // Si el texto excede la longitud máxima, lo corta y añade "..." al final
    // substring(0, maxLength) extrae desde el inicio hasta la longitud máxima
    return text.substring(0, maxLength) + '...';
}

/**
 * Genera un color hexadecimal aleatorio
 * 
 * Esta función crea un código de color hexadecimal aleatorio,
 * útil para generar paletas dinámicas en gráficos o visualizaciones
 * cuando no se tiene una paleta predefinida.
 * 
 * @returns {string} Código de color hexadecimal (formato #RRGGBB)
 */
export function getRandomColor() {
    // Math.random() genera un número aleatorio entre 0 y 1
    // toString(16) convierte un número a su representación hexadecimal
    // substring(2, 8) elimina el "0." del inicio y toma los siguientes 6 caracteres
    // padStart rellena con ceros a la izquierda si no hay suficientes dígitos
    // El símbolo # al inicio indica que es un código de color hexadecimal
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}