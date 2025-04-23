document.addEventListener('DOMContentLoaded', function () {

    //==========================================================================================
    //Aqui se obtienen los datos de la tabla principal de PF
    function rellenarTabla() {
        fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFget.php')
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById("tbodyOrders");
                tbody.innerHTML = ""; // Limpiar la tabla antes de agregar nuevos datos

                data.data.forEach(order => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${order.planta || ''}</td>
                        <td>${order.code_planta || ''}</td>
                        <td>${order.transport || ''}</td>
                        <td>${order.in_out_bound || ''}</td>
                        <td>${order.cost_euros || ''}</td>
                        <td>${order.description || ''}</td>
                        <td>${order.area || ''}</td>
                        <td>${order.int_ext || ''}</td>
                        <td>${order.paid_by || ''}</td>
                        <td>${order.category_cause || ''}</td>
                        <td>${order.project_status || ''}</td>
                        <td>${order.recovery || ''}</td>
                        <td>${order.weight || ''}</td>
                        <td>${order.measures || ''}</td>
                        <td>${order.products || ''}</td>
                        <td>${order.carrier || ''}</td>
                        <td>${order.quoted_cost || ''}</td>
                        <td>${order.reference || ''}</td>
                        <td>${order.reference_number || ''}</td>
                        <td></td>
                    `;
                    tbody.appendChild(row);
                });

                // Cuando llenes el nombre de la compañía:
                const rows = document.querySelectorAll("#tbodyOrders tr");
                rows.forEach(row => {
                    const originId = order.origin_id || '';
                    const origin = locations.find(location => location.id == originId);
                    row.children[19].textContent = origin ? origin.company_name || '' : '';
                });

                //==========================================================================================
                //Aqui se obtienen los datos de la tabla secundaria de PF
                fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php')
                    .then(response => response.json())
                    .then(dataLoc => {
                        const locations = dataLoc.data;
                        const rows = document.querySelectorAll("#tbodyOrders tr");

                        rows.forEach(row => {
                            const originId = row.children[19].textContent.trim();
                            const destinyId = row.children[20].textContent.trim();

                            const origin = locations.find(location => location.id == originId);
                            const destiny = locations.find(location => location.id == destinyId);

                            // Company Name Ship
                            row.children[21].textContent = origin ? origin.company_name || '' : '';
                            // City Ship
                            row.children[22].textContent = origin ? origin.city || '' : '';
                            // State Ship
                            row.children[23].textContent = origin ? origin.state || '' : '';
                            // Zip Ship
                            row.children[24].textContent = origin ? origin.zip || '' : '';
                            // Company Name Dest
                            row.children[25].textContent = destiny ? destiny.company_name || '' : '';
                            // City Dest
                            row.children[26].textContent = destiny ? destiny.city || '' : '';
                            // State Dest
                            row.children[27].textContent = destiny ? destiny.state || '' : '';
                            // Zip Dest
                            row.children[28].textContent = destiny ? destiny.zip || '' : '';
                        });
                    })
                    .catch(error => {
                        console.error('Error al cargar las ubicaciones:', error);
                    });
            })
            .catch(error => {
                console.error('Error al cargar las órdenes:', error);
            });
    }

    // Llama a la función cuando la página termine de cargar
    rellenarTabla();
});


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