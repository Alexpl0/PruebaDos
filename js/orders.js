document.addEventListener('DOMContentLoaded', function () {

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
                        <td>${order.origin_id || ''}</td>
                        <td>${order.destiny_id || ''}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    `;
                    tbody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error al cargar las órdenes:', error);
            });
    }

    // Llama a la función cuando la página termine de cargar
    rellenarTabla();
});