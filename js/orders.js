document.addEventListener('DOMContentLoaded', function () {
    function rellenarTablaOrdenes(orders, locations) {
        const tbody = document.getElementById("tbodyOrders");
        tbody.innerHTML = "";
        orders.forEach(order => {
            const origin = locations.find(loc => loc.id == order.origin_id) || {};
            const destiny = locations.find(loc => loc.id == order.destiny_id) || {};
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${order.planta || ''}</td>
                <td>${order.code_planta || ''}</td>
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
                <!-- SHIP FROM -->
                <td>${origin.company_name || ''}</td>
                <td>${origin.city || ''}</td>
                <td>${origin.state || ''}</td>
                <td>${origin.zip || ''}</td>
                <!-- DESTINATION -->
                <td>${destiny.company_name || ''}</td>
                <td>${destiny.city || ''}</td>
                <td>${destiny.state || ''}</td>
                <td>${destiny.zip || ''}</td>
                <!-- ORDER -->
                <td>${order.weight || ''}</td>
                <td>${order.measures || ''}</td>
                <td>${order.products || ''}</td>
                <!-- CARRIER -->
                <td>${order.carrier || ''}</td>
                <td>${order.quoted_cost || ''}</td>
                <td>${order.reference || ''}</td>
                <td>${order.reference_number || ''}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Llama a la función después de obtener los datos:
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFget.php')
        .then(response => response.json())
        .then(data => {
            fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php')
                .then(response => response.json())
                .then(dataLoc => {
                    rellenarTablaOrdenes(data.data, dataLoc.data);
                    //createCards(data.data, dataLoc.data);
                });
        });


    function getOrderById() {
        const orderId = document.getElementById("orderId").value;
        fetch(`https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFget.php?id=${orderId}`)
            .then(response => response.json())
            .then(data => {
                if (data.data.length > 0) {
                    rellenarTablaOrdenes(data.data, []);
                } else {
                    alert("No se encontró la orden con el ID proporcionado.");
                }
            });
    }

    function createCards(orders, locations){
        const mainCards = document.getElementById("main");
        mainCards.innerHTML = "";
        orders.forEach(order => {
            const origin = locations.find(loc => loc.id == order.origin_id) || {};
            const destiny = locations.find(loc => loc.id == order.destiny_id) || {};
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <h5 class="card-title">Folio: ${order.id}</h5>
                <h6 class="card-subtitle">${order.date}</h6>
                <p class="card-text">${order.description}</p>
                <button id="cardLink1" class="btn btn-primary">Card link</button>
                <button id="cardLink2" class="btn btn-secondary">Another link</button>
            `;
            mainCards.appendChild(card);
        });


    }



});
