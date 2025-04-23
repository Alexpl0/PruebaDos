document.addEventListener('DOMContentLoaded', function () {

    //==========================================================================================
    //Para Generar y Rellenar la Tabla
    function mostrarDetalleOrden(order, origin, destiny) {
        const tbody = document.getElementById("tbodyOrders");
        tbody.innerHTML = `
            <tr><th colspan="2">Transport Information</th></tr>
            <tr><td>Transport Mode</td><td>${order.transport || ''}</td></tr>
            <tr><td>In/Out Outbound</td><td>${order.in_out_bound || ''}</td></tr>
            <tr><td>Cost in Euros (€)</td><td>${order.cost_euros || ''}</td></tr>
            <tr><td>Area of Responsibility</td><td>${order.area || ''}</td></tr>
            <tr><td>Internal/External Service</td><td>${order.int_ext || ''}</td></tr>
            <tr><td>Costs Paid By</td><td>${order.paid_by || ''}</td></tr>
            <tr><td>Category Cause</td><td>${order.category_cause || ''}</td></tr>
            <tr><td>Project Status</td><td>${order.project_status || ''}</td></tr>
            <tr><td>Recovery</td><td>${order.recovery || ''}</td></tr>
            <tr><td>Description and Root Cause</td><td>${order.description || ''}</td></tr>
    
            <tr><th colspan="2">Shipping From</th></tr>
            <tr><td>Company Name</td><td>${origin?.company_name || ''}</td></tr>
            <tr><td>City</td><td>${origin?.city || ''}</td></tr>
            <tr><td>State</td><td>${origin?.state || ''}</td></tr>
            <tr><td>ZIP</td><td>${origin?.zip || ''}</td></tr>
    
            <tr><th colspan="2">Destination</th></tr>
            <tr><td>Company Name</td><td>${destiny?.company_name || ''}</td></tr>
            <tr><td>City</td><td>${destiny?.city || ''}</td></tr>
            <tr><td>State</td><td>${destiny?.state || ''}</td></tr>
            <tr><td>ZIP</td><td>${destiny?.zip || ''}</td></tr>
            <tr><td>Weight</td><td>${order.weight || ''} LBS</td></tr>
            <tr><td>Products</td><td>${order.products || ''}</td></tr>
            <tr><td>Recovery</td><td>${order.recovery || ''}</td></tr>
    
            <tr><th colspan="2">Selected Carrier</th></tr>
            <tr><td>Carrier</td><td>${order.carrier || ''}</td></tr>
            <tr><td>Quoted Cost</td><td>${order.quoted_cost || ''}</td></tr>
            <tr><td>Reference</td><td>${order.reference || ''}</td></tr>
            <tr><td>Reference Number</td><td>${order.reference_number || ''}</td></tr>
        `;
    }
    
    // Ejemplo de uso (adaptar para tu fetch real):
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFget.php')
        .then(response => response.json())
        .then(data => {
            const order = data.data[0]; // Solo la primera orden, puedes iterar si quieres varias
            fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php')
                .then(response => response.json())
                .then(dataLoc => {
                    const locations = dataLoc.data;
                    const origin = locations.find(loc => loc.id == order.origin_id);
                    const destiny = locations.find(loc => loc.id == order.destiny_id);
                    mostrarDetalleOrden(order, origin, destiny);
                });
        })});


//==========================================================================================
//Funcion para generar y rellenar las tarjetas de las ordenes

function generarTarjetas() {
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFget.php')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("cardContainer");
            container.innerHTML = ""; // Limpiar el contenedor antes de agregar nuevas tarjetas

            data.data.forEach(order => {
                const card = document.createElement("div");
                card.className = "card";
                card.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">ID: ${order.id || ''}</h5>
                        <h6 class="card-subtitle">Fecha: ${order.date || ''}</h6>
                        <p class="card-text">${order.description || ''}</p>
                        <button class="btn btn-primary">Botón donde dice quien falta</button>
                        <button class="btn btn-secondary">Botón para ver</button>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error al generar las tarjetas:', error);
        });
}

