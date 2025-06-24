// Lógica principal para la vista semanal de órdenes

document.addEventListener('DOMContentLoaded', () => {
    const config = window.PF_WEEK_CONFIG;
    let filteredOrders = [...config.orders];

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
                <div>
                    <strong>Creator:</strong> ${order.creator_name || '-'}
                </div>
                <div class="mt-2">
                    <span class="status-badge status-pending">PENDING</span>
                </div>
            `;
            list.appendChild(card);
        });
    }

    // Filtros
    document.getElementById('apply-filters').addEventListener('click', () => {
        const orderVal = document.getElementById('filter-order').value.trim();
        const creatorVal = document.getElementById('filter-creator').value.trim().toLowerCase();
        filteredOrders = config.orders.filter(order => {
            let match = true;
            if (orderVal) match = match && order.id.toString().includes(orderVal);
            if (creatorVal) match = match && (order.creator_name || '').toLowerCase().includes(creatorVal);
            return match;
        });
        renderOrders(filteredOrders);
    });

    // Acciones
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

    // Descargar todos
    document.getElementById('download-all-btn').addEventListener('click', () => {
        Swal.fire('Download', `All PDFs downloaded!`, 'success');
    });

    // Render inicial
    renderOrders(filteredOrders);
});