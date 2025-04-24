//==========================================================================================
// Variables globales
let euros = 0; 

//==========================================================================================
// Función para mostrar el select de selección de compañía

async function mostrarSelect() {
    const locationURL = `https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php`;
    try {
        const respuesta = await fetch(locationURL);
        const response = await respuesta.json();
        console.log("Datos obtenidos de la API Location:", response);

        // Asumiendo que tus datos están en response.data
        const locations = response.data || [];

        // Selecciona el select
        const select = document.getElementById('CompanyShip');
        if (!select) return;

        // Limpia el select
        select.innerHTML = '';

        // Agrega una opción por cada compañía
        locations.forEach(company => {
            const option = document.createElement('option');
            option.value = company.company_name;
            option.textContent = company.company_name; // Cambia por el campo correcto si es necesario
            select.appendChild(option);

            console.log(company.company_name)
        });

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

    euros = valor * tipoCambio;
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

    // Lista de campos del formulario
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'Reference', 'ReferenceNumber',
        'inputCompanyNameShip', 'inputCityShip', 'StatesShip', 'inputZipShip',
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'
    ];

    // Si quieres enviar el texto visible de estos selects:
    const camposTexto = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
        'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier'
    ];

    let data = {};
    let emptyFields = [];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            let value = el.value;
            if (el.tagName === 'SELECT' && camposTexto.includes(id)) {
                value = el.options[el.selectedIndex]?.text || '';
            }
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
    //==========================================================================================
    // Validar Rango respecto del valor en euros
    const quotedCost = parseFloat(data['QuotedCost']); // Asegúrate de que este campo sea un número
    const costoEuros = parseFloat(data['CostoEuros'].replace(/[^0-9.-]+/g, "")); // Eliminar caracteres no numéricos
    const range = 0;
    if (quotedCost <= 1500 || costoEuros <= 1500) {
        range = 1;
        return;
    } else if ( (1500 > quotedCost || 1500 > costoEuros) && (quotedCost <= 5000 || costoEuros <= 5000) ) {
        range = 2;
        return;
    } else if ( (5000 > quotedCost || 5000 > costoEuros) && (quotedCost <= 10000 || costoEuros <= 10000) ) {
        range = 3;
        return;
    } else if ((10000 > quotedCost || 10000 > costoEuros)) {
        range = 4;
    }

    //==========================================================================================
    // Mapear los datos al formato que espera la tabla
    data = {
        user_id: 1, // Cambia esto por el ID real del usuario si lo tienes
        date: new Date().toISOString().slice(0, 19).replace('T', ' '), // Formato MySQL DATETIME
        planta: data['planta'],
        code_planta: data['codeplanta'],
        transport: data['transport'],
        in_out_bound: data['InOutBound'],
        cost_euros: data['CostoEuros'],
        description: data['Description'],
        area: data['Area'],
        int_ext: data['IntExt'],
        paid_by: data['PaidBy'],
        category_cause: data['CategoryCause'],
        project_status: data['ProjectStatus'],
        recovery: data['Recovery'],
        weight: data['Weight'],
        measures: data['Measures'],
        products: data['Products'],
        carrier: data['Carrier'],
        quoted_cost: data['QuotedCost'],
        reference: data['Reference'],
        reference_number: data['ReferenceNumber'],
        origin_id: 1, 
        destiny_id: 1, 
        status_id: 1, // Comienza en 1 porque es el nuevo
        required_auth_level: range // aplica el valor de range en base a la validación

    };

    console.log("Datos a enviar:", JSON.stringify(data));

    //==========================================================================================
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


//==========================================================================================
// Función para inicializar el evento de clic en los botones de moneda 
document.addEventListener('DOMContentLoaded', function () {
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');
    mostrarSelect();

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


    //==========================================================================================
    // Inicializar el evento de clic en el botón de enviar
    const btnEnviar = document.getElementById('enviar');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', enviar);
    }
});

