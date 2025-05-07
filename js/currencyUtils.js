//==========================================================================================
// Variables globales para la gestión de moneda y costos.
let euros = 0; // Almacena el costo calculado en Euros. Se actualiza mediante la función calculateEuros.
let selectedCurrency = "MXN"; // Default currency

// Add a new function to explicitly get the current selected currency
function getSelectedCurrency() {
    return selectedCurrency;
}

//==========================================================================================
// Función para inicializar los botones selectores de moneda (MXN y USD) y el cálculo automático de Euros.
// Configura los escuchadores de eventos para los botones y el campo de costo cotizado.
function initializeCurrencySelectors() {
    // Obtiene los elementos de los botones de moneda del DOM.
    const btnMXN = document.getElementById('MXN'); // Botón para seleccionar MXN.
    const btnUSD = document.getElementById('USD'); // Botón para seleccionar USD.
    
    // Configuración para el botón MXN.
    if (btnMXN) { // Verifica si el botón MXN existe en el DOM.
        btnMXN.addEventListener('click', function () { // Agrega un escuchador para el evento 'click'.
            calculateEuros('MXN'); // Recalcula el costo en Euros usando MXN como moneda base.
            selectedCurrency = "MXN"; // Actualiza la variable global de moneda seleccionada.
            btnMXN.classList.add('moneda-activa'); // Añade la clase CSS para resaltar el botón activo.
            if (btnUSD) btnUSD.classList.remove('moneda-activa'); // Remueve la clase activa del botón USD si existe.
            console.log("MXN currency selected"); // Mensaje de depuración en inglés.
        });
        
        // Establece el estado activo inicial si MXN es la moneda por defecto.
        if (selectedCurrency === "MXN") {
             btnMXN.classList.add('moneda-activa');
        }
    } else {
        // Advierte en consola si el botón MXN no se encuentra.
        console.warn("MXN currency button not found.");
    }

    // Configuración para el botón USD.
    if (btnUSD) { // Verifica si el botón USD existe en el DOM.
        btnUSD.addEventListener('click', function () { // Agrega un escuchador para el evento 'click'.
            calculateEuros('USD'); // Recalcula el costo en Euros usando USD como moneda base.
            selectedCurrency = "USD"; // Actualiza la variable global de moneda seleccionada.
            btnUSD.classList.add('moneda-activa'); // Añade la clase CSS para resaltar el botón activo.
            if (btnMXN) btnMXN.classList.remove('moneda-activa'); // Remueve la clase activa del botón MXN si existe.
            console.log("USD currency selected"); // Mensaje de depuración en inglés.
        });
        
        // Establece el estado activo inicial si USD es la moneda por defecto (ajustar si es necesario).
        if (selectedCurrency === "USD") {
             btnUSD.classList.add('moneda-activa');
        }
    } else {
        // Advierte en consola si el botón USD no se encuentra.
        console.warn("USD currency button not found.");
    }

    // Agrega un escuchador al campo 'QuotedCost' para recalcular los Euros automáticamente cuando su valor cambie.
    const quotedCostInput = document.getElementById('QuotedCost'); // Obtiene el campo de entrada del costo cotizado.
    if (quotedCostInput) { // Verifica si el campo existe.
        quotedCostInput.addEventListener('input', function() { // Agrega un escuchador para el evento 'input'.
            // Recalcula usando la moneda actualmente seleccionada.
            calculateEuros(selectedCurrency);
        });
    }
}

//==========================================================================================
// Función asíncrona para obtener la tasa de cambio desde una API externa (Frankfurter).
// Convierte la moneda base proporcionada a EUR.
async function getExchangeRate(baseCurrency) {
    // Construye la URL de la API. Se solicita la tasa de 'baseCurrency' a 'EUR'.
    const url = `https://api.frankfurter.app/latest?from=${baseCurrency}&to=EUR`;

    try {
        // Realiza la petición fetch a la API.
        const response = await fetch(url);
        // Verifica si la respuesta de la API no fue exitosa (ej. error 4xx o 5xx).
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`); // Lanza un error si la respuesta no es OK.
        }
        // Parsea la respuesta JSON de la API.
        const data = await response.json();
        console.log("Exchange rate data obtained from API:", data); // Mensaje de depuración en inglés.

        // Verifica si la respuesta contiene las tasas y específicamente la tasa para EUR.
        if (data && data.rates && typeof data.rates.EUR === 'number') {
            return data.rates.EUR; // Devuelve la tasa de cambio a EUR.
        } else {
            // Si el formato de la respuesta no es el esperado, registra un error.
            console.error('Unexpected API response format:', data);
            return null; // Devuelve null si no se puede obtener la tasa.
        }
    } catch (error) {
        // Captura cualquier error durante la petición fetch o el procesamiento.
        console.error('Error getting exchange rate:', error);
        return null; // Devuelve null en caso de error.
    }
}

//==========================================================================================
// Función asíncrona para calcular y mostrar el costo en Euros.
// Utiliza el valor del campo 'QuotedCost' y la moneda seleccionada.
async function calculateEuros(currency) {
    // Obtiene los elementos del DOM para el costo cotizado y el costo en Euros.
    const quotedCostInput = document.getElementById('QuotedCost');
    const costEurosElement = document.getElementById('CostoEuros');

    // Verifica si los elementos necesarios existen en el DOM.
    if (!quotedCostInput || !costEurosElement) {
        console.error("Required input elements ('QuotedCost' or 'CostoEuros') not found.");
        return; // Termina la ejecución si faltan elementos.
    }

    // Obtiene y convierte el valor del costo cotizado a un número flotante.
    const value = parseFloat(quotedCostInput.value);

    // Valida si el valor ingresado es válido (no vacío, es un número y mayor que cero).
    if (!quotedCostInput.value || isNaN(value) || value <= 0) {
        costEurosElement.value = "Enter a valid cost"; // Muestra un mensaje de error en inglés en el campo de Euros.
        console.log("Invalid cost value entered:", quotedCostInput.value); // Mensaje de depuración en inglés.
        euros = 0; // Resetea la variable global de euros.
        return; // Termina la ejecución.
    }

    // Si la moneda de entrada ya es EUR, no se necesita conversión.
    if (currency === 'EUR') {
        euros = value; // Asigna el valor directamente a la variable de euros.
        // Formatea y muestra el valor en el campo de Euros.
        costEurosElement.value = euros.toLocaleString('en-US', { style: 'currency', currency: 'EUR' });
        console.log("Cost is already in Euros:", euros); // Mensaje de depuración en inglés.
        return; // Termina la ejecución.
    }

    // Obtiene la tasa de cambio para la moneda especificada.
    const exchangeRate = await getExchangeRate(currency);
    // Verifica si se pudo obtener la tasa de cambio.
    if (exchangeRate === null) { // Comprueba específicamente si es null.
        costEurosElement.value = "Could not get exchange rate"; // Muestra un mensaje de error en inglés.
        console.log("Failed to retrieve exchange rate."); // Mensaje de depuración en inglés.
        euros = 0; // Resetea la variable global de euros.
        return; // Termina la ejecución.
    }

    // Calcula el costo en Euros multiplicando el valor por la tasa de cambio.
    euros = value * exchangeRate;
    // Formatea y muestra el costo calculado en el campo de Euros.
    costEurosElement.value = euros.toLocaleString('en-US', { style: 'currency', currency: 'EUR' });
    // Mensajes de depuración en inglés.
    console.log("Calculated Cost in Euros:", euros);
    console.log("Exchange rate used:", exchangeRate);
}