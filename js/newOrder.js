//==========================================================================================
// Función para mostrar el select de selección de compañía

async function mostrarSelect() {
    const location = `https://grammermx.com/Jesus/PruebaDos/dao/conections/daoLocation.php`;
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        console.log("Datos obtenidos de la API Location:", datos);
    } catch (error) {
        console.error('Error al obtener los datos:', error);
    }
}






//==========================================================================================
//Funcion para obtener el tipo de cambio de la API
async function obtenerTipoCambio(moneda) {
    const url = `https://api.frankfurter.dev/v1/latest?base=${moneda}&symbols=EUR`;
      
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        console.log("Datos obtenidos de la API:", datos);

        if (datos && datos.rates && typeof datos.rates.EUR === 'number') {
            return datos.rates.EUR;
        } else {
            console.error('Respuesta inesperada de la API:', datos);
            return null;
        }
    } catch (error) {
        console.error('Error al obtener el tipo de cambio:', error);
        return null;
    }
}

async function calcularEuros(moneda) {
    const quotedCostInput = document.getElementById('QuotedCost');
    const costoEuros = document.getElementById('CostoEuros');
    const valor = parseFloat(quotedCostInput.value);

    if (!quotedCostInput.value || isNaN(valor) || valor <= 0) {
        costoEuros.textContent = "Ingrese un costo válido";
        console.log("Valor no válido:", quotedCostInput.value);
        return;
    }

    const tipoCambio = await obtenerTipoCambio(moneda);
    if (!tipoCambio) {
        costoEuros.textContent = "No se pudo obtener el tipo de cambio";
        console.log("No se pudo obtener el tipo de cambio");
        return;
    }

    const euros = valor * tipoCambio;
    costoEuros.value = euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    console.log("Costo en Euros:", euros);
    console.log("Tipo de cambio:", tipoCambio);
    console.log("Valor ingresado:", valor);
    console.log("Moneda:", moneda);
    console.log("Costo en Euros formateado:", costoEuros.value);
}


//==========================================================================================
// Función para validar y enviar el formulario a la Base de Datos

function enviar(event) {
    event.preventDefault();

    // Obtener todos los campos del formulario
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'Reference', 'ReferenceNumber',
        'inputCompanyNameShip', 'inputCityShip', 'StatesShip', 'inputZipShip',
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'
    ];

    let data = {};
    let emptyFields = [];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            let value = el.value;
            // Para selects, obtener el texto si es necesario
            if (el.tagName === 'SELECT') {
                value = el.options[el.selectedIndex]?.value || '';
            }
            // Para campos de texto, quitar espacios
            if (typeof value === 'string') value = value.trim();
            data[id] = value;
            if (!value) emptyFields.push(id);
        }
    });

    // Validar campos vacíos
    if (emptyFields.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos vacíos',
            text: 'Por favor complete todos los campos: ' + emptyFields.join(', ')
        });
        return;
    }

    console.log("Datos a enviar:", data);

    // Mapear los datos al formato que espera la tabla
    data = {
        // Puedes obtener user_id y date según tu lógica de sesión o del sistema
        user_id: 1, // Cambia esto por el ID real del usuario si lo tienes
        date: new Date().toISOString().slice(0, 19).replace('T', ' '), // Formato MySQL DATETIME
        planta: document.getElementById('planta').value,
        code_planta: document.getElementById('codeplanta').value,
        transport: document.getElementById('transport').value,
        in_out_bound: document.getElementById('InOutBound').value,
        cost_euros: document.getElementById('CostoEuros').value,
        description: document.getElementById('Description').value,
        area: document.getElementById('Area').value,
        int_ext: document.getElementById('IntExt').value,
        paid_by: document.getElementById('PaidBy').value,
        category_cause: document.getElementById('CategoryCause').value,
        project_status: document.getElementById('ProjectStatus').value,
        recovery: document.getElementById('Recovery').value,
        weight: document.getElementById('Weight').value,
        measures: document.getElementById('Measures').value,
        products: document.getElementById('Products').value,
        carrier: document.getElementById('Carrier').value,
        quoted_cost: document.getElementById('QuotedCost').value,
        reference: document.getElementById('Reference').value,
        reference_number: document.getElementById('ReferenceNumber').value,
        origin_id: document.getElementById('inputCompanyNameShip').value, // O el ID real si lo tienes
        destiny_id: document.getElementById('inputCompanyNameDest').value // O el ID real si lo tienes
    };

    // Enviar el JSON al backend usando fetch
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Datos guardados',
                text: result.message
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || 'No se pudo guardar la información'
            });
        }
    })
    .catch(error => {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error en la conexión o en el servidor'
        });
        console.error('Error:', error);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');

    if(!btnMXN || !btnUSD) {
        console.log("Botones no encontrados");
        return;
    }

    if (btnMXN) {
        btnMXN.addEventListener('click', function () {
            calcularEuros('MXN');
            console.log("Botón MXN presionado");
        });
    }
    if (btnUSD) {
        btnUSD.addEventListener('click', function () {
            calcularEuros('USD');
            console.log("Botón USD presionado");
        });
    }

    const btnEnviar = document.getElementById('enviar');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', enviar);
    }
});

