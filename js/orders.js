document.addEventListener('DOMContentLoaded', function () {
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFget.php')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById("tbodyOrders");
            tbody.innerHTML = ""; // Limpiar la tabla antes de agregar nuevos datos

            data.data.forEach(order => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${order.planta || ''}</td>
                    <td>${order.codeplanta || ''}</td>
                    <td>${order.transport || ''}</td>
                    <td>${order.InOutBound || ''}</td>
                    <td>${order.CostoEuros || ''}</td>
                    <td>${order.Description || ''}</td>
                    <td>${order.Area || ''}</td>
                    <td>${order.IntExt || ''}</td>
                    <td>${order.PaidBy || ''}</td>
                    <td>${order.CategoryCause || ''}</td>
                    <td>${order.ProjectStatus || ''}</td>
                    <td>${order.Recovery || ''}</td>
                    <td>${order.Weight || ''}</td>
                    <td>${order.Measures || ''}</td>
                    <td>${order.Products || ''}</td>
                    <td>${order.Carrier || ''}</td>
                    <td>${order.QuotedCost || ''}</td>
                    <td>${order.Reference || ''}</td>
                    <td>${order.ReferenceNumber || ''}</td>
                    <td>${order.inputCompanyNameShip || ''}</td>
                    <td>${order.inputCityShip || ''}</td>
                    <td>${order.StatesShip || ''}</td>
                    <td>${order.inputZipShip || ''}</td>
                    <td>${order.inputCompanyNameDest || ''}</td>
                    <td>${order.inputCityDest || ''}</td>
                    <td>${order.StatesDest || ''}</td>
                    <td>${order.inputZipDest || ''}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error al cargar las órdenes:', error);
        });
});