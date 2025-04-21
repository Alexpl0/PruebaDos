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
        return;
    }

    const tipoCambio = await obtenerTipoCambio(moneda);
    if (!tipoCambio) {
        costoEuros.textContent = "No se pudo obtener el tipo de cambio";
        return;
    }

    const euros = valor * tipoCambio;
    costoEuros.textContent = euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

document.addEventListener('DOMContentLoaded', function () {
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');

    if (btnMXN) {
        btnMXN.addEventListener('click', function () {
            calcularEuros('MXN');
        });
    }
    if (btnUSD) {
        btnUSD.addEventListener('click', function () {
            calcularEuros('USD');
        });
    }
});