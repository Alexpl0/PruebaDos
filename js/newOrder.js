async function obtenerTipoCambio(moneda) {
    const url = `https://api.exchangerate.host/latest?base=${moneda}&symbols=EUR`;
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        return datos.rates.EUR;
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
        console.log("Tipo de cambio no disponible");
        return;
    }

    const euros = valor * tipoCambio;
    costoEuros.textContent = euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    console.log("Costo en Euros:", euros);
    console.log("Tipo de cambio:", tipoCambio);
    console.log("Valor ingresado:", valor);
    console.log("Moneda:", moneda);
    console.log("Costo en Euros formateado:", costoEuros.textContent);
}

document.addEventListener('DOMContentLoaded', function () {
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');

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
});