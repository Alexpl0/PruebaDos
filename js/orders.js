let globalOrders = [];
let globalLocations = [];
let globalOrigins = [];
let globalDestinies = [];

document.addEventListener('DOMContentLoaded', function () {
    function rellenarTablaOrdenes(orders, locations) {
        globalOrders = orders;
        globalLocations = locations;
        globalOrigins = [];
        globalDestinies = [];

        const tbody = document.getElementById("tbodyOrders");
        tbody.innerHTML = "";
        orders.forEach(order => {
            const origin = locations.find(loc => loc.id == order.origin_id) || {};
            const destiny = locations.find(loc => loc.id == order.destiny_id) || {};
            globalOrigins.push(origin);
            globalDestinies.push(destiny);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${order.transport || ''}</td>
                <td>${order.in_out_bound || ''}</td>
                <td>${order.cost_euros || ''}</td>
                <td>${order.area || ''}</td>
                <td>${order.int_ext || ''}</td>
                <td>${order.paid_by || ''}</td>
                <td>${order.category_cause || ''}</td>
                <td>${order.project_status || ''}</td>
                <td>${order.recovery || ''}</td>
                <td>${order.description || ''}</td>
                <td>${origin.company_name || ''}</td>
                <td>${origin.city || ''}</td>
                <td>${origin.state || ''}</td>
                <td>${origin.zip || ''}</td>
                <td>${destiny.company_name || ''}</td>
                <td>${destiny.city || ''}</td>
                <td>${destiny.state || ''}</td>
                <td>${destiny.zip || ''}</td>
                <td>${order.weight || ''} LBS</td>
                <td>${order.products || ''}</td>
                <td>${order.recovery || ''}</td>
                <td>${order.carrier || ''}</td>
                <td>${order.quoted_cost || ''}</td>
                <td>${order.reference || ''}</td>
                <td>${order.reference_number || ''}</td>
            `;
            tbody.appendChild(row);
        });
    }

    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFget.php')
        .then(response => response.json())
        .then(data => {
            fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php')
                .then(response => response.json())
                .then(dataLoc => {
                    rellenarTablaOrdenes(data.data, dataLoc.data);
                });
        });
});