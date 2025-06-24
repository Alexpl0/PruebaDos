// Lógica principal para la vista semanal de órdenes

document.addEventListener('DOMContentLoaded', async () => {
    const config = window.PF_WEEK_CONFIG;
    let filteredOrders = [];

    // Nueva función para obtener órdenes desde el endpoint
    async function fetchOrdersForApprover() {
        try {
            const response = await fetch(`${config.urls.pf}dao/conections/daoPremiumFreight.php`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status !== 'success' || !Array.isArray(data.data)) {
                throw new Error('Invalid data format received');
            }

            // Filtrar órdenes donde el siguiente aprobador es el usuario logeado
            const userAuthLevel = config.authorizationLevel;
            filteredOrders = data.data.filter(order => {
                const approvalStatus = Number(order.approval_status);
                return userAuthLevel === approvalStatus + 1;
            });

            renderOrders(filteredOrders);
        } catch (error) {
            console.error('Error fetching orders:', error.message);
        }
    }

    // Actualizar renderOrders para incluir botones y SVG dinámico
    function renderOrders(orders) {
        const list = document.getElementById('orders-list');
        list.innerHTML = '';
        if (!orders.length) {
            list.innerHTML = `<div class="col-12"><div class="alert alert-info">No orders found.</div></div>`;
            return;
        }
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'col-md-6 order-card';
            card.innerHTML = `
                <div class="order-header">
                    <span class="order-title">Order #${order.id}</span>
                    <div class="order-actions">
                        <button class="btn btn-success btn-sm btn-approve" data-id="${order.id}"><i class="fas fa-check"></i> Approve</button>
                        <button class="btn btn-danger btn-sm btn-reject" data-id="${order.id}"><i class="fas fa-times"></i> Reject</button>
                        <button class="btn btn-outline-primary btn-sm btn-download" data-id="${order.id}"><i class="fas fa-download"></i> PDF</button>
                    </div>
                </div>
                <div class="order-svg-container" id="svg-container-${order.id}">
                    <div class="loading-spinner"></div>
                </div>
            `;
            list.appendChild(card);

            // Cargar SVG dinámico
            loadAndPopulateSVG(order, `svg-container-${order.id}`);
        });
    }

    // Función para cargar SVG dinámico
    async function loadAndPopulateSVG(order, containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) throw new Error('SVG container not found');

            // Simulación de carga de SVG dinámico
            container.innerHTML = `<svg width="100%" height="200"><text x="10" y="20" font-size="16">Order #${order.id} - ${order.creator_name}</text></svg>`;
        } catch (error) {
            console.error(`Error loading SVG for order ${order.id}:`, error.message);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `<div style="text-align: center; color: #ef4444;">Error loading visualization</div>`;
            }
        }
    }

    // Acciones de botones
    document.getElementById('orders-list').addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const orderId = btn.getAttribute('data-id');
        if (btn.classList.contains('btn-approve')) {
            Swal.fire('Approve', `Order #${orderId} approved!`, 'success');
        } else if (btn.classList.contains('btn-reject')) {
            Swal.fire('Reject', `Order #${orderId} rejected!`, 'info');
        } else if (btn.classList.contains('btn-download')) {
            Swal.fire('Download', `PDF for order #${orderId} downloaded!`, 'success');
        }
    });

    // Inicializar la vista
    await fetchOrdersForApprover();
});