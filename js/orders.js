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
                    createCards(data.data, dataLoc.data);
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

    function getWeekNumber(dateString) {
        const date = new Date(dateString);
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        const dayNum = date.getDay() || 7;
        date.setDate(date.getDate() + 4 - dayNum);
        // Get first day of year
        const yearStart = new Date(date.getFullYear(), 0, 1);
        // Calculate full weeks to nearest Thursday
        const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    };

    function createCards(orders, locations) {
        const mainCards = document.getElementById("card");
        mainCards.innerHTML = "";
        orders.forEach(order => {
            const origin = locations.find(loc => loc.id == order.origin_id) || {};
            const destiny = locations.find(loc => loc.id == order.destiny_id) || {};
            const semana = getWeekNumber(order.date);

            const card = document.createElement("div");
            card.className = "card shadow rounded mx-2 mb-4";
            card.style.maxWidth = "265px";
            card.style.maxHeight = "275px";
            if(order.project_status == "Cerrada"){
                card.style.backgroundColor= "green";}

            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Folio: ${order.id}</h5>
                    <h6 class="card-subtitle">CW: ${semana}</h6>
                    <p class="card-text">${order.description || ''}</p>
                    <p class= "card-p">Falta: Senior Manager Logistic</p>
                    <button class="card-button ver-btn" data-order-id="${order.id}">Ver21</button>
                </div>
            `;
            mainCards.appendChild(card);
        });

        // Variable global para almacenar las órdenes
        window.allOrders = orders;

        // Agrega el evento a todos los botones "Ver"
        document.querySelectorAll('.ver-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Almacenar el ID de la orden seleccionada
                const orderId = this.getAttribute('data-order-id');
                sessionStorage.setItem('selectedOrderId', orderId);
                document.getElementById('myModal').style.display = 'flex';
            });
        });
    }

    // SCRIPTS MOVIDOS DESDE HTML AL JS
    
    // Abrir el modal
    document.getElementById('openModal').onclick = function() {
        document.getElementById('myModal').style.display = 'flex';
    };
    
    // Cerrar el modal
    document.getElementById('closeModal').onclick = function() {
        document.getElementById('myModal').style.display = 'none';
    };
    
    // Cerrar al hacer clic fuera del contenido
    window.onclick = function(event) {
        var modal = document.getElementById('myModal');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    
    // Método para cargar el SVG directamente y guardarlo como PDF
    document.getElementById('savePdfBtn').onclick = async function() {
        try {
            // Mostrar Sweet Alert de carga con z-index alto
            Swal.fire({
                title: 'Generando PDF',
                html: 'Por favor espera mientras se procesa el documento...',
                timerProgressBar: true,
                didOpen: () => {
                    Swal.showLoading();
                },
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                customClass: {
                    container: 'swal-on-top' // Usaremos esta clase para el z-index
                }
            });
            
            // Obtener el ID de la orden seleccionada
            const selectedOrderId = sessionStorage.getItem('selectedOrderId');
            
            // Encontrar la orden correspondiente
            const selectedOrder = window.allOrders.find(order => order.id == selectedOrderId) || {};
            const plantaValue = selectedOrder.planta || '';
            
            // Hacer fetch del SVG como texto
            const response = await fetch('Premium_Freight.svg');
            const svgText = await response.text();
            
            // Crear un div temporal para contener el SVG
            const container = document.createElement('div');
            container.style.width = '816px';
            container.style.height = '1056px';
            container.style.position = 'absolute';
            container.style.left = '-9999px'; // Fuera de la pantalla
            container.innerHTML = svgText;
            
            // Modificar el valor del elemento RequestingPlantValue con el valor de planta
            const plantaElement = container.querySelector('#RequestingPlantValue');
            if (plantaElement) {
                plantaElement.textContent = plantaValue;
            }
            
            document.body.appendChild(container);
            
            // El resto del código sigue igual...
            // Esperar a que el SVG se renderice
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Usar html2canvas en el div que contiene el SVG
            const canvas = await html2canvas(container, {
                scale: 2,
                logging: true,
                useCORS: true,
                allowTaint: true
            });
            
            // Crear PDF con jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [816, 1056]
            });
            
            // Agregar la imagen al PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 816, 1056);
            
            // Generar un BLOB para poder crear una URL
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            
            // Guardar el PDF automáticamente (descarga)
            const fileName = 'PremiumFreight.pdf';
            pdf.save(fileName);
            
            // Limpiar
            document.body.removeChild(container);
            
            // Cerrar el SweetAlert de carga y mostrar uno de éxito con dos botones
            Swal.fire({
                icon: 'success',
                title: '¡PDF generado con éxito!',
                html: `El archivo <b>${fileName}</b> se ha descargado correctamente.`,
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Ver PDF',
                reverseButtons: true,
                customClass: {
                    container: 'swal-on-top',
                    confirmButton: 'btn btn-success',
                    cancelButton: 'btn btn-primary'
                }
            }).then((result) => {
                // Cerrar el modal independientemente de la opción seleccionada
                document.getElementById('myModal').style.display = 'none';
                
                if (!result.isConfirmed) {
                    // Si el usuario hace clic en "Ver PDF"
                    window.open(pdfUrl, '_blank');
                }
                // Limpiar la URL del objeto para evitar fugas de memoria
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
            });
            
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            
            // Mostrar error con SweetAlert
            Swal.fire({
                icon: 'error',
                title: 'Error al generar el PDF',
                text: error.message,
                confirmButtonText: 'Entendido',
                customClass: {
                    container: 'swal-on-top'
                }
            });
        }
    };

    // Cerrar modal al hacer click en la X (ya está implementado arriba, este es redundante)
    document.addEventListener('click', function(e) {
        if (e.target.id === 'closeModal') {
            document.getElementById('myModal').style.display = 'none';
        }
        // Cerrar modal si se hace click fuera del contenido
        if (e.target.id === 'myModal') {
            document.getElementById('myModal').style.display = 'none';
        }
    });
});

