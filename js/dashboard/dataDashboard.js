/**
 * MÓDULO DE GESTIÓN DE DATOS DEL DASHBOARD
 * 
 * Este módulo implementa todas las funcionalidades relacionadas con la obtención,
 * procesamiento y filtrado de datos para el dashboard de monitoreo de envíos premium.
 * 
 * Actúa como capa intermedia entre la fuente de datos (API) y las visualizaciones,
 * proporcionando métodos para cargar datos, aplicar filtros y acceder a los conjuntos
 * de datos originales y filtrados.
 */

// Importación de la URL de la API desde el módulo de configuración
// Esta constante contiene la dirección del endpoint que proporciona los datos
import { API_URL } from './configDashboard.js';

// Importación de funciones de utilidad para la interfaz de usuario:
// - showLoading: Muestra/oculta un indicador visual de carga
// - showErrorMessage: Muestra mensajes de error en la interfaz
import { showLoading, showErrorMessage } from './utilsDashboard.js';

// Variables para almacenar los datos en memoria durante la ejecución de la aplicación
// Estas variables son privadas al módulo (no exportadas) pero accesibles a través de getters

// Almacena el conjunto completo de datos tal como se recibe de la API
// Estos datos permanecen sin modificar y sirven como fuente para aplicar filtros
let premiumFreightData = [];

// Almacena el subconjunto de datos que ha pasado los filtros actuales
// Esta colección es la que se utiliza para generar todas las visualizaciones
let filteredData = [];

/**
 * Carga los datos del premium freight desde la API
 * 
 * Esta función asíncrona realiza una petición HTTP a la API configurada,
 * procesa la respuesta y almacena los datos recibidos en memoria.
 * También maneja la visualización de indicadores de carga y mensajes de error.
 * 
 * @returns {Promise} Promesa que se resuelve con los datos cargados o se rechaza con un error
 */
export async function loadDashboardData() {
    try {
        // PASO 1: PREPARACIÓN PARA LA CARGA
        // Mostrar indicador visual de carga para informar al usuario que se están obteniendo datos
        // El parámetro true indica que debe mostrarse el indicador
        showLoading(true);
        
        // PASO 2: PETICIÓN A LA API
        // Registro en consola para seguimiento y depuración
        // console.log("Fetching data from API...");
        
        // Realiza la petición HTTP utilizando la API Fetch de JavaScript
        // await espera a que la petición se complete antes de continuar
        const response = await fetch(API_URL);
        
        // PASO 3: VALIDACIÓN DE LA RESPUESTA HTTP
        // Verifica si la petición fue exitosa (código 200-299)
        // Si no es exitosa, lanza un error con el código de estado HTTP
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // PASO 4: PROCESAMIENTO DE LA RESPUESTA
        // Convierte la respuesta de formato JSON a un objeto JavaScript
        // await espera a que se complete la conversión antes de continuar
        const result = await response.json();
        
        // Registro en consola del resultado obtenido para depuración
        // console.log("Data received:", result);
        
        // PASO 5: VALIDACIÓN DE LA ESTRUCTURA DE DATOS
        // Verifica que la respuesta tenga el formato esperado:
        // - Debe tener un campo 'status' con valor 'success'
        // - Debe tener un campo 'data' que sea un array
        if (result.status === 'success' && Array.isArray(result.data)) {
            // PASO 6: ALMACENAMIENTO DE DATOS
            // Guarda los datos recibidos en la variable global
            premiumFreightData = result.data;
            
            // Registro en consola de la cantidad de registros recibidos
            // console.log(`Loaded ${premiumFreightData.length} records`);
            
            // PASO 7: FINALIZACIÓN DE LA CARGA
            // Oculta el indicador de carga ya que los datos se han cargado exitosamente
            showLoading(false);
            
            // Devuelve los datos cargados (para posible uso por el llamador)
            return premiumFreightData;
        } else {
            // PASO 8: MANEJO DE FORMATO INVÁLIDO
            // Si los datos no tienen la estructura esperada, registra el error
            console.error("Invalid data format:", result);
            
            // Lanza un error descriptivo incluyendo los datos recibidos
            // JSON.stringify convierte el objeto a texto para mostrarlo
            throw new Error('Invalid data format: ' + JSON.stringify(result));
        }
    } catch (error) {
        // PASO 9: MANEJO DE ERRORES
        // Captura cualquier error que haya ocurrido durante el proceso
        
        // Registra el error en la consola para depuración
        console.error('Error loading data:', error);
        
        // Muestra un mensaje de error al usuario en la interfaz
        showErrorMessage(`Error loading data: ${error.message}`);
        
        // Oculta el indicador de carga en caso de error
        showLoading(false);
        
        // Propaga el error para que pueda ser manejado por el llamador si es necesario
        throw error;
    }
}

/**
 * Aplica filtros a los datos originales
 * 
 * Esta función filtra el conjunto completo de datos según los criterios especificados
 * (rango de fechas, planta, estado) y almacena el resultado en la variable filteredData.
 * 
 * @param {Object} filters - Objeto con los filtros a aplicar
 * @param {string} filters.startDate - Fecha de inicio en formato YYYY-MM-DD
 * @param {string} filters.endDate - Fecha de fin en formato YYYY-MM-DD
 * @param {string} filters.planta - Nombre de la planta (opcional)
 * @param {string} filters.status - Estado del envío (opcional)
 * @returns {Array} - Conjunto de datos filtrados
 */
export function applyFilters(filters) {
    // PASO 1: EXTRACCIÓN DE PARÁMETROS DE FILTRADO
    // Desestructura el objeto filters para obtener cada criterio individualmente
    const { startDate, endDate, planta, status } = filters;
    
    // PASO 2: REGISTRO DE FILTROS APLICADOS
    // Registra en consola los filtros que se van a aplicar (para depuración)
    // console.log("Applying filters:", { 
    //     dateRange: `${startDate} to ${endDate}`, 
    //     planta, status 
    // });
    
    // PASO 3: APLICACIÓN DE FILTROS
    // Filtra el array de datos originales aplicando todos los criterios simultáneamente
    // El método filter() crea un nuevo array con los elementos que pasan la condición
    filteredData = premiumFreightData.filter(item => {
        // PASO 3.1: FILTRO DE FECHAS
        // Extrae solo la parte de fecha (YYYY-MM-DD) ignorando la hora
        // substring(0, 10) obtiene los primeros 10 caracteres de la fecha completa
        const itemDate = item.date ? item.date.substring(0, 10) : null;
        
        // Un registro pasa el filtro de fechas si:
        // - No tiene fecha (itemDate es null) O
        // - Su fecha está dentro del rango especificado (inclusivo)
        const dateMatch = !itemDate || (itemDate >= startDate && itemDate <= endDate);
        
        // PASO 3.2: FILTRO DE PLANTA
        // Un registro pasa el filtro de planta si:
        // - No se ha especificado una planta para filtrar (!planta es verdadero) O
        // - Su planta coincide exactamente con la planta especificada
        const plantaMatch = !planta || item.planta === planta;
        
        // PASO 3.3: FILTRO DE ESTADO (STATUS)
        // Un registro pasa el filtro de estado si:
        // - No se ha especificado un estado para filtrar (!status es verdadero) O
        // - Su estado coincide exactamente con el estado especificado
        const statusMatch = !status || item.status_name === status;
        
        // PASO 3.4: COMBINACIÓN DE TODOS LOS FILTROS
        // Un registro solo se incluye en el resultado si pasa TODOS los filtros
        // (operador lógico AND - &&)
        return dateMatch && plantaMatch && statusMatch;
    });
    
    // PASO 4: REGISTRO DEL RESULTADO
    // Registra en consola cuántos registros pasaron los filtros (para depuración)
    // console.log("Records after filtering:", filteredData.length);
    
    // PASO 5: RETORNO DEL RESULTADO
    // Devuelve el conjunto de datos filtrados (aunque también está disponible
    // a través de getFilteredData())
    return filteredData;
}

/**
 * Obtiene el conjunto de datos filtrados actual
 * 
 * Esta función proporciona acceso a los datos que han pasado por los filtros activos.
 * Es utilizada por los módulos de visualización para obtener los datos que deben mostrar.
 * 
 * @returns {Array} Conjunto de datos filtrados
 */
export function getFilteredData() {
    // Simplemente devuelve la referencia a la variable filteredData
    // Estos son los datos que han pasado todos los filtros activos
    return filteredData;
}

/**
 * Obtiene el conjunto completo de datos originales
 * 
 * Esta función proporciona acceso a los datos tal como se recibieron de la API,
 * sin ningún filtro aplicado. Puede ser útil para operaciones que necesiten
 * considerar todos los datos, como la inicialización de filtros con valores únicos.
 * 
 * @returns {Array} Conjunto completo de datos sin filtrar
 */
export function getRawData() {
    // Simplemente devuelve la referencia a la variable premiumFreightData
    // Estos son los datos originales sin modificar
    return premiumFreightData;
}