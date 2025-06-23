/**
 * Premium Freight - Shared DataTables Utilities
 * Functions shared between TotalHistory and WeeklyHistory pages
 */

// Existing global variables
let isLoading = false;
let allOrdersData = [];
let dataCache = new Map();

/**
 * Get base URL helper function with fallback
 * @returns {string} The base URL for API calls
 */
function getBaseURL() {
    if (typeof URLPF !== 'undefined' && URLPF) {
        return URLPF;
    }
    if (typeof window !== 'undefined' && window.URLPF) {
        return window.URLPF;
    }
    return '/';
}

/**
 * Add notification styles dynamically
 */
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .swal2-popup {
            font-size: 1rem !important;
        }
        .swal2-title {
            color: var(--grammer-blue) !important;
        }
        .swal2-confirm {
            background-color: var(--grammer-blue) !important;
            color: white !important;
        }
    `;
    document.head.appendChild(style);
    console.log('[DataTables] ✅ Notification styles added');
}

/**
 * Show error message using SweetAlert2
 * @param {string} title - Title of the error message
 * @param {string} message - Detailed error message
 */
function showErrorMessage(title, message) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonColor: 'var(--grammer-blue)'
    });
    console.log(`[DataTables] ❌ Error: ${title} - ${message}`);
}

/**
 * Setup toggle filters functionality
 * @param {string} toggleButtonId - ID of the toggle button
 * @param {string} filterPanelId - ID of the filter panel
 */
function setupToggleFilters(toggleButtonId, filterPanelId) {
    const toggleButton = document.getElementById(toggleButtonId);
    const filterPanel = document.getElementById(filterPanelId);

    if (toggleButton && filterPanel) {
        toggleButton.addEventListener('click', () => {
            const isVisible = filterPanel.style.display !== 'none';
            filterPanel.style.display = isVisible ? 'none' : 'block';
            toggleButton.innerHTML = isVisible ?
                '<i class="fas fa-chevron-down"></i>' :
                '<i class="fas fa-chevron-up"></i>';
        });
        console.log('[DataTables] ✅ Toggle filters setup completed');
    } else {
        console.warn('[DataTables] ⚠️ Toggle filters elements not found');
    }
}

/**
 * Generate PDFs for all visible orders in the DataTable
 * @param {Array} ordersData - Array of orders currently visible in the DataTable
 */
async function generatePDFsForVisibleOrders(ordersData) {
    try {
        let totalOrders = ordersData.length;
        let completedOrders = 0;
        let failedOrders = [];

        Swal.fire({
            title: 'Generating PDFs',
            html: `<p>Generating <strong>0/${totalOrders}</strong></p><div id="progress-bar" style="width: 100%; height: 20px; background: var(--gray-200); border-radius: 8px;"><div id="progress-bar-fill" style="width: 0%; height: 100%; background: var(--grammer-blue); border-radius: 8px;"></div></div>`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        for (const order of ordersData) {
            const orderId = order.id;
            const customFileName = `PF_${orderId}`;
            try {
                await window.svgOrders.generatePDF(orderId, customFileName); // Use the global object
                completedOrders++;
            } catch (error) {
                console.error(`[DataTables] Error generating PDF for order ${orderId}:`, error);
                failedOrders.push(customFileName);
            }

            const progressPercentage = Math.round((completedOrders / totalOrders) * 100);
            document.getElementById('progress-bar-fill').style.width = `${progressPercentage}%`;
            Swal.getHtmlContainer().querySelector('p').innerHTML = `Generating <strong>${completedOrders}/${totalOrders}</strong>`;
        }

        Swal.close();

        if (failedOrders.length === 0) {
            Swal.fire({
                icon: 'success',
                title: 'PDF Generation Complete',
                text: `All PDFs generated successfully (${completedOrders}/${totalOrders}).`,
                confirmButtonColor: 'var(--grammer-blue)'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'PDF Generation Complete with Errors',
                html: `Generated ${completedOrders}/${totalOrders} PDFs.<br>Failed: ${failedOrders.join(', ')}`,
                confirmButtonColor: 'var(--grammer-blue)'
            });
        }
    } catch (error) {
        console.error('[DataTables] Error during PDF generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'PDF Generation Failed',
            text: 'An unexpected error occurred during PDF generation.',
            confirmButtonColor: 'var(--grammer-blue)'
        });
    }
}

/**
 * Extract all visible IDs from the DataTable
 * @param {string} tableId - ID of the DataTable
 * @returns {Array} Array of visible orders
 */
function getVisibleOrdersFromDataTable(tableId) {
    const table = $(`#${tableId}`).DataTable();
    const visibleData = table.rows({ filter: 'applied' }).data().toArray();
    return visibleData.map(row => ({
        id: row[0], // Assuming the ID is in the first column
        ...row // Include other data if needed
    }));
}

// Attach SVG button functionality
document.addEventListener('DOMContentLoaded', function () {
    const svgButton = document.querySelector('.buttons-svg');
    if (svgButton) {
        svgButton.addEventListener('click', async () => {
            const tableId = svgButton.closest('table').id; // Get the table ID dynamically
            const visibleOrders = getVisibleOrdersFromDataTable(tableId);
            await generatePDFsForVisibleOrders(visibleOrders);
        });
    }
});

console.log('[DataTables] 📊 DataTables utilities module updated successfully');